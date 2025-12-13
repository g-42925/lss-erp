import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

/**
 * Global cached connection
 * Mencegah koneksi baru setiap reload (Next.js hot reload)
 */
let cached = global.mongoose;


if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

let isConnected = false;

export async function connectToDatabase() {
  if (isConnected) return;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Missing MONGODB_URI");
  }

  try {
    const { connection } = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });

    isConnected = connection.readyState === 1;
    console.log("MongoDB Connected:", isConnected);
  } catch (err) {
    console.error("MongoDB Error:", err);
    throw err;
  }
}
