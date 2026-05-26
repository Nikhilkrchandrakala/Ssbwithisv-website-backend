const mongoose = require("mongoose");
const { createDefaultAdmin } = require("../config/createDefaultAdmin");

const connectDB = () => {
    mongoose.connect(process.env.MONGO_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true, // It's a good practice to use this option
    })
        .then(() => {
            console.log("MongoDB connection: success");
            createDefaultAdmin();
            const { seedCourses } = require("./seedCourses");
            seedCourses();
            const migrateStagesToCourses = require("./migrateStagesToCourses");
            migrateStagesToCourses();
        })
        .catch((err) => console.log(err));
};

module.exports = { connectDB };
