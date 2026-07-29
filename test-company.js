const mongoose = require('mongoose');
const { connectToDatabase } = require('./lib/mongodb');
const Companie = require('./models/Companie').default || require('./models/Companie');

async function main() {
  await connectToDatabase();
  const c = await Companie.findOne({ masterAccountId: '312e53a1-6d40-4331-99cf-6353c30be420' }).lean();
  console.log("Company:", JSON.stringify(c, null, 2));
  process.exit(0);
}
main().catch(console.error);
