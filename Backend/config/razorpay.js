// config/razorpay.js
const Razorpay = require("razorpay");

const razorpay = new Razorpay({
  key_id: "rzp_live_SdgMS7X9M3RZSi",
  key_secret: "VlhOTv0UtnUAZXEBGwIl5c7H",
  
});

module.exports = razorpay;