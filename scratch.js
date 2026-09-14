import mongoose from "mongoose";
import Invoice from "./models/Invoice.js";
import ServiceOrder from "./models/ServiceOrder.js";

async function run() {
  await mongoose.connect("mongodb+srv://new-user-31:Yntktsx1@cluster0.qwxmz.mongodb.net/erp");

  const invoices = await Invoice.find({
    handledBy: { $exists: true, $ne: 'internal' },
    void: { $ne: true }
  }).select('_id date salesOrderId invoiceNumber handledBy').lean();

  const soId = invoices[0].salesOrderId;
  const so = await ServiceOrder.findById(soId).select('date invoiceNumber salesOrderNumber');
  
  console.log("Invoice date:", invoices[0].date);
  console.log("SO date:", so.date);

  mongoose.disconnect();
}
run();
