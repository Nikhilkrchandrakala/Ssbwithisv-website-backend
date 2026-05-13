const amount = 12499;
const discount = 500;
const netAmount = Math.max(amount - discount, 0);
const gst = netAmount * 0.18;
const finalAmount = netAmount + gst;

console.log('Base:', amount);
console.log('Discount:', discount);
console.log('Net:', netAmount);
console.log('GST:', gst);
console.log('Final:', finalAmount);
