const mongoose = require('mongoose');
mongoose.connect("mongodb://new-user-31:Yntktsx1@cluster0-shard-00-00.qwxmz.mongodb.net:27017,cluster0-shard-00-01.qwxmz.mongodb.net:27017,cluster0-shard-00-02.qwxmz.mongodb.net:27017/erp?ssl=true&replicaSet=atlas-149814-shard-0&authSource=admin&appName=Cluster0").then(async () => {
  const invoiceSchema = new mongoose.Schema({ invoiceNumber: String, paymentHistory: Array }, { strict: false });
  const Invoice = mongoose.model('Invoice', invoiceSchema, 'invoices');
  
  const inv = await Invoice.findOne({ invoiceNumber: /LR251200081/i });
  console.log("Invoice found:", inv ? inv.invoiceNumber : "No");
  if(inv) console.log("Payment History:", JSON.stringify(inv.paymentHistory, null, 2));
  mongoose.disconnect();
}).catch(console.error);
