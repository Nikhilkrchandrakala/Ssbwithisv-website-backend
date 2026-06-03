const mongoose = require("mongoose");
const { UserDetails } = require("./model/UserDetails");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, ".env") });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://isvclub2021:ddtIDjbRII76huv8@ssbwithisvleads.3fu0m.mongodb.net/?appName=SsbWithIsvLeads';

async function count() {
  try {
    await mongoose.connect(MONGODB_URI);
    
    // Count total users
    const totalCount = await UserDetails.countDocuments();
    
    // Count specifically students (role = 'student')
    const studentCount = await UserDetails.countDocuments({ role: 'student' });
    
    console.log(`Total Users in DB: ${totalCount}`);
    console.log(`Total Students: ${studentCount}`);
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

count();
