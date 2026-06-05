require("dotenv").config();
const mongoose = require("mongoose");
async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Companie = require("./models/Companie.js").default;
  const comp = await Companie.findOne();
  console.log(comp.masterAccountId);
  process.exit(0);
}
run();
