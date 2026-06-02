const mongoose = require('mongoose');
const mongoUrl = 'mongodb+srv://isvclub2021:ddtIDjbRII76huv8@ssbwithisvleads.3fu0m.mongodb.net/?appName=SsbWithIsvLeads';

mongoose.connect(mongoUrl).then(async () => {
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
