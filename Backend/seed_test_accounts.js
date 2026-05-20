const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function seed() {
  await mongoose.connect('mongodb+srv://isvclub2021:ddtIDjbRII76huv8@ssbwithisvleads.3fu0m.mongodb.net/?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true });
  const db = mongoose.connection.db;
  
  console.log(`Connected to database: ${db.databaseName}`);
  
  // 1. Find juncando@gmail.com
  const candidate = await db.collection('users').findOne({ email: { $regex: new RegExp('^juncando@gmail.com$', 'i') } });
  
  if (candidate) {
    // Create a dummy slot
    const slotRes = await db.collection('slots').insertOne({
        date: new Date(),
        startTime: "10:00 AM",
        endTime: "11:00 AM",
        capacity: 10,
        bookedCount: 1,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date()
    });
    
    // Create a dummy order for the candidate to unlock Psyche Battery
    const existingOrder = await db.collection('orders').findOne({ userId: candidate._id });
    if (!existingOrder) {
      await db.collection('orders').insertOne({
          userId: candidate._id,
          slotId: slotRes.insertedId,
          price: 0,
          status: "paid",
          createdAt: new Date(),
          updatedAt: new Date()
      });
      console.log('✅ Created dummy order for juncando@gmail.com');
    } else {
      console.log('ℹ️ juncando@gmail.com already has an order');
    }
  } else {
    console.log('❌ Could not find juncando@gmail.com in users collection');
  }
  
  // 2. Create assessor account: juncando+assessor@gmail.com
  const assessorEmail = 'juncando+assessor@gmail.com';
  const existingAssessor = await db.collection('users').findOne({ email: assessorEmail });
  
  if (!existingAssessor) {
    const hashedPassword = await bcrypt.hash('password123', 10);
    await db.collection('users').insertOne({
        name: "Arjun (Assessor Test)",
        email: assessorEmail,
        phone: "+910000000000",
        password: hashedPassword,
        role: "assessor",
        createdAt: new Date(),
        updatedAt: new Date()
    });
    console.log(`✅ Created assessor account: ${assessorEmail}`);
  } else {
    console.log(`ℹ️ Assessor account ${assessorEmail} already exists`);
  }
  
  // 3. Find Super Admin "Nikhil"
  const nikhilAdmin = await db.collection('adminusers').findOne({ email: { $regex: new RegExp('nikhil', 'i') } });
  console.log('\n--- Super Admin (Nikhil) ---');
  console.log(JSON.stringify(nikhilAdmin, null, 2));

  process.exit(0);
}

seed().catch(console.error);
