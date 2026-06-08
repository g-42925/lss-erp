require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection;
  
  // get any recent invoice
  const invoices = await db.collection('invoices').find().sort({_id: -1}).limit(5).toArray();
  for (const inv of invoices) {
    console.log(`Invoice: ${inv.invoiceNumber}, salesOrderId: ${inv.salesOrderId}, typeof: ${typeof inv.salesOrderId}, isObjectId: ${inv.salesOrderId instanceof mongoose.Types.ObjectId}`);
  }
  process.exit(0);
}
test();
