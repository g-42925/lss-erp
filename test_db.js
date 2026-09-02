const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/lss-erp?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+1.10.1').then(async () => {
  const Companie = mongoose.connection.collection('companies');
  const companies = await Companie.find({}).toArray();
  console.log("Companies:", companies.map(c => c.masterAccountId));
  
  if (companies.length > 0) {
    const Order = mongoose.connection.collection('orders');
    const orders = await Order.find({ companyId: companies[0]._id }).toArray();
    console.log("Orders count:", orders.length);
  }
  process.exit();
}).catch(console.error);
