const mongoose = require('mongoose');
const Coupon = require('./model/Coupon');
require('dotenv').config();

async function listCoupons() {
  await mongoose.connect(process.env.MONGO_URL);
  const coupons = await Coupon.find({});
  console.log(JSON.stringify(coupons, null, 2));
  await mongoose.connection.close();
}

listCoupons();
