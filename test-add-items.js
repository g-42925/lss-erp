require("dotenv").config();
const mongoose = require("mongoose");
async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Companie = require("./models/Companie.js").default;
  const comp = await Companie.findOne();

  const InvItem = require("./models/InvItem.js").default;
  const InvLog = require("./models/InvLog.js").default;
  const InvUsage = require("./models/InvUsage.js").default;
  
  if (comp) {
    const item = await InvItem.create({
      companyId: comp._id,
      name: "Test Item",
      unit: "pcs",
      itemCode: "ITEM-001",
      currentStock: 10
    });
    console.log("Added item", item._id);

    await InvLog.create({
      companyId: comp._id,
      itemId: item._id,
      logNumber: "LOG-001",
      qty: 15,
      unitPrice: 10,
      totalPrice: 150,
      finance_status: "approved",
      received_status: true,
      received_at: new Date("2024-05-15")
    });
    console.log("Added log");
    
    await InvUsage.create({
      companyId: comp._id,
      itemId: item._id,
      usageNumber: "USE-001",
      qty: 5,
      usage_at: new Date("2024-05-20")
    });
    console.log("Added usage");
  }

  process.exit(0);
}
run();
