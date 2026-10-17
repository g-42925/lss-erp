
import mongoose from 'mongoose';

const MONGODB_URI = process.env.NODE_ENV === 'production'
  ? process.env.MONGODB_URI
  : process.env.MONGODB_LOCAL;

if (!MONGODB_URI) {
  throw new Error(
    `Missing MongoDB URI for ${process.env.NODE_ENV || 'unknown'} environment`
  );
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectToDatabase() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
  }

  try {
    const { connection } = await cached.promise;

    console.log('MongoDB Connected:', {
      host: connection.host,
      database: connection.name,
      readyState: connection.readyState,
    });

    cached.conn = connection;
    return connection;
  }
  catch (err) {
    cached.promise = null;
    console.error('MongoDB Error:', err.message);
    throw err;
  }
}
