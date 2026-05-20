const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb+srv://isvclub2021:ddtIDjbRII76huv8@ssbwithisvleads.3fu0m.mongodb.net/?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true });
  const db = mongoose.connection.db;
  
  console.log(`Connected to database: ${db.databaseName}`);
  
  // 1. Check for juncando in users / userdetails
  const candidateUsers = await db.collection('users').findOne({ email: { $regex: new RegExp('^juncando@gmail.com$', 'i') } });
  const candidateUserDetails = await db.collection('userdetails').findOne({ email: { $regex: new RegExp('^juncando@gmail.com$', 'i') } });
  
  console.log('\n--- Candidate (users) ---');
  console.log(JSON.stringify(candidateUsers, null, 2));
  
  console.log('\n--- Candidate (userdetails) ---');
  console.log(JSON.stringify(candidateUserDetails, null, 2));
  
  // 2. Check for juncando in adminusers
  const admin = await db.collection('adminusers').findOne({ email: { $regex: new RegExp('^juncando@gmail.com$', 'i') } });
  console.log('\n--- Admin/Assessor (adminusers) ---');
  console.log(JSON.stringify(admin, null, 2));
  
  // 3. List all admins and assessors from both collections
  const allAdmins = await db.collection('adminusers').find({}, { projection: { email: 1, role: 1 } }).toArray();
  const allAssessorUsers = await db.collection('users').find({ role: 'assessor' }, { projection: { email: 1, role: 1 } }).toArray();
  const allAssessorUserDetails = await db.collection('userdetails').find({ role: 'assessor' }, { projection: { email: 1, role: 1 } }).toArray();
  
  console.log('\n--- All AdminUsers ---');
  console.log(JSON.stringify(allAdmins, null, 2));
  
  console.log('\n--- All Assessors in users ---');
  console.log(JSON.stringify(allAssessorUsers, null, 2));

  console.log('\n--- All Assessors in userdetails ---');
  console.log(JSON.stringify(allAssessorUserDetails, null, 2));
  
  process.exit(0);
}

run().catch(console.error);
