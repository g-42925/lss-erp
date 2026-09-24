const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });
mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/lss-erp").then(async () => {
  const invoiceSchema = new mongoose.Schema({ invoiceNumber: String, paymentHistory: Array }, { strict: false });
  const Invoice = mongoose.model('Invoice', invoiceSchema, 'invoices');
  
  const inv = await Invoice.findOne({ invoiceNumber: /LR251200056/i });
  console.log("Invoice found:", inv ? inv.invoiceNumber : "No");
  if(inv) console.log("Payment History:", JSON.stringify(inv.paymentHistory, null, 2));
  mongoose.disconnect();
}).catch(console.error);
