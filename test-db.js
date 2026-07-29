const mongoose = require('mongoose');
const { connectToDatabase } = require('./lib/mongodb');
const User = require('./models/User').default || require('./models/User');

async function main() {
  await connectToDatabase();
  const users = await User.find({ isSuperAdmin: false }).limit(2).lean();
  console.log("Non-superadmin users:", JSON.stringify(users, null, 2));
  process.exit(0);
}
main().catch(console.error);
