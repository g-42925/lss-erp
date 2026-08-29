import mongoose from 'mongoose';
import Invoice from './models/Invoice.js';
import ServiceOrder from './models/ServiceOrder.js';

const MONGODB_URI = "mongodb+srv://new-user-31:Yntktsx1@cluster0.qwxmz.mongodb.net/erp";

async function updateDates() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB.");

    const targetDate = new Date("2026-08-31T00:00:00.000Z");

    const invoiceResult = await Invoice.updateMany({}, { $set: { date: targetDate } });
    console.log(`Updated ${invoiceResult.modifiedCount} invoices.`);

    const orderResult = await ServiceOrder.updateMany({}, { $set: { date: targetDate } });
    console.log(`Updated ${orderResult.modifiedCount} service orders.`);

    console.log("Successfully updated all dates to 31 August 2026.");
  } catch (error) {
    console.error("Error updating dates:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

updateDates();
