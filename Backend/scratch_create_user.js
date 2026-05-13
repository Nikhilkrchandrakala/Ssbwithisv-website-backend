const mongoose = require('mongoose');
const { UserDetails } = require('./model/UserDetails');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function createTestUser() {
  await mongoose.connect(process.env.MONGO_URL);
  const password = await bcrypt.hash('password123', 10);
  const user = new UserDetails({
    name: 'Test User',
    email: 'test@example.com',
    phone: '1234567890',
    password: password
  });
  await user.save();
  console.log('Test user created');
  await mongoose.connection.close();
}

createTestUser();
