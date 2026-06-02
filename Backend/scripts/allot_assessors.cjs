const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://isvclub2021:ddtIDjbRII76huv8@ssbwithisvleads.3fu0m.mongodb.net/?appName=SsbWithIsvLeads')
.then(async () => {
  console.log("Connected to DB. Starting allotment...");
  const db = mongoose.connection.db;
  
  // Get all assessors
  const UserDetails = db.collection('users');
  const assessors = await UserDetails.find({ role: 'assessor' }).toArray();
  const gto = assessors.find(a => a.assessorType === 'GTO')._id;
  const to = assessors.find(a => a.assessorType === 'TO')._id;
  const psych = assessors.find(a => a.assessorType === 'Psych')._id;
  const io = assessors.find(a => a.assessorType === 'IO')._id;
  
  if (!gto || !to || !psych || !io) {
      console.error("Missing assessors!");
      process.exit(1);
  }

  // Get paid user IDs and manually created students
  const Order = db.collection('orders');
  const paidUserIds = await Order.distinct('userId', { status: 'paid' });
  const manualStudentIds = await UserDetails.distinct('_id', { role: 'student', isManuallyCreated: true });
  const allIds = [...paidUserIds, ...manualStudentIds];

  const students = await UserDetails.find({
    _id: { $in: allIds },
    role: { $nin: ['assessor', 'admin', 'franchise'] }
  }).sort({ createdAt: 1 }).toArray();

  console.log(`Found ${students.length} candidates.`);

  const notifications = [];

  for (let i = 0; i < students.length; i++) {
      const student = students[i];
      let assignedPsych = null;
      let assignedTO = null;
      
      // Matrix: 7 get Psych, 5 get TO
      if (i < 7) {
          assignedPsych = psych;
      } else {
          assignedTO = to;
      }
      
      // Update DB
      await UserDetails.updateOne(
          { _id: student._id },
          { $set: { 
              assignedGTO: gto, 
              assignedIO: io, 
              assignedPsych: assignedPsych, 
              assignedTO: assignedTO,
              assignedAssessments: [new mongoose.Types.ObjectId('6a0d70e0a2828aea6c6280dc')],
              role: 'student'
          }}
      );
      
      console.log(`Allotted ${student.name} -> GTO, IO, ${assignedPsych ? 'Psych' : 'TO'}`);
      
      // Notifications
      notifications.push({
          recipientId: gto,
          studentId: student._id,
          title: "New Candidate Allotted",
          message: `You have been allotted as GTO for candidate ${student.name}.`,
          type: "ALLOTMENT",
          isRead: false,
          createdAt: new Date(),
          updatedAt: new Date()
      });
      notifications.push({
          recipientId: io,
          studentId: student._id,
          title: "New Candidate Allotted",
          message: `You have been allotted as Interviewing Officer for candidate ${student.name}.`,
          type: "ALLOTMENT",
          isRead: false,
          createdAt: new Date(),
          updatedAt: new Date()
      });
      if (assignedPsych) {
          notifications.push({
              recipientId: psych,
              studentId: student._id,
              title: "New Candidate Allotted",
              message: `You have been allotted as Psychologist for candidate ${student.name}.`,
              type: "ALLOTMENT",
              isRead: false,
              createdAt: new Date(),
              updatedAt: new Date()
          });
      }
      if (assignedTO) {
          notifications.push({
              recipientId: to,
              studentId: student._id,
              title: "New Candidate Allotted",
              message: `You have been allotted as TO for candidate ${student.name}.`,
              type: "ALLOTMENT",
              isRead: false,
              createdAt: new Date(),
              updatedAt: new Date()
          });
      }
  }

  // Insert all notifications
  if (notifications.length > 0) {
      await db.collection('notifications').insertMany(notifications);
  }
  
  console.log(`Inserted ${notifications.length} notifications (Expected: 36)`);
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});
