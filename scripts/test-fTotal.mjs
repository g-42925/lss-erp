import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  await mongoose.connect(MONGODB_URI);
  
  // Get an invoice
  const db = mongoose.connection.db;
  const invoices = await db.collection('invoices').aggregate([
    {
      $match: {
        invoiceType: "service",
        status: "active"
      }
    },
    {
      $lookup: {
        from: 'serviceorders',
        localField: 'salesOrderId',
        foreignField: '_id',
        as: 'order'
      }
    },
    {
      $unwind: '$order'
    }
  ]).toArray();

  const inv = invoices[0];
  console.log("Original Invoice Price:", inv.price);
  console.log("Order Price:", inv.order.price);

  // Now change the order price
  await db.collection('serviceorders').updateOne(
    { _id: inv.order._id },
    { $set: { price: inv.order.price + 1000000 } }
  );

  // Fetch again
  const invoicesAfter = await db.collection('invoices').aggregate([
    {
      $match: {
        invoiceType: "service",
        status: "active",
        _id: inv._id
      }
    },
    {
      $lookup: {
        from: 'serviceorders',
        localField: 'salesOrderId',
        foreignField: '_id',
        as: 'order'
      }
    },
    {
      $unwind: '$order'
    }
  ]).toArray();

  const invAfter = invoicesAfter[0];
  console.log("After update Invoice Price:", invAfter.price);
  console.log("After update Order Price:", invAfter.order.price);

  // Let's compute fTotal
  function fTotal(invoice) {
    const isOneTimeService = invoice?.order?.contractType === "One Time" && invoice?.order?.frequency === "Once"
    const price = invoice?.price ?? invoice?.order?.price
    const qty = invoice?.qty ?? invoice?.order?.qty
    const baseTotal = isOneTimeService ? price : price - ((price / qty) * invoice?.missing)
    let totalWithTax = baseTotal;
    const taxes = invoice?.taxes ?? invoice?.order?.taxes;
    if (taxes) {
      taxes.forEach((tax) => {
        if (tax.isPPh) {
          totalWithTax -= tax.taxValue;
        } else {
          totalWithTax += tax.taxValue;
        }
      });
    }
    return totalWithTax;
  }

  console.log("fTotal Before:", fTotal(inv));
  console.log("fTotal After:", fTotal(invAfter));

  // Revert
  await db.collection('serviceorders').updateOne(
    { _id: inv.order._id },
    { $set: { price: inv.order.price } }
  );

  process.exit(0);
}
run().catch(console.error);
