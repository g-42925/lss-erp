const mongoose = require('mongoose');
const { connectToDatabase } = require('./lib/mongodb');
const Assignment = require('./models/Assignment').default || require('./models/Assignment');

async function main() {
  await connectToDatabase();
  const a = await Assignment.find({ roleId: '6a4b7666e97fa84c37c75a63' }).lean();
  console.log("Assignments:", JSON.stringify(a, null, 2));
  process.exit(0);
}
main().catch(console.error);
