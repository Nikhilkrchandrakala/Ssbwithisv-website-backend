const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URL = process.env.MONGO_URL;

mongoose.connect(MONGO_URL)
.then(async () => {
    console.log("Connected to MongoDB.");
    const { UserDetails } = require("./model/UserDetails");
    const Order = require("./model/Order");
    
    try {
        const query = {
            role: { $nin: ["assessor", "admin", "franchise", "lead"] }
        };
        
        console.log("Executing query...");
        const students = await UserDetails.find(query)
            .populate("assignedGTO", "name email phone")
            .populate("assignedTO", "name email phone")
            .populate("assignedPsych", "name email phone")
            .populate("assignedIO", "name email phone")
            .sort({ updatedAt: -1 });
            
        console.log(`Query returned ${students.length} students.`);
        
        const studentsWithBatch = await Promise.all(students.map(async (student) => {
            let modified = false;
            
            if (!student.role || (student.role !== "student" && student.role !== "lead" && student.role !== "admin" && student.role !== "assessor" && student.role !== "franchise")) {
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
        
        console.log("Successfully processed all students.");
        console.log("Sample student name:", studentsWithBatch[0]?.name);
        process.exit(0);
    } catch (e) {
        console.error("CRASH DURING FETCH/MAP:", e);
        process.exit(1);
    }
}).catch(err => {
    console.error("Connection error:", err);
    process.exit(1);
});
