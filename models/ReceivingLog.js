import mongoose from 'mongoose';

const receivingLogSchema = new mongoose.Schema({
  warehouseId: { type: mongoose.Schema.Types.ObjectId, required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, required: true },
  date: { type: Date, required: true },
  qty: { type: Number, required: true },
});


// Cek apakah model sudah ada (Next.js hot reload bisa bikin error)
export default mongoose.models.ReceivingLog || mongoose.model('ReceivingLog', receivingLogSchema)