import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;
const invoiceSchema = new mongoose.Schema({}, { strict: false });
const Invoice = mongoose.model('Invoice', invoiceSchema, 'invoices');

async function run() {
  await mongoose.connect(MONGODB_URI);
  const inv = await Invoice.findOne({ invoiceType: 'service' }).sort({ date: -1 });
  console.log(inv);
  process.exit(0);
}
run().catch(console.error);
