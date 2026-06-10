const Order = require("../model/Order");
const { UserDetails } = require("../model/UserDetails");

const syncPaidUserRoles = async () => {
    try {
        console.log("🔄 Initializing paid user roles and stage synchronization...");

        // 1. Get all paid order user IDs and manual student IDs
        const paidUserIds = await Order.distinct("userId", { status: "paid" });
        const manualStudentIds = await UserDetails.distinct("_id", {
            role: "student",
            isManuallyCreated: true
        });

        // Combine into a Set of strings for fast lookup
        const paidAndManualSet = new Set([
            ...paidUserIds.map(id => id.toString()),
            ...manualStudentIds.map(id => id.toString())
        ]);

        console.log(`🔍 Found ${paidUserIds.length} unique paid user IDs and ${manualStudentIds.length} manually created students.`);

        // 2. Fetch all users from the users (UserDetails) collection
        const allUsers = await UserDetails.find({});
        let studentCount = 0;
        let leadCount = 0;
        let updatedCount = 0;

        for (const user of allUsers) {
            // Skip admins, assessors, and franchises
            if (["admin", "assessor", "franchise"].includes(user.role)) {
                continue;
            }

            const userIdStr = user._id.toString();
            let userModified = false;

            if (paidAndManualSet.has(userIdStr)) {
                // Paid or manually created -> Must be a student candidate
                if (user.role !== "student") {
                    user.role = "student";
                    userModified = true;
                }
                
                // Sync clinicalStage based on their paid order(s)
                if (!user.clinicalStage) {
                    const latestOrder = await Order.findOne({ userId: user._id, status: "paid" }).sort({ createdAt: -1 });
                    if (latestOrder) {
                        const bookedModules = latestOrder.selectedModules || [];
                        if (bookedModules.length === 1 && bookedModules[0] !== 'full_course') {
                            user.clinicalStage = bookedModules[0];
                        } else {
                            user.clinicalStage = 'full_course';
                        }
                        userModified = true;
                    }
                }
                studentCount++;
            } else {
                // Unpaid user -> Must be a lead
                if (user.role !== "lead") {
                    user.role = "lead";
                    // Reset clinicalStage and batch since they haven't paid or been assigned batch
                    user.clinicalStage = null;
                    user.batch = "";
                    userModified = true;
                }
                leadCount++;
            }

            if (userModified) {
                await user.save();
                updatedCount++;
            }
        }

        console.log(`✅ Synchronization complete. Total Students (Paid): ${studentCount}, Total Leads (Unpaid): ${leadCount}. Total users updated: ${updatedCount}`);
    } catch (error) {
        console.error("❌ Error running paid user roles synchronization:", error.message);
    }
};

module.exports = syncPaidUserRoles;
