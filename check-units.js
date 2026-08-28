import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { connectToDatabase } from './lib/mongodb.js';

async function run() {
  await connectToDatabase();
  const db = mongoose.connection.db;
  const units = await db.collection('units').find().toArray();
  console.log('Units:', units.map(u => u.name));
  process.exit(0);
}
run();
