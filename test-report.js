require("dotenv").config({ path: ".env.local" });
const mongoose = require("mongoose");
const Companie = require("./models/Companie.js").default;
const InvItem = require("./models/InvItem.js").default;
const InvLog = require("./models/InvLog.js").default;
const InvUsage = require("./models/InvUsage.js").default;

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/lss-erp");
  const comp = await Companie.findOne();
  if(!comp) { console.log("No DB companies"); process.exit(0); }
  
  const companyId = comp._id;
  const items = await InvItem.find({ companyId }).lean();
  console.log("Total items", items.length);

  const startDate = new Date("2024-01-01");
  const endDate = new Date("2026-12-31");

  const itemIds = items.map((i) => i._id);
  const inboundAgg = await InvLog.aggregate([
    {
      $match: {
        companyId,
        itemId: { $in: itemIds },
        received_status: true,
        received_at: { $ne: null },
      },
    },
    {
      $group: {
        _id: '$itemId',
        totalReceivedOnOrAfterStart: {
          $sum: {
            $cond: [{ $gte: ['$received_at', startDate] }, '$qty', 0],
          },
        },
        inboundInRange: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $gte: ['$received_at', startDate] },
                  { $lte: ['$received_at', endDate] },
                ],
              },
              '$qty',
              0,
            ],
          },
        },
      },
    }
  ]);
  console.log("inboundAgg", inboundAgg);

  const outboundAgg = await InvUsage.aggregate([
    {
      $match: {
        companyId,
        itemId: { $in: itemIds },
      },
    },
    {
      $group: {
        _id: '$itemId',
        totalUsedOnOrAfterStart: {
          $sum: {
            $cond: [{ $gte: ['$usage_at', startDate] }, '$qty', 0],
          },
        },
        outboundInRange: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $gte: ['$usage_at', startDate] },
                  { $lte: ['$usage_at', endDate] },
                ],
              },
              '$qty',
              0,
            ],
          },
        },
      },
    },
  ]);
  console.log("outboundAgg", outboundAgg);
  
  console.log("currentStock 0:", items[0]?.currentStock);

  process.exit();
}
run();
