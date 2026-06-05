import mongoose from 'mongoose';
import InvItem from './models/InvItem.js';
import Companie from './models/Companie.js';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lss-erp');
  const items = await InvItem.find({}).lean();
  console.log("InvItem companyId type:", typeof items[0]?.companyId, items[0] ? items[0].companyId.constructor.name : 'No items');
  console.log("items array length:", items.length);
  const company = await Companie.findOne({}).lean();
  console.log("Company _id type:", typeof company?._id, company ? company._id.constructor.name : 'No company');
  process.exit(0);
}
main();
