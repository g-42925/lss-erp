const mongoose = require('mongoose');
const { connectToDatabase } = require('./lib/mongodb');
const User = require('./models/User').default || require('./models/User');
const CryptoJS = require('crypto-js');

async function main() {
  await connectToDatabase();
  
  // Use the exact hash in DB
  const r1 = await User.findOne({ email: 'nazlyy@gmail.com' }).lean();
  console.log("User by email:", !!r1);
  if(r1) console.log("DB Password Hash:", r1.password);
  
  const originalPassword = '123'; // Guessing
  const pwd = CryptoJS.MD5(originalPassword);
  console.log("Test Hash 123:", pwd.toString());
  
  const testHash2 = CryptoJS.MD5('password').toString();
  console.log("Test Hash password:", testHash2);
  
  process.exit(0);
}
main().catch(console.error);
