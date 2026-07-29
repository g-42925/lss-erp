const mongoose = require('mongoose');
const { connectToDatabase } = require('./lib/mongodb');
const User = require('./models/User').default || require('./models/User');
const Companie = require('./models/Companie').default || require('./models/Companie');
const Assignment = require('./models/Assignment').default || require('./models/Assignment');
const CryptoJS = require('crypto-js');

async function main() {
  await connectToDatabase();

  const email = 'nazlyy@gmail.com';
  const pwdStr = CryptoJS.MD5('123').toString();
  await User.updateOne({ email }, { password: pwdStr });
  
  const r = await User.findOne({ email, password: pwdStr });
  if (!r) {
     console.log("no account found");
     process.exit(0);
  }
  
  const company = await Companie.findOne({ masterAccountId: r.masterAccountId });
  console.log("company found:", !!company);
  
  const _pages = {};
  if (!r.isSuperAdmin) {
    const pages = await Assignment.find({ roleId: r.roleId });
    pages.forEach((page) => {
      _pages[page.link] = page.permissions || ['view']
    });
  }
  
  const result = {
    ...r._doc,
    pages: _pages,
    company: company
  };
  
  console.log("Login result:", JSON.stringify(result, null, 2));
  
  process.exit(0);
}
main().catch(console.error);
