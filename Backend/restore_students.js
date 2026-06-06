const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { UserDetails } = require("./model/UserDetails");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, ".env") });

const MONGODB_URI = process.env.MONGODB_URI;

const usersToRestore = [
  { name: "Hem Pratap", email: "hempratap2003@gmail.com", chestNo: "2", batch: "66" },
  { name: "Jai Shetty", email: "Shettyjai39@gmail.com", chestNo: "3", batch: "66" },
  { name: "Dakshesh Nath", email: "daksheshnathr2009@gmail.com", chestNo: "4", batch: "66" },
  { name: "Sentia Kumimsong", email: "sentiakumimsong@gmail.com", chestNo: "6", batch: "66" },
  { name: "Ritesh Singh", email: "1405riteshsingh@gmail.com", chestNo: "1", batch: "66" }
];

async function restore() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to DB.");

    for (let i = 0; i < usersToRestore.length; i++) {
      const u = usersToRestore[i];
      const existing = await UserDetails.findOne({ email: new RegExp('^' + u.email + '$', 'i') });
      
      if (!existing) {
        const newUser = new UserDetails({
          name: u.name,
          email: u.email,
          phone: "999999999" + i, // Fake phone since it's required
          password: "password123", // Pre-save hook will hash this
          batch: u.batch,
          chestNo: u.chestNo,
          role: "student",
          isManuallyCreated: true
        });
        await newUser.save();
        console.log(`✅ Restored: ${u.email}`);
      } else {
        console.log(`⏩ Already exists: ${u.email}`);
      }
    }
  } catch (error) {
    console.error("Error restoring students:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Done.");
  }
}

restore();
