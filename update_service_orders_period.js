import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ServiceOrder from './models/ServiceOrder.js';

dotenv.config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const orders = await ServiceOrder.find({
      $or: [
        { periodStart: { $exists: false } },
        { periodEnd: { $exists: false } },
        { periodStart: null },
        { periodEnd: null }
      ]
    });

    console.log(`Found ${orders.length} orders to update.`);

    let updatedCount = 0;
    for (const order of orders) {
      if (order.range && order.date) {
        const date = order.date;
        const year = date.getFullYear();
        const month = date.getMonth(); // 0 to 11
        const range = order.range; // e.g., 12

        // Formula: if range = 12 and month = 7 (August), startMonth = floor(7/12)*12 = 0 (January)
        const startMonth = Math.floor(month / range) * range;

        const periodStart = new Date(year, startMonth, 1);
        const periodEnd = new Date(year, startMonth + range, 0);

        order.periodStart = periodStart;
        order.periodEnd = periodEnd;
        await order.save();
        updatedCount++;
      }
    }

    console.log(`Successfully updated ${updatedCount} orders.`);
    process.exit(0);
  } catch (error) {
    console.error('Error updating orders:', error);
    process.exit(1);
  }
}

run();
