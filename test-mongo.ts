const mongoose = require("mongoose");
const { ObjectId } = mongoose.Types;

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/lss-erp");
  const companyId = new ObjectId();
  const itemIds = [new ObjectId()];
  const startDate = new Date();
  const endDate = new Date();
  
  const InvLog = mongoose.connection.collection("invlogs");
  try {
    const agg = await InvLog.aggregate([
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
      },
    ]).toArray();
    console.log("SUCCESS", agg);
  } catch (e) {
    console.log("ERROR", e);
  }
  process.exit();
}
run();
