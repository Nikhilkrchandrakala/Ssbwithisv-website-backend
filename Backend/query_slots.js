const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb+srv://isvclub2021:ddtIDjbRII76huv8@ssbwithisvleads.3fu0m.mongodb.net/?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true });
  const db = mongoose.connection.db;
  
  console.log(`Connected to database: ${db.databaseName}`);
  
  const slots = await db.collection('slots').find({}).toArray();
  console.log('\n--- All Slots in slots ---');
  console.log(JSON.stringify(slots, null, 2));
  
  process.exit(0);
}

run().catch(console.error);
