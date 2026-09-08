import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const inv1 = await mongoose.connection.collection('invoices').findOne({ invoiceNumber: "LR26080001" });
  console.log('LR26080001', inv1);

  const inv2 = await mongoose.connection.collection('invoices').findOne({ invoiceNumber: "LR26080006" });
  console.log('LR26080006', inv2);

  await mongoose.disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
