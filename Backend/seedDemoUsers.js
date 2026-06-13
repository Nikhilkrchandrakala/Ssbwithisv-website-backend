const mongoose = require("mongoose");
require("dotenv").config();
const { UserDetails } = require("./model/UserDetails");
const Order = require("./model/Order");
const Slot = require("./model/Slot");
const Franchise = require("./model/Franchise");

const MONGO_URL = process.env.MONGO_URL;

if (!MONGO_URL) {
    console.error("Error: MONGO_URL is not set in your .env file.");
    process.exit(1);
}

mongoose.connect(MONGO_URL)
.then(async () => {
    console.log("Connected to MongoDB.");

    // 1. Ensure we have a Slot to book
    let slot = await Slot.findOne();
    if (!slot) {
        console.log("No slots found. Creating a default test slot...");
        slot = await Slot.create({
            title: "SSB Preparation Masterclass",
            batchNo: "DEMO-BATCH-2026",
            startTime: "09:00 AM",
            endTime: "05:00 PM",
            price: 4999,
            maxStudents: 100
        });
        console.log(`Created new slot: ${slot.title} (ID: ${slot._id})`);
    } else {
        console.log(`Using existing slot: ${slot.title} (ID: ${slot._id})`);
    }

    // 2. Ensure we have a Franchise Partner with referral code DEMOFRANCHISE10
    let franchise = await Franchise.findOne({ referralCode: "DEMOFRANCHISE10" });
    if (!franchise) {
        console.log("Creating demo franchise partner...");
        franchise = await Franchise.create({
            name: "Demo Franchise Partner",
            email: "franchise.demo@test.com",
            phone: "8888888888",
            referralCode: "DEMOFRANCHISE10",
            commissionPercent: 20,
            isActive: true
        });
        console.log(`Created Franchise: ${franchise.name} (Code: ${franchise.referralCode})`);
    } else {
        console.log(`Using existing Franchise: ${franchise.name} (Code: ${franchise.referralCode})`);
    }

    // 3. Define the demo users
    const demoUsers = [
        {
            name: "Demo Manual Student",
            email: "demo.manual@test.com",
            phone: "9999999991",
            password: "Password123",
            role: "student",
            emailVerified: true,
            phoneVerified: true,
            isManuallyCreated: true
        },
        {
            name: "Demo Standard Student",
            email: "demo.standard@test.com",
            phone: "9999999992",
            password: "Password123",
            role: "student",
            emailVerified: true,
            phoneVerified: true,
            isManuallyCreated: false
        },
        {
            name: "Demo Franchise Student",
            email: "demo.franchise@test.com",
            phone: "9999999993",
            password: "Password123",
            role: "student",
            emailVerified: true,
            phoneVerified: true,
            isManuallyCreated: false
        }
    ];

    const emails = demoUsers.map(u => u.email);
    const phones = demoUsers.map(u => u.phone);

    // 4. Delete existing demo users and their orders
    const existingUsers = await UserDetails.find({
        $or: [
            { email: { $in: emails } },
            { phone: { $in: phones } }
        ]
    });
    const existingUserIds = existingUsers.map(u => u._id);

    if (existingUserIds.length > 0) {
        console.log(`Cleaning up existing demo orders for ${existingUserIds.length} users...`);
        const delOrders = await Order.deleteMany({ userId: { $in: existingUserIds } });
        console.log(`Deleted ${delOrders.deletedCount} orders.`);

        console.log("Cleaning up existing demo users...");
        const delUsers = await UserDetails.deleteMany({ _id: { $in: existingUserIds } });
        console.log(`Deleted ${delUsers.deletedCount} users.`);


        // Also remove from slot.bookedStudents
        slot.bookedStudents = slot.bookedStudents.filter(
            id => !existingUserIds.some(uid => uid.equals(id))
        );
        await slot.save();
    }

    // 5. Create new demo users
    const createdUsers = [];
    for (const uData of demoUsers) {
        const user = new UserDetails(uData);
        await user.save();
        createdUsers.push(user);
        console.log(`Created User: ${user.name} | Email: ${user.email} | Password: Password123`);
    }

    // 6. Create test orders matching the 3 booking types
    // User 1: Manual Booking
    const manualOrder = await Order.create({
        userId: createdUsers[0]._id,
        slotId: slot._id,
        price: slot.price,
        originalAmount: slot.price,
        status: "paid",
        bookingMethod: "manual",
        paymentId: null,
        referralCode: null
    });
    console.log(`Created Manual Order: ID=${manualOrder._id}, Method=${manualOrder.bookingMethod}`);

    // User 2: Standard Booking
    const standardOrder = await Order.create({
        userId: createdUsers[1]._id,
        slotId: slot._id,
        price: slot.price,
        originalAmount: slot.price,
        status: "paid",
        bookingMethod: "standard",
        paymentId: "pay_DEMO_STANDARD_001",
        referralCode: null
    });
    console.log(`Created Standard Order: ID=${standardOrder._id}, Method=${standardOrder.bookingMethod}, PaymentID=${standardOrder.paymentId}`);

    // User 3: Franchise Booking
    const franchiseOrder = await Order.create({
        userId: createdUsers[2]._id,
        slotId: slot._id,
        price: slot.price,
        originalAmount: slot.price,
        status: "paid",
        bookingMethod: "franchise",
        paymentId: "pay_DEMO_FRANCHISE_001",
        referralCode: franchise.referralCode
    });
    console.log(`Created Franchise Order: ID=${franchiseOrder._id}, Method=${franchiseOrder.bookingMethod}, PaymentID=${franchiseOrder.paymentId}, ReferralCode=${franchiseOrder.referralCode}`);

    // 7. Add users to the slot bookedStudents list
    createdUsers.forEach(user => {
        if (!slot.bookedStudents.includes(user._id)) {
            slot.bookedStudents.push(user._id);
        }
    });
    await slot.save();
    console.log("Successfully added demo users to slot.bookedStudents.");

    console.log("\nSeeding complete! You can now log in to the admin portal and verify the TotalSales dashboard.");
    console.log("--- Demo Users Credentials ---");
    demoUsers.forEach(u => {
        console.log(`Name: ${u.name}`);
        console.log(`Email: ${u.email}`);
        console.log(`Password: Password123`);
        console.log(`Phone: ${u.phone}`);
        console.log("------------------------------");
    });

    process.exit(0);
})
.catch(err => {
    console.error("Database connection/seeding error:", err);
    process.exit(1);
});
