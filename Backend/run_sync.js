const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URL = process.env.MONGO_URL;

mongoose.connect(MONGO_URL)
.then(async () => {
    console.log("Connected to MongoDB.");
    const syncPaidUserRoles = require("./config/syncPaidUserRoles");
    console.log("Starting sync...");
    await syncPaidUserRoles();
    console.log("Sync finished.");
    process.exit(0);
}).catch(err => {
    console.error("Connection error:", err);
    process.exit(1);
});
