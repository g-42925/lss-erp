import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
import Invoice from './models/Invoice.js';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const invoices = await Invoice.find({ paid: false, status: 'active', invoiceType: 'service' }).lean().limit(1);
  console.log("Service Invoices:");
  console.log(JSON.stringify(invoices, null, 2));

  const pInvoices = await Invoice.find({ paid: false, status: 'active', invoiceType: 'product' }).lean().limit(1);
  console.log("Product Invoices:");
  console.log(JSON.stringify(pInvoices, null, 2));
  process.exit(0);
}
run().catch(console.error);
