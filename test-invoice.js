const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb+srv://new-user-31:Yntktsx1@cluster0.qwxmz.mongodb.net/erp');
  const Invoice = mongoose.connection.collection('invoices');
  const invoices = await Invoice.find({ salesOrderId: { $in: [
    new mongoose.Types.ObjectId("6a7d68610698996dec78b71c"), 
    new mongoose.Types.ObjectId("6a7ee5a78bed70d773b1ae61")
  ] } }).toArray();
  console.log(JSON.stringify(invoices, null, 2));
  process.exit(0);
}
run();
