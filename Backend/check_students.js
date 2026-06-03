const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://isvclub2021:ddtIDjbRII76huv8@ssbwithisvleads.3fu0m.mongodb.net/?appName=SsbWithIsvLeads';

const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', userSchema, 'users');

const emailsToCheck = [
  'hempratap2003@gmail.com',
  'Shettyjai39@gmail.com',
  'daksheshnathr2009@gmail.com',
  'sentiakumimsong@gmail.com',
  '1405riteshsingh@gmail.com',
  'sp35506@gmail.com'
];

async function checkStudents() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to DB. Checking for missing students...');

    for (const email of emailsToCheck) {
      // Case insensitive search
      const user = await User.findOne({ email: new RegExp('^' + email + '$', 'i') });
      if (user) {
        console.log(`FOUND: ${email}`);
        console.log(`  -> ID: ${user._id}`);
        console.log(`  -> Name: ${user.name}`);
        console.log(`  -> Role: ${user.role}`);
        console.log(`  -> Batch: ${user.batch || 'None'}`);
      } else {
        console.log(`MISSING: ${email} (Not found in DB)`);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Done.');
  }
}

checkStudents();
