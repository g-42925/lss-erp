import mongoose from 'mongoose';

const MONGODB_URI = process.env.NODE_ENV === 'production' ? process.env.MONGODB_URI : process.env.MONGODB_LOCAL;

if (!MONGODB_URI) throw new Error('Please define the MONGODB_URI environment variable inside .env.local');


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

  console.log('MongoDB Host:', new URL(
    process.env.NODE_ENV === 'production'
      ? process.env.MONGODB_URI
      : process.env.MONGODB_LOCAL
  ).host);


  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("Missing MONGODB_URI");
  }

  try {
    const { connection } = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log({
      host: mongoose.connection.host,
      database: mongoose.connection.name,
      readyState: mongoose.connection.readyState
    });

    isConnected = connection.readyState === 1;
    console.log("MongoDB Connected:", isConnected);
  }
  catch (err) {
    console.error("MongoDB Error:", err);
    throw err;
  }
}
