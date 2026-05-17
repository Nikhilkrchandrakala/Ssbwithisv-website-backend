require("dotenv").config({ path: require("path").resolve(__dirname, ".env") });
const mongoose = require("mongoose");
const Slot = require("./model/Slot");

const mongoUrl = process.env.MONGO_URL;
if (!mongoUrl) {
    console.error("Error: MONGO_URL environment variable is not defined in .env");
    process.exit(1);
}

mongoose.connect(mongoUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(async () => {
    console.log("Connected to DB");
    const result = await Slot.updateMany({ price: 12499 }, { $set: { isFullCourse: true } });
    console.log("Updated:", result);
    mongoose.connection.close();
}).catch(err => {
    console.error("DB Error:", err);
});
