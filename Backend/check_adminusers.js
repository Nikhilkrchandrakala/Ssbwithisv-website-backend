const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URL = process.env.MONGO_URL;

mongoose.connect(MONGO_URL)
.then(async () => {
    console.log("Connected to MongoDB.");
    const db = mongoose.connection.db;
    
    const adminUsers = await db.collection('adminusers').find({}).toArray();
    console.log("Admin users in 'adminusers' collection:");
    console.log(adminUsers);
    
    process.exit(0);
}).catch(err => {
    console.error("Connection error:", err);
    process.exit(1);
});
