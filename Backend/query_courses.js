const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb+srv://isvclub2021:ddtIDjbRII76huv8@ssbwithisvleads.3fu0m.mongodb.net/?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true });
  const db = mongoose.connection.db;
  
  console.log(`Connected to database: ${db.databaseName}`);
  
  const courses = await db.collection('ssbcourses').find({}).toArray();
  console.log('\n--- All Courses in ssbcourses ---');
  console.log(JSON.stringify(courses, null, 2));
  
  process.exit(0);
}

run().catch(console.error);
