require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection;
  const invoices = await db.collection('invoices').find({ refundCredit: { $exists: true } }).toArray();
  console.log("Invoices with refundCredit:", invoices.length);
  if (invoices.length > 0) {
    console.log(invoices[0]);
  }
  process.exit(0);
}
test();
