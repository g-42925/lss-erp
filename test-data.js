import mongoose from 'mongoose';
import InvItem from './models/InvItem.js';
import Companie from './models/Companie.js';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lss-erp');
  console.log("InvItem collection count:", await mongoose.connection.db.collection('invitems').countDocuments());
  console.log("Companie collection count:", await mongoose.connection.db.collection('companies').countDocuments());
  process.exit(0);
}
main();
