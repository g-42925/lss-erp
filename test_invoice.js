import mongoose from "mongoose";
import { connectToDatabase } from "./lib/mongodb.js";
import Invoice from "./models/Invoice.js";

async function run() {
  await connectToDatabase();
  const invoices = await Invoice.find({ invoiceType: 'vendor_manual' }).lean();
  console.log("Manual invoices:", invoices);
  process.exit(0);
}
run();
