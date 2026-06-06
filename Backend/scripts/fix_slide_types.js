const mongoose = require('mongoose');
require('dotenv').config();
if (!process.env.MONGODB_URI) { console.error('MONGODB_URI env var is required'); process.exit(1); }

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const db = mongoose.connection.db;
    const assessments = await db.collection('assessments').find({}).toArray();
    let updatedCount = 0;
    
    for (const assessment of assessments) {
        let changed = false;
        if (assessment.slides) {
            for (const slide of assessment.slides) {
                if (slide.slideType === 'INSTRUCTIONS' || slide.slideType === 'SITUATION') {
                    slide.slideType = 'TEXT';
                    changed = true;
                }
            }
        }
        if (changed) {
            await db.collection('assessments').updateOne(
                { _id: assessment._id },
                { $set: { slides: assessment.slides } }
            );
            updatedCount++;
        }
    }
    
    console.log('Assessments updated:', updatedCount);
    mongoose.connection.close();
}).catch(console.error);
