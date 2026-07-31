// routes/orderRoutes.js - UPDATED VERSION

const express = require("express");
const router = express.Router();
const crypto = require("crypto");

const razorpay = require("../config/razorpay");
const Order = require("../model/Order");
const Coupon = require("../model/Coupon");
const Slot = require("../model/Slot");
const checkAuth = require("../middlewares/CheckAuth");
const Course = require("../model/Course");
const { UserDetails } = require("../model/UserDetails");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const axios = require("axios");

// Helper function to calculate GST (18%)
const calculateGST = (amount) => {
    return amount * 0.18;
};

// ✅ CREATE ORDER (UPDATED)
// routes/orderRoutes.js

router.post("/createOrder", checkAuth, async (req, res) => {
    try {
        const {
            slotId,          // 🔥 CHANGE
            amount,
            referralCode,
            couponCode,
            selectedModules
        } = req.body;

        const userId = req.user.id;

        // ✅ check slot exists
        const slot = await Slot.findById(slotId);
        if (!slot) {
            return res.status(404).json({ message: "Slot not found" });
        }

        // ✅ check if booking is closed (cutoff is 11:59:59 PM the day before)
        if (slot.startTime) {
            const startDate = new Date(slot.startTime);
            const cutoffDate = new Date(startDate);
            cutoffDate.setDate(cutoffDate.getDate() - 1);
            cutoffDate.setHours(23, 59, 59, 999);
            
            if (new Date() > cutoffDate) {
                return res.status(400).json({ message: "Booking for this batch is closed." });
            }
        }

        // ✅ Dynamic Global Pricing Verification
        const courses = await Course.find({
            courseId: { $in: ['ssb_ppdt', 'psych', 'interview', 'group_testing', 'full_course'] }
        });

        const courseMap = {};
        courses.forEach(c => {
            courseMap[c.courseId] = c.price;
        });

        // Robust offline-safe baseline defaults
        const defaults = {
            ssb_ppdt: 1999,
            psych: 3499,
            interview: 2499,
            group_testing: 7999,
            full_course: 12499
        };

        const getPrice = (id) => courseMap[id] !== undefined ? courseMap[id] : defaults[id];

        let calculatedBaseAmount = 0;
        const modules = selectedModules || [];

        if (slot.isFullCourse) {
            // Full Course slots dynamically bind to the global Full Bundle Course price
            calculatedBaseAmount = getPrice('full_course');
        } else {
            if (modules.length === 0) {
                calculatedBaseAmount = slot.price || getPrice('full_course');
            } else if (modules.includes('full_course')) {
                calculatedBaseAmount = getPrice('full_course');
            } else {
                // If all 4 individual modules are selected, apply full course price
                const individualSelectedCount = modules.filter(id => id !== 'full_course').length;
                if (individualSelectedCount === 4) {
                    calculatedBaseAmount = getPrice('full_course');
                } else {
                    let sum = 0;
                    modules.forEach(id => {
                        if (id !== 'full_course') {
                            sum += getPrice(id);
                        }
                    });
                    calculatedBaseAmount = sum;
                }
            }
        }

        // ✅ GST and Discount Logic
        const baseAmount = calculatedBaseAmount;
        let discount = 0;

        // ✅ COUPON APPLY
        if (couponCode) {
            const coupon = await Coupon.findOne({
                code: couponCode.toUpperCase(),
                isActive: true,
            });

            if (!coupon) {
                return res.status(400).json({ message: "Invalid coupon" });
            }

            if (coupon.expiry && new Date(coupon.expiry) < new Date()) {
                return res.status(400).json({ message: "Coupon expired" });
            }

            const alreadyUsed = (coupon.usedBy || []).some(
                (u) => u.userId.toString() === userId
            );

            if (alreadyUsed) {
                return res.status(400).json({
                    message: "Coupon already used",
                });
            }

            if (coupon.discountType === "percent") {
                discount = (baseAmount * coupon.discountValue) / 100;
            } else {
                discount = Math.min(coupon.discountValue, baseAmount);
            }
        }

        const netAmount = Math.max(baseAmount - discount, 0);
        const gstAmount = netAmount * 0.18;
        const finalAmount = netAmount + gstAmount;
        const originalAmountWithGST = baseAmount + (baseAmount * 0.18);

        const amountInPaise = Math.round(finalAmount * 100);

        // 🔥 CREATE ORDER FIRST (IMPORTANT FOR REFERENCE)
        const order = new Order({
            userId,
            slotId,                 // 🔥 CHANGE
            price: finalAmount,
            originalAmount: originalAmountWithGST,
            discount,
            couponCode: couponCode || null,
            referralCode: referralCode || null,
            selectedModules: selectedModules || [],
            status: "pending",
            bookingMethod: referralCode ? 'franchise' : 'standard', // 🔥 Lock in booking channel
        });

        await order.save();

        // 🔥 RAZORPAY ORDER (WITH REFERENCE)
        const options = {
            amount: amountInPaise,
            currency: "INR",

            // 🔥 BEST receipt
            receipt: "slot_" + order._id,

            // 🔥 tracking
            notes: {
                orderId: order._id.toString(),
                userId: userId.toString(),
                slotId: slotId.toString(),
            }
        };

        const razorOrder = await razorpay.orders.create(options);

        order.orderId = razorOrder.id;
        await order.save();

        res.json({
            orderId: razorOrder.id,
            amount: razorOrder.amount,
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});

// ✅ VERIFY PAYMENT (unchanged, but ensure coupon marking works)
router.post("/verifyPayment", checkAuth, async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
        } = req.body;

        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expected = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body)
            .digest("hex");

        // console.log(expected)

        if (expected !== razorpay_signature) {
            return res.status(400).json({ message: "Invalid signature" });
        }

        const order = await Order.findOne({ orderId: razorpay_order_id });

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        // ✅ mark paid
        order.status = "paid";
        order.paymentId = razorpay_payment_id;
        await order.save();

        // 🔥 ADD USER TO SLOT
        const slot = await Slot.findById(order.slotId);

        if (!slot.bookedStudents.includes(order.userId)) {
            slot.bookedStudents.push(order.userId);
            await slot.save();
        }

        // Synchronize student's profile batch, role, and clinicalStage in UserDetails
        const { UserDetails } = require("../model/UserDetails");
        const updateFields = {
            role: "student"
        };
        if (slot && slot.batchNo) {
            updateFields.batch = slot.batchNo.trim();
        }
        const bookedModules = order.selectedModules || [];
        if (bookedModules.length === 1 && bookedModules[0] !== 'full_course') {
            updateFields.clinicalStage = bookedModules[0];
        } else if (bookedModules.includes('full_course') || bookedModules.length > 1 || bookedModules.length === 0) {
            updateFields.clinicalStage = 'full_course';
        }
        await UserDetails.findByIdAndUpdate(order.userId, updateFields);

        // 🔥 mark coupon used
        if (order.couponCode) {
            await Coupon.updateOne(
                { code: order.couponCode },
                {
                    $push: {
                        usedBy: {
                            userId: order.userId,
                            usedAt: new Date(),
                        },
                    },
                }
            );
        }

        res.json({ success: true });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ... rest of your routes (myOrders, allOrders) remain the same

// ✅ USER ORDER HISTORY
router.get("/myOrders", checkAuth, async (req, res) => {

    const orders = await Order.find({
        userId: req.user.id,
        status: "paid"
    })
        .populate("courseId")
        .sort({ createdAt: -1 });

    res.json(orders);
});


// ✅ ADMIN ORDER HISTORY
router.get("/allOrders", checkAuth, async (req, res) => {
    try {

        const orders = await Order.find({ status: "paid" })
            .populate("userId", "name email")
            .populate(
                "slotId",
                "title batchNo price startTime endTime maxStudents"
            )
            .sort({ createdAt: -1 });

        res.json({
            total: orders.length,
            orders,
        });

    } catch (err) {
        res.status(500).json({
            message: err.message,
        });
    }
});

router.get("/checkPurchase/:courseId", checkAuth, async (req, res) => {
    try {
        const exists = await Order.findOne({
            userId: req.user.id,
            courseId: req.params.courseId,
            status: "paid"
        });

        res.json({
            purchased: !!exists
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ✅ CREATE GUEST ORDER (No Auth Required - Fast Checkout)
router.post("/createGuestOrder", async (req, res) => {
    try {
        const {
            slotId,
            name,
            email,
            phone,
            referralCode,
            couponCode,
            selectedModules
        } = req.body;

        if (!name || !email || !phone || !slotId) {
            return res.status(400).json({ message: "Name, email, phone, and batch selection are required." });
        }

        const cleanEmail = email.toLowerCase().trim();
        const cleanPhone = phone.trim();

        // 🔍 Check if an account already exists with this Email or Phone
        const existingUser = await UserDetails.findOne({ $or: [{ email: cleanEmail }, { phone: cleanPhone }] });
        if (existingUser) {
            return res.status(400).json({ 
                message: "An account with this Email or Phone already exists! Please use the 'Existing User Login' tab above to proceed." 
            });
        }

        const slot = await Slot.findById(slotId);
        if (!slot) {
            return res.status(404).json({ message: "Selected batch not found." });
        }

        // ✅ check capacity
        if (slot.maxStudents && (slot.bookedStudents?.length || 0) >= slot.maxStudents) {
            return res.status(400).json({ message: "This batch is full. Please choose another batch." });
        }

        // ✅ check cutoff
        if (slot.startTime) {
            const startDate = new Date(slot.startTime);
            const cutoffDate = new Date(startDate);
            cutoffDate.setDate(cutoffDate.getDate() - 1);
            cutoffDate.setHours(23, 59, 59, 999);
            if (new Date() > cutoffDate) {
                return res.status(400).json({ message: "Booking for this batch is closed." });
            }
        }

        // ✅ Dynamic Global Pricing
        const courses = await Course.find({
            courseId: { $in: ['ssb_ppdt', 'psych', 'interview', 'group_testing', 'full_course'] }
        });
        const courseMap = {};
        courses.forEach(c => { courseMap[c.courseId] = c.price; });
        const defaults = {
            ssb_ppdt: 1999, psych: 3499, interview: 2499, group_testing: 7999, full_course: 12499
        };
        const getPrice = (id) => courseMap[id] !== undefined ? courseMap[id] : defaults[id];

        let calculatedBaseAmount = 0;
        const modules = selectedModules || [];

        if (slot.isFullCourse) {
            calculatedBaseAmount = getPrice('full_course');
        } else {
            if (modules.length === 0) {
                calculatedBaseAmount = slot.price || getPrice('full_course');
            } else if (modules.includes('full_course')) {
                calculatedBaseAmount = getPrice('full_course');
            } else {
                const individualSelectedCount = modules.filter(id => id !== 'full_course').length;
                if (individualSelectedCount === 4) {
                    calculatedBaseAmount = getPrice('full_course');
                } else {
                    let sum = 0;
                    modules.forEach(id => {
                        if (id !== 'full_course') {
                            sum += getPrice(id);
                        }
                    });
                    calculatedBaseAmount = sum;
                }
            }
        }

        const baseAmount = calculatedBaseAmount;
        let discount = 0;

        if (couponCode) {
            const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
            if (!coupon) {
                return res.status(400).json({ message: "Invalid coupon code" });
            }
            if (coupon.discountType === "percent") {
                discount = (baseAmount * coupon.discountValue) / 100;
            } else {
                discount = Math.min(coupon.discountValue, baseAmount);
            }
        }

        const netAmount = Math.max(baseAmount - discount, 0);
        const gstAmount = netAmount * 0.18;
        const finalAmount = netAmount + gstAmount;
        const originalAmountWithGST = baseAmount + (baseAmount * 0.18);
        const amountInPaise = Math.round(finalAmount * 100);

        // 🔥 Generate random secure login password for user
        const randomDigits = Math.floor(1000 + Math.random() * 9000);
        const generatedPassword = `ISV${randomDigits}@ssb`;

        const order = new Order({
            slotId,
            price: finalAmount,
            originalAmount: originalAmountWithGST,
            discount,
            couponCode: couponCode || null,
            referralCode: referralCode || null,
            selectedModules: modules,
            status: "pending",
            bookingMethod: referralCode ? 'franchise' : 'standard',
            guestData: {
                name: name.trim(),
                email: cleanEmail,
                phone: cleanPhone,
                generatedPassword
            }
        });

        await order.save();

        const options = {
            amount: amountInPaise,
            currency: "INR",
            receipt: "guest_slot_" + order._id,
            notes: {
                orderId: order._id.toString(),
                email: cleanEmail,
                slotId: slotId.toString()
            }
        };

        const razorOrder = await razorpay.orders.create(options);
        order.orderId = razorOrder.id;
        await order.save();

        res.json({
            orderId: razorOrder.id,
            amount: razorOrder.amount,
        });

    } catch (err) {
        console.error("Error in createGuestOrder:", err);
        res.status(500).json({ message: err.message });
    }
});

// ✅ VERIFY GUEST PAYMENT & AUTO-PROVISION USER
router.post("/verifyGuestPayment", async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
        } = req.body;

        const generatedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "VlhOTv0UtnUAZXEBGwIl5c7H")
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest("hex");

        if (generatedSignature !== razorpay_signature) {
            return res.status(400).json({ message: "Invalid payment signature" });
        }

        const order = await Order.findOne({ orderId: razorpay_order_id });
        if (!order || !order.guestData || !order.guestData.email) {
            return res.status(404).json({ message: "Guest order record not found." });
        }

        const { name, email, phone, generatedPassword } = order.guestData;

        // 1️⃣ Check or create user in UserDetails
        let user = await UserDetails.findOne({ $or: [{ email }, { phone }] });
        const slot = await Slot.findById(order.slotId);

        if (!user) {
            const bookedModules = order.selectedModules || [];
            let clinicalStage = 'full_course';
            if (bookedModules.length === 1 && bookedModules[0] !== 'full_course') {
                clinicalStage = bookedModules[0];
            }

            user = new UserDetails({
                name,
                email,
                phone,
                password: generatedPassword, // 👈 UserDetails pre-save hook automatically bcrypt hashes this!
                role: "student",
                batch: slot && slot.batchNo ? slot.batchNo.trim() : undefined,
                clinicalStage
            });
            await user.save();
        }

        // 2️⃣ Associate user with Order & mark Paid
        order.userId = user._id;
        order.status = "paid";
        order.paymentId = razorpay_payment_id;
        await order.save();

        // 3️⃣ Add student to batch slot
        if (slot && !slot.bookedStudents.includes(user._id)) {
            slot.bookedStudents.push(user._id);
            await slot.save();
        }

        // 4️⃣ Mark coupon used if applicable
        if (order.couponCode) {
            await Coupon.updateOne(
                { code: order.couponCode },
                { $push: { usedBy: { userId: user._id, usedAt: new Date() } } }
            );
        }

        // 5️⃣ Send welcome credentials email via MSG91 Template & Nodemailer fallback
        try {
            const loginUrl = `${process.env.CLIENT_URL || 'https://ssbwithisv.in'}/SignIn`;
            const senderName = "Integrated SSB Virtuosos";
            const senderEmail = "info@ssbwithisv.in";

            let msg91Sent = false;
            try {
                const msg91Payload = {
                    recipients: [
                        {
                            to: [{ name: user.name || "Student", email: user.email }],
                            variables: {
                                // Standard Uppercase
                                SENDER_NAME: senderName,
                                SENDER_EMAIL: senderEmail,
                                USERNAME: user.email,
                                PASSWORD: generatedPassword,
                                LOGIN_URL: loginUrl,
                                
                                // Lowercase & alternatives
                                sender_name: senderName,
                                sender_email: senderEmail,
                                username: user.email,
                                user_name: user.email,
                                password: generatedPassword,
                                pass: generatedPassword,
                                login_url: loginUrl,
                                email: user.email,
                                id: user.email,
                                ID: user.email,

                                // Symbol-enclosed syntax variations (Brackets, Hashes, Handlebars)
                                "[USERNAME]": user.email,
                                "[PASSWORD]": generatedPassword,
                                "[LOGIN_URL]": loginUrl,
                                "[SENDER_NAME]": senderName,
                                "[SENDER_EMAIL]": senderEmail,
                                "##USERNAME##": user.email,
                                "##PASSWORD##": generatedPassword,
                                "{{USERNAME}}": user.email,
                                "{{PASSWORD}}": generatedPassword,
                                "{{username}}": user.email,
                                "{{password}}": generatedPassword,
                                "##username##": user.email,
                                "##password##": generatedPassword,

                                // CamelCase variants
                                senderName: senderName,
                                senderEmail: senderEmail,
                                loginUrl: loginUrl,
                                userName: user.email,

                                // Numbered generic variables
                                var1: user.email,
                                var2: generatedPassword,
                                var3: loginUrl
                            }
                        }
                    ],
                    from: {
                        name: senderName,
                        email: "noreply@ssbwithisv.in"
                    },
                    domain: "noreply.ssbwithisv.in",
                    template_id: "template_25_07_2026_20_07"
                };

                const msg91AuthKey = process.env.MSG91_AUTHKEY || process.env.MSG91_TOKEN_AUTH;
                if (msg91AuthKey) {
                    const msg91Res = await axios.post("https://control.msg91.com/api/v5/email/send", msg91Payload, {
                        headers: {
                            'authkey': msg91AuthKey,
                            'Content-Type': 'application/json'
                        }
                    });
                    console.log("✅ Guest credentials email sent via MSG91 (template_25_07_2026_20_07):", msg91Res.data);
                    msg91Sent = true;
                }
            } catch (msg91Err) {
                console.warn("⚠️ MSG91 email send attempt failed or domain pending verify, utilizing Nodemailer fallback:", msg91Err?.response?.data || msg91Err.message);
            }

            // If MSG91 send didn't complete, send via Nodemailer using the exact HTML design template
            if (!msg91Sent) {
                const transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: process.env.EMAIL_USER || "isvclub2021@gmail.com",
                        pass: process.env.EMAIL_PASS || "ptrl slav txdd dmcf"
                    }
                });

                const htmlContent = `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1.0">
    <title>Login Credentials</title>
</head>

<body style="margin:0; padding:0; background-color:#f4f6fa;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f6fa; min-height:100vh;">
        <tr>
            <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" border="0"
                    style="max-width:480px; background-color:#ffffff; border-radius:6px; box-shadow:0 1px 3px rgba(0,0,0,0.04);">
                    <tr>
                        <td style="padding:16px 24px 0 24px; font-family:Arial,Helvetica,sans-serif; color:#7a8398; font-size:13px;"
                            align="right">
                            From: <span style="color:#22304c;">${senderName} &lt;${senderEmail}&gt;</span>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:18px 24px 12px 24px; background-color:#2262a7; border-radius:6px 6px 0 0;">
                            <h1
                                style="margin:0; font-family:Arial,Helvetica,sans-serif; font-size:22px; color:#ffffff; font-weight:normal; letter-spacing:0.5px;">
                                Integrated SSB Virtuosos
                            </h1>
                            <h6
                                style="margin:0; font-family:Arial,Helvetica,sans-serif; font-size:12px; color:#ffffff; font-weight:normal; letter-spacing:0.5px;">
                                A unit of CS Joint Services Academy Pvt Ltd
                            </h6>
                        </td>
                    </tr>
                    <tr>
                        <td
                            style="padding:24px; font-family:Arial,Helvetica,sans-serif; color:#22304c; font-size:15px; line-height:1.6;">
                            <p style="margin-top:0; margin-bottom:18px;">Dear User,</p>
                            <p style="margin-top:0; margin-bottom:18px;">Your account has been created. Please use the
                                credentials below to log in:</p>
                            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:20px;">
                                <tr>
                                    <td style="padding:8px 0; color:#5a6473; font-size:15px; width:110px;">Username:
                                    </td>
                                    <td style="padding:8px 0; color:#22304c; font-size:15px; font-weight:bold;">
                                        ${user.email}</td>
                                </tr>
                                <tr>
                                    <td style="padding:8px 0; color:#5a6473; font-size:15px; width:110px;">Password:
                                    </td>
                                    <td style="padding:8px 0; color:#22304c; font-size:15px; font-weight:bold;">
                                        ${generatedPassword}</td>
                                </tr>
                            </table>
                            <p style="margin-top:0; margin-bottom:18px;">You can access your account here:&nbsp;
                                <a href="${loginUrl}" style="color:#2262a7; text-decoration:underline;">Login Page</a>
                            </p>
                            <p style="margin-top:0; margin-bottom:0; color:#7a8398; font-size:13px;">For your security,
                                please change your password after your first login.</p>
                        </td>
                    </tr>
                    <tr>
                        <td
                            style="padding:20px 24px 16px 24px; background-color:#f6f8fa; border-radius:0 0 6px 6px; text-align:center;">
                            <p style="margin:0; font-family:Arial,Helvetica,sans-serif; color:#98a1b3; font-size:13px;">
                                If you did not request this email, please ignore it or contact support.</p>
                            <p
                                style="margin:5px 0 5px 0; font-family:Arial,Helvetica,sans-serif; color:#b3bbc6; font-size:11px;">
                                &copy; 2026 Integrated SSB Virtuosos</p>
                            <p style="margin:0; font-family:Arial,Helvetica,sans-serif; color:#a5aabb; font-size:12px;">
                                ${senderName} &middot; ${senderEmail}</p>
                            <p style="margin:0; font-family:Arial,Helvetica,sans-serif; color:#c0c6d2; font-size:12px;">
                                This message was sent by ${senderName}.</p>
                        </td>
                    </tr>
                </table>
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                        <td height="20"></td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>

</html>`;

                const mailOptions = {
                    from: `"${senderName}" <${process.env.EMAIL_USER || "isvclub2021@gmail.com"}>`,
                    to: user.email,
                    subject: "Login Credentials - Integrated SSB Virtuosos",
                    html: htmlContent
                };
                await transporter.sendMail(mailOptions);
                console.log("✅ Guest login credentials sent via Nodemailer fallback with template!");
            }
        } catch (emailErr) {
            console.error("Non-fatal: Failed to send guest login credentials email:", emailErr);
        }

        // 6️⃣ Sign & Return standard Auth JWT Token for instant frontend sign-in
        const token = jwt.sign(
            { id: user._id, phone: user.phone, email: user.email, role: user.role || "student" },
            (process.env.JWT_SECRET || '').trim(),
            { expiresIn: "30d" }
        );

        res.status(200).json({
            success: true,
            message: "Payment verified, user account provisioned, and credentials sent!",
            token,
            user: {
                name: user.name,
                email: user.email,
                phone: user.phone
            }
        });

    } catch (err) {
        console.error("Error in verifyGuestPayment:", err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;