import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const result = await mongoose.connection.collection('serviceorders').updateMany(
    { handledBy: { $exists: false } },
    { $set: { handledBy: 'internal' } }
  );

  console.log(`Updated ${result.modifiedCount} ServiceOrder documents`);
  await mongoose.disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
