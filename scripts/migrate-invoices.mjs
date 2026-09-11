import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

// Define schemas to avoid importing complex Next.js models
const invoiceSchema = new mongoose.Schema({}, { strict: false });
const Invoice = mongoose.model('Invoice', invoiceSchema, 'invoices');

const serviceOrderSchema = new mongoose.Schema({}, { strict: false });
const ServiceOrder = mongoose.model('ServiceOrder', serviceOrderSchema, 'serviceorders');

async function run() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.');

  const invoices = await Invoice.find({ invoiceType: 'service' });
  let migratedCount = 0;

  for (const invoice of invoices) {
    if (invoice.price == null || invoice.qty == null) {
      if (invoice.salesOrderId) {
        const so = await ServiceOrder.findById(invoice.salesOrderId);
        if (so) {
          await Invoice.updateOne(
            { _id: invoice._id },
            { 
              $set: { 
                price: so.price, 
                qty: so.qty, 
                taxes: so.taxes || [] 
              } 
            }
          );
          migratedCount++;
        }
      }
    }
  }

  console.log(`Migrated ${migratedCount} out of ${invoices.length} service invoices.`);
  process.exit(0);
}

run().catch(console.error);
