require('dotenv').config();
const mongoose = require('mongoose');
const { UserDetails } = require('./model/UserDetails');
const Order = require('./model/Order');
const Slot = require('./model/Slot');

async function run() {
    await mongoose.connect(process.env.MONGO_URL);
    
    // Create a mock user
    const mockEmail = `test_${Math.floor(Math.random() * 10000)}@example.com`;
    const user = new UserDetails({
        name: "Test Student",
        email: mockEmail,
        phone: "1234567890",
        password: "password123",
        role: "student",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 365) // 1 year ago
    });
    await user.save();
    console.log(`Created test user: ${user.email} with old createdAt: ${user.createdAt}`);

    // Fetch an active slot
    const slot = await Slot.findOne();
    if (!slot) {
        console.log("No slot found to book.");
        process.exit(0);
    }
    
    console.log(`Booking slot ${slot.batchNo || slot.title} for user...`);
    
    // Simulate manualBookSlot backend logic
    slot.bookedStudents.push(user._id);
    await slot.save();

    const order = new Order({
        userId: user._id,
        slotId: slot._id,
        price: 0,
        status: "paid",
        selectedModules: ['full_course']
    });
    await order.save();

    let userModified = false;
    if (slot.batchNo) {
        user.batch = slot.batchNo.trim();
        userModified = true;
    }
    user.clinicalStage = 'full_course';
    user.markModified('updatedAt');
    await user.save();

    console.log(`User after booking - batch: ${user.batch}, clinicalStage: ${user.clinicalStage}, updatedAt: ${user.updatedAt}`);

    // Verify sort order
    const students = await UserDetails.find({ role: { $nin: ["assessor", "admin", "franchise"] } })
        .sort({ updatedAt: -1 })
        .limit(1);
    
    if (students.length > 0 && students[0].email === mockEmail) {
        console.log("✅ Verification Passed: The manually booked user correctly jumped to the top of the roster!");
    } else {
        console.log("❌ Verification Failed: The manually booked user is not at the top.", students[0].email);
    }

    process.exit(0);
}

run().catch(console.error);
