const express = require("express");
const router = express.Router();
const checkAuth = require("../middlewares/CheckAuth");
const { UserDetails } = require("../model/UserDetails");
const Order = require("../model/Order");
const Slot = require("../model/Slot");
const Assessment = require("../model/Assessment");
const Notification = require("../model/Notification");

/**
 * GET /api/admin/assessments
 * Fetches all available timed psych assessment configurations from the assessments collection.
 */
router.get("/admin/assessments", checkAuth, async (req, res) => {
    try {
        const assessments = await Assessment.find().sort({ title: 1 });
        res.status(200).json({ status: "ok", assessments });
    } catch (error) {
        console.error("GET /api/admin/assessments error:", error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/admin/students
 * Fetches all enrolled student accounts with search, filter, and assessor populations.
 */
router.get("/admin/students", checkAuth, async (req, res) => {
    try {
        const { search, clinicalStage } = req.query;

        // Step 1: Get all userIds that have at least one paid order
        const paidUserIds = await Order.distinct("userId", { status: "paid" });

        // Also include manually created students
        const manualStudentIds = await UserDetails.distinct("_id", {
            role: "student",
            isManuallyCreated: true
        });

        const allEnrolledIds = [...new Set([
            ...paidUserIds.map(id => id.toString()),
            ...manualStudentIds.map(id => id.toString())
        ])];

        // Query all enrolled student trainees
        const query = {
            _id: { $in: allEnrolledIds },
            role: { $nin: ["assessor", "admin", "franchise"] }
        };

        if (search) {
            const regex = new RegExp(search.trim(), "i");
            query.$and = [
                {
                    $or: [
                        { name: regex },
                        { email: regex },
                        { phone: regex }
                    ]
                }
            ];
        }

        if (clinicalStage && clinicalStage !== "all") {
            query.clinicalStage = clinicalStage;
        }

        const students = await UserDetails.find(query)
            .populate("assignedGTO", "name email phone")
            .populate("assignedTO", "name email phone")
            .populate("assignedPsych", "name email phone")
            .populate("assignedIO", "name email phone")
            .sort({ createdAt: -1 });

        // Proactively synchronize batch numbers and role settings for any students whose profiles have empty fields
        const studentsWithBatch = await Promise.all(students.map(async (student) => {
            let modified = false;
            
            if (student.role !== "student") {
                student.role = "student";
                modified = true;
            }

            if (!student.batch) {
                const latestOrder = await Order.findOne({ userId: student._id, status: "paid" })
                    .populate("slotId")
                    .sort({ createdAt: -1 });
                
                if (latestOrder && latestOrder.slotId && latestOrder.slotId.batchNo) {
                    student.batch = latestOrder.slotId.batchNo.trim();
                    modified = true;
                }
            }

            if (modified) {
                await student.save();
            }

            return student;
        }));

        res.status(200).json({ status: "ok", students: studentsWithBatch });
    } catch (error) {
        console.error("GET /admin/students error:", error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/admin/allotment-students
 * Fetches ONLY enrolled (paid) student accounts with server-side pagination,
 * search, and filter support. Used exclusively by the Allotment page.
 */
router.get("/admin/allotment-students", checkAuth, async (req, res) => {
    try {
        const { page = 1, limit = 25, search, clinicalStage, batch } = req.query;

        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
        const skip = (pageNum - 1) * limitNum;

        // Step 1: Get all userIds that have at least one paid order
        const paidUserIds = await Order.distinct("userId", { status: "paid" });

        // Also include manually created students (they don't have orders but are valid candidates)
        const manualStudentIds = await UserDetails.distinct("_id", {
            role: "student",
            isManuallyCreated: true
        });

        // Combine both sets of IDs
        const allEnrolledIds = [...new Set([
            ...paidUserIds.map(id => id.toString()),
            ...manualStudentIds.map(id => id.toString())
        ])];

        // Step 2: Build query for only enrolled students
        const query = {
            _id: { $in: allEnrolledIds },
            role: { $nin: ["assessor", "admin", "franchise"] }
        };

        if (search) {
            const regex = new RegExp(search.trim(), "i");
            query.$and = [
                {
                    $or: [
                        { name: regex },
                        { email: regex },
                        { phone: regex },
                        { chestNo: regex }
                    ]
                }
            ];
        }

        if (clinicalStage && clinicalStage !== "all") {
            query.clinicalStage = clinicalStage;
        }

        if (batch && batch !== "all") {
            query.batch = batch;
        }

        // Step 3: Get total count for pagination metadata
        const totalCount = await UserDetails.countDocuments(query);
        const totalPages = Math.ceil(totalCount / limitNum);

        // Step 4: Fetch paginated results with assessor populations
        const students = await UserDetails.find(query)
            .populate("assignedGTO", "name email phone")
            .populate("assignedTO", "name email phone")
            .populate("assignedPsych", "name email phone")
            .populate("assignedIO", "name email phone")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum);

        // Step 5: Get all distinct batches for the filter dropdown (from enrolled students only)
        const allBatches = await UserDetails.distinct("batch", {
            _id: { $in: allEnrolledIds },
            role: { $nin: ["assessor", "admin", "franchise"] },
            batch: { $ne: "" }
        });

        res.status(200).json({
            status: "ok",
            students,
            totalCount,
            page: pageNum,
            totalPages,
            batches: allBatches.sort()
        });
    } catch (error) {
        console.error("GET /admin/allotment-students error:", error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/admin/students/:id
 * Fetches detail of a student, populated with their paid registration course order history.
 */
router.get("/admin/students/:id", checkAuth, async (req, res) => {
    try {
        const { id } = req.params;

        const student = await UserDetails.findById(id)
            .populate("assignedGTO", "name email phone")
            .populate("assignedTO", "name email phone")
            .populate("assignedPsych", "name email phone")
            .populate("assignedIO", "name email phone");

        if (!student) {
            return res.status(404).json({ error: "Student not found" });
        }

        if (student.role !== "student") {
            student.role = "student";
            await student.save();
        }

        // Proactively synchronize batch number if empty
        if (!student.batch) {
            const latestOrder = await Order.findOne({ userId: id, status: "paid" })
                .populate("slotId")
                .sort({ createdAt: -1 });
            
            if (latestOrder && latestOrder.slotId && latestOrder.slotId.batchNo) {
                student.batch = latestOrder.slotId.batchNo.trim();
                await student.save();
            }
        }

        // Query course enrollment list
        const orders = await Order.find({ userId: id, status: "paid" })
            .populate("slotId")
            .sort({ createdAt: -1 });

        res.status(200).json({ status: "ok", student, orders });
    } catch (error) {
        console.error("GET /admin/students/:id error:", error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * PUT /api/admin/students/:id/stage
 * Updates clinical assessment stage for a student.
 */
router.post("/admin/students/:id/stage", checkAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { clinicalStage } = req.body;

        const allowedStages = ["full_course", "ssb_ppdt", "psych", "interview", "group_testing"];
        const stages = (clinicalStage || "").split(",").map(s => s.trim()).filter(Boolean);
        const allValid = stages.every(s => allowedStages.includes(s));
        if (stages.length === 0 || !allValid) {
            return res.status(400).json({ error: "Invalid course(s) specified" });
        }

        const student = await UserDetails.findById(id);

        if (!student) {
            return res.status(404).json({ error: "Student not found" });
        }

        student.clinicalStage = clinicalStage;
        if (student.role !== "student") {
            student.role = "student";
        }
        await student.save();

        res.status(200).json({ status: "ok", message: "Clinical stage updated successfully", student });
    } catch (error) {
        console.error("PUT /admin/students/:id/stage error:", error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/admin/assessors
 * Fetches all assessor accounts along with their active load calculation (assigned count).
 */
router.get("/admin/assessors", checkAuth, async (req, res) => {
    try {
        const assessors = await UserDetails.find({ role: "assessor" })
            .select("-password")
            .lean();

        // Calculate load for each assessor
        const resultList = await Promise.all(assessors.map(async (assessor) => {
            const activeLoad = await UserDetails.countDocuments({
                $or: [
                    { assignedGTO: assessor._id },
                    { assignedTO: assessor._id },
                    { assignedPsych: assessor._id },
                    { assignedIO: assessor._id }
                ]
            });

            return {
                ...assessor,
                activeLoad
            };
        }));

        res.status(200).json({ status: "ok", assessors: resultList });
    } catch (error) {
        console.error("GET /admin/assessors error:", error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * PUT /api/admin/allotment/:id
 * Sets or updates GTO, TO, Psych, and IO assessor allotments for a specific student.
 */
router.put("/admin/allotment/:id", checkAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { assignedGTO, assignedTO, assignedPsych, assignedIO } = req.body;

        if (assignedTO && assignedPsych) {
            return res.status(400).json({ error: "A candidate cannot be assigned to both a Psych Assessor and a Technical Assessor simultaneously." });
        }

        const updateData = {};
        if (assignedGTO !== undefined) updateData.assignedGTO = assignedGTO || null;
        if (assignedTO !== undefined) updateData.assignedTO = assignedTO || null;
        if (assignedPsych !== undefined) updateData.assignedPsych = assignedPsych || null;
        if (assignedIO !== undefined) updateData.assignedIO = assignedIO || null;

        const student = await UserDetails.findById(id);

        if (!student) {
            return res.status(404).json({ error: "Student not found" });
        }

        const oldGTO = student.assignedGTO ? student.assignedGTO.toString() : null;
        const oldTO = student.assignedTO ? student.assignedTO.toString() : null;
        const oldPsych = student.assignedPsych ? student.assignedPsych.toString() : null;
        const oldIO = student.assignedIO ? student.assignedIO.toString() : null;

        if (assignedGTO !== undefined) student.assignedGTO = assignedGTO || null;
        if (assignedTO !== undefined) student.assignedTO = assignedTO || null;
        if (assignedPsych !== undefined) student.assignedPsych = assignedPsych || null;
        if (assignedIO !== undefined) student.assignedIO = assignedIO || null;

        if (student.role !== "student") {
            student.role = "student";
        }
        await student.save();

        const notifications = [];
        const createNotif = (assessorId, role) => {
            if (assessorId) {
                notifications.push({
                    recipientId: assessorId,
                    studentId: student._id,
                    title: "New Candidate Allotted",
                    message: `You have been allotted as ${role} for candidate ${student.name}.`,
                    type: "ALLOTMENT"
                });
            }
        };

        if (assignedGTO !== undefined && assignedGTO !== oldGTO) createNotif(assignedGTO, "GTO");
        if (assignedTO !== undefined && assignedTO !== oldTO) createNotif(assignedTO, "TO");
        if (assignedPsych !== undefined && assignedPsych !== oldPsych) createNotif(assignedPsych, "Psychologist");
        if (assignedIO !== undefined && assignedIO !== oldIO) createNotif(assignedIO, "Interviewing Officer");

        if (notifications.length > 0) {
            await Notification.insertMany(notifications);
        }

        res.status(200).json({ status: "ok", message: "Assessor allotment configured successfully", student });
    } catch (error) {
        console.error("PUT /admin/allotment/:id error:", error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/admin/students
 * Manually creates a new student account in the database.
 */
router.post("/admin/students", checkAuth, async (req, res) => {
    try {
        const { name, email, phone, password, batch, clinicalStage, chestNo } = req.body;

        if (!name || !email || !phone || !password) {
            return res.status(400).json({ error: "Name, email, phone, and password are required" });
        }

        const emailLower = email.toLowerCase().trim();

        // Check if user already exists
        const existingUser = await UserDetails.findOne({
            $or: [{ email: emailLower }, { phone: phone.trim() }]
        });

        if (existingUser) {
            return res.status(400).json({ error: "User already exists with this email or phone number" });
        }

        const newUser = new UserDetails({
            name: name.trim(),
            email: emailLower,
            phone: phone.trim(),
            password, // Plain text is hashed by mongoose schema pre-save hook
            batch: (batch || "").trim(),
            chestNo: (chestNo || "").trim(),
            clinicalStage: clinicalStage || "full_course",
            role: "student",
            isManuallyCreated: true
        });

        await newUser.save();

        res.status(201).json({ status: "ok", message: "Student created successfully in the database", student: newUser });
    } catch (error) {
        console.error("POST /api/admin/students error:", error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * PUT /api/admin/students/:id
 * Updates name, email, phone, batch, and stage for a specific student.
 */
router.put("/admin/students/:id", checkAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, phone, batch, clinicalStage, chestNo, assignedAssessments } = req.body;

        const updateData = {};
        if (name) updateData.name = name.trim();
        if (email) updateData.email = email.toLowerCase().trim();
        if (phone) updateData.phone = phone.trim();
        if (batch !== undefined) updateData.batch = (batch || "").trim();
        if (chestNo !== undefined) updateData.chestNo = (chestNo || "").trim();
        if (clinicalStage) updateData.clinicalStage = clinicalStage;
        if (assignedAssessments !== undefined) updateData.assignedAssessments = assignedAssessments;

        const student = await UserDetails.findById(id);

        if (!student) {
            return res.status(404).json({ error: "Student not found" });
        }

        if (name) student.name = name.trim();
        if (email) student.email = email.toLowerCase().trim();
        if (phone) student.phone = phone.trim();
        if (batch !== undefined) student.batch = (batch || "").trim();
        if (chestNo !== undefined) student.chestNo = (chestNo || "").trim();
        if (clinicalStage) student.clinicalStage = clinicalStage;
        if (assignedAssessments !== undefined) student.assignedAssessments = assignedAssessments;

        if (student.role !== "student") {
            student.role = "student";
        }
        await student.save();

        res.status(200).json({ status: "ok", message: "Student credentials updated successfully", student });
    } catch (error) {
        console.error("PUT /api/admin/students/:id error:", error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * PUT /api/admin/orders/:id/batch
 * Updates the batchNo of the slot linked to this order transaction.
 */
router.put("/admin/orders/:id/batch", checkAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { batchNo } = req.body;

        if (batchNo === undefined) {
            return res.status(400).json({ error: "Batch number is required" });
        }

        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ error: "Order transaction not found" });
        }

        if (!order.slotId) {
            return res.status(400).json({ error: "No slot linked to this transaction" });
        }

        await Slot.findByIdAndUpdate(order.slotId, { batchNo: (batchNo || "").trim() });

        // Synchronize candidate's active profile batch in UserDetails
        if (order.userId) {
            await UserDetails.findByIdAndUpdate(order.userId, { batch: (batchNo || "").trim() });
        }

        res.status(200).json({ status: "ok", message: "Order batch details updated successfully" });
    } catch (error) {
        console.error("PUT /api/admin/orders/:id/batch error:", error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
