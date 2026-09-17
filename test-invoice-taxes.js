import mongoose from 'mongoose';
import { connectToDatabase } from './lib/mongodb.js';
import Invoice from './models/Invoice.js';

async function run() {
  await connectToDatabase();
  const invoices = await Invoice.find({ 'taxes.0': { $exists: true } }).limit(5).lean();
  console.log(JSON.stringify(invoices, null, 2));
  process.exit(0);
}
run();
