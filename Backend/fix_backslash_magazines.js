const mongoose = require('mongoose');

async function run() {
  const uri = 'mongodb+srv://isvclub2021:ddtIDjbRII76huv8@ssbwithisvleads.3fu0m.mongodb.net/?retryWrites=true&w=majority';
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  const db = mongoose.connection.db;
  
  console.log(`Connected to database: ${db.databaseName}`);
  
  const collection = db.collection('magazinepdfs');
  const magazines = await collection.find({}).toArray();
  
  console.log(`\nFound ${magazines.length} magazines. Checking for backslashes...`);
  
  let updatedCount = 0;
  for (let mag of magazines) {
    let updated = false;
    let pdfFilePath = mag.pdfFilePath;
    let magazineFrontImage = mag.magazineFrontImage;
    
    if (pdfFilePath && pdfFilePath.includes('\\')) {
      pdfFilePath = pdfFilePath.replace(/\\/g, '/');
      updated = true;
    }
    
    if (magazineFrontImage && magazineFrontImage.includes('\\')) {
      magazineFrontImage = magazineFrontImage.replace(/\\/g, '/');
      updated = true;
    }
    
    if (updated) {
      await collection.updateOne(
        { _id: mag._id },
        { $set: { pdfFilePath, magazineFrontImage } }
      );
      console.log(`[UPDATED] ID: ${mag._id} ("${mag.pdfTitle}")`);
      console.log(`   Old Image: ${mag.magazineFrontImage} -> New Image: ${magazineFrontImage}`);
      console.log(`   Old PDF:   ${mag.pdfFilePath} -> New PDF:   ${pdfFilePath}\n`);
      updatedCount++;
    }
  }
  
  console.log(`Migration finished. Updated ${updatedCount} documents.`);
  process.exit(0);
}

run().catch(console.error);
