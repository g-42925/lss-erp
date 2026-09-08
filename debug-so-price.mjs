import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const so1 = await mongoose.connection.collection('serviceorders').findOne({ salesOrderNumber: "SO-17932" });
  console.log('SO-17932', so1);

  const so2 = await mongoose.connection.collection('serviceorders').findOne({ salesOrderNumber: "SO-23908" });
  console.log('SO-23908', so2);

  await mongoose.disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
