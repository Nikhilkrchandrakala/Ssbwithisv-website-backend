const mongoose = require('mongoose');
const { UserDetails } = require('../model/UserDetails');
const { AdminUser } = require('../model/AdminUser');
const Franchise = require('../model/Franchise');

async function run() {
  console.log('Connecting to database...');
  await mongoose.connect('mongodb+srv://isvclub2021:ddtIDjbRII76huv8@ssbwithisvleads.3fu0m.mongodb.net/?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected!');

  const demoAccounts = [
    // 4 Assessor types
    {
      email: 'gto@demo.com',
      name: 'Demo GTO Assessor',
      phone: '9111111111',
      role: 'assessor',
      assessorType: 'GTO',
      password: 'password', // Plain text, Mongoose save hook will hash it
      isAssessor: true
    },
    {
      email: 'to@demo.com',
      name: 'Demo TO Assessor',
      phone: '9222222222',
      role: 'assessor',
      assessorType: 'TO',
      password: 'password',
      isAssessor: true
    },
    {
      email: 'psych@demo.com',
      name: 'Demo Psych Assessor',
      phone: '9333333333',
      role: 'assessor',
      assessorType: 'Psych',
      password: 'password',
      isAssessor: true
    },
    {
      email: 'io@demo.com',
      name: 'Demo IO Assessor',
      phone: '9444444444',
      role: 'assessor',
      assessorType: 'IO',
      password: 'password',
      isAssessor: true
    },
    // Content Admin
    {
      email: 'content@demo.com',
      name: 'Demo Content Admin',
      phone: '9555555555',
      role: 'admin',
      permissions: ['dashboard', 'blogs', 'courses', 'coupons'],
      password: 'password',
      isAdmin: true
    },
    // Sales Admin
    {
      email: 'sales@demo.com',
      name: 'Demo Sales Admin',
      phone: '9666666666',
      role: 'admin',
      permissions: ['dashboard', 'sales', 'leads'],
      password: 'password',
      isAdmin: true
    }
  ];

  for (const acc of demoAccounts) {
    const emailLower = acc.email.toLowerCase().trim();
    console.log(`\nProcessing account: ${emailLower} (${acc.name})...`);

    // Clean up across all collections
    await UserDetails.deleteOne({ email: emailLower });
    await AdminUser.deleteOne({ email: emailLower });
    await Franchise.deleteOne({ email: emailLower });
    console.log('Cleaned up existing records.');

    if (acc.isAssessor) {
      // Create standard user account with assessor role and subtype
      const user = new UserDetails({
        name: acc.name,
        email: emailLower,
        phone: acc.phone,
        password: acc.password,
        role: 'assessor',
        assessorType: acc.assessorType
      });
      await user.save();
      console.log(`Seeded Assessor User in "users" collection with subtype: ${acc.assessorType}`);
    } else if (acc.isAdmin) {
      // Create admin account in AdminUser collection
      const admin = new AdminUser({
        name: acc.name,
        email: emailLower,
        phone: acc.phone,
        password: acc.password,
        role: 'admin',
        permissions: acc.permissions
      });
      await admin.save();
      console.log(`Seeded Admin in "adminusers" collection with permissions: ${acc.permissions.join(', ')}`);

      // Sync user profile in standard users collection just in case
      const user = new UserDetails({
        name: acc.name,
        email: emailLower,
        phone: acc.phone,
        password: acc.password,
        role: 'admin'
      });
      await user.save();
      console.log(`Synced Admin in "users" collection.`);
    }
  }

  console.log('\nSeeding completed successfully!');
  process.exit(0);
}

run().catch(error => {
  console.error('Seeding failed:', error);
  process.exit(1);
});
