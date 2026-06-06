const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  const mongoUrl = process.env.MONGODB_URI;
  if (!mongoUrl) { console.error('MONGODB_URI env var is required'); process.exit(1); }
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
