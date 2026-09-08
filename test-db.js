const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb+srv://new-user-31:Yntktsx1@cluster0.qwxmz.mongodb.net/erp');
  const ServiceOrder = mongoose.connection.collection('serviceorders');
  const orders = await ServiceOrder.find({ salesOrderNumber: { $in: ['SO-17932', 'SO-23908'] } }).toArray();
  console.log(JSON.stringify(orders, null, 2));
  process.exit(0);
}
run();
