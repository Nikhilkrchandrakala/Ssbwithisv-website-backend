require('dotenv').config();
const mongoose = require('mongoose');
const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');

async function check() {
  await mongoose.connect(process.env.MONGO_URL || process.env.MONGODB_URI);
  const total = await User.countDocuments();
  const missingRole = await User.countDocuments({ role: { $exists: false } });
  const missingRoleFc = await User.countDocuments({ role: { $exists: false }, clinicalStage: 'full_course' });
  const roleStudent = await User.countDocuments({ role: 'student' });
  
  const allFc = await User.countDocuments({ clinicalStage: 'full_course' });
  const allPsych = await User.countDocuments({ clinicalStage: 'psych' });
  
  console.log('Total users:', total);
  console.log('Users missing role field:', missingRole);
  console.log('Missing role AND full_course:', missingRoleFc);
  console.log('role == student:', roleStudent);
  console.log('ALL users with full_course:', allFc);
  console.log('ALL users with psych:', allPsych);
  process.exit(0);
}
check();
