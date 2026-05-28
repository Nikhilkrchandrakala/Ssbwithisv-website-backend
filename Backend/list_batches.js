const mongoose = require('mongoose');

async function run() {
  const mongoUrl = 'mongodb+srv://isvclub2021:ddtIDjbRII76huv8@ssbwithisvleads.3fu0m.mongodb.net/?appName=SsbWithIsvLeads';
  console.log("Connecting to database...");
  await mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
  const db = mongoose.connection.db;

  const batches = await db.collection('users').distinct('batch');
  console.log("\nDistinct Batch values in 'users' collection:");
  console.log(JSON.stringify(batches, null, 2));

  // Let's count how many users have each batch
  const counts = await db.collection('users').aggregate([
    { $group: { _id: "$batch", count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();

  console.log("\nBatch counts:");
  counts.forEach(c => {
    console.log(`- Batch: "${c._id}" | Count: ${c.count}`);
  });

  process.exit(0);
}

run().catch(console.error);
