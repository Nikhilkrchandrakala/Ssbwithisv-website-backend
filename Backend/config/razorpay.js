// config/razorpay.js
const Razorpay = require("razorpay");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_live_SdgMS7X9M3RZSi",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "VlhOTv0UtnUAZXEBGwIl5c7H",
});

module.exports = razorpay;