const mongoose = require("mongoose");
const { createDefaultAdmin } = require("../config/createDefaultAdmin");

const connectDB = () => {
    mongoose.connect(process.env.MONGO_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true, // It's a good practice to use this option
    })
        .then(async () => {
            console.log("MongoDB connection: success");
            createDefaultAdmin();
            const { seedCourses } = require("./seedCourses");
            seedCourses();
            const migrateStagesToCourses = require("./migrateStagesToCourses");
            migrateStagesToCourses();
            
            try {
                const syncPaidUserRoles = require("./syncPaidUserRoles");
                await syncPaidUserRoles();
            } catch (err) {
                console.error("Failed to run syncPaidUserRoles migration:", err.message);
            }
        })
        .catch((err) => console.log(err));
};

module.exports = { connectDB };
