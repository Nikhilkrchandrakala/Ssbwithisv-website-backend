const mongoose = require('mongoose');

// Connect to the DB using the URI from the plan
mongoose.connect('mongodb+srv://isvclub2021:ddtIDjbRII76huv8@ssbwithisvleads.3fu0m.mongodb.net/?appName=SsbWithIsvLeads')
.then(async () => {
  console.log("Connected to DB. Starting reset...");
  const db = mongoose.connection.db;

  // Step 1.1: Wipe submissions and notifications
  console.log("Wiping submissions...");
  const subDeleteRes = await db.collection('submissions').deleteMany({});
  console.log(`Deleted ${subDeleteRes.deletedCount} submissions.`);

  console.log("Wiping notifications...");
  const notifDeleteRes = await db.collection('notifications').deleteMany({});
  console.log(`Deleted ${notifDeleteRes.deletedCount} notifications.`);

  // Step 1.2: Clear allotment fields on students
  console.log("Clearing allotment fields for students...");
  const userUpdateRes = await db.collection('users').updateMany(
    { role: { $nin: ['assessor', 'admin', 'franchise'] } },
    { $set: { assignedGTO: null, assignedTO: null, assignedPsych: null, assignedIO: null, assignedAssessments: [] } }
  );
  console.log(`Modified ${userUpdateRes.modifiedCount} student records.`);

  // Step 1.3: Verification Query
  const subCount = await db.collection('submissions').countDocuments();
  const notifCount = await db.collection('notifications').countDocuments();
  const allottedCount = await db.collection('users').countDocuments({
    $or: [
      { assignedGTO: { $ne: null } },
      { assignedTO: { $ne: null } },
      { assignedPsych: { $ne: null } },
      { assignedIO: { $ne: null } }
    ],
    role: { $nin: ['assessor', 'admin', 'franchise'] }
  });
  
  console.log("\n--- Verification ---");
  console.log(`Remaining Submissions: ${subCount} (Expected: 0)`);
  console.log(`Remaining Notifications: ${notifCount} (Expected: 0)`);
  console.log(`Remaining Allotted Students: ${allottedCount} (Expected: 0)`);

  process.exit(0);
}).catch(e => { 
  console.error("Error during reset:", e); 
  process.exit(1); 
});
