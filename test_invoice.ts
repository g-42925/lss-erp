import mongoose from 'mongoose';
import { connectToDatabase } from './lib/mongodb.js';
import Invoice from './models/Invoice.js';

async function run() {
  await connectToDatabase();
  const invoices = await Invoice.find({ paid: false, status: 'active' }).limit(5);
  console.log(JSON.stringify(invoices, null, 2));
  process.exit(0);
}
run().catch(console.error);
