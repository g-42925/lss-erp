import mongoose from 'mongoose';

const reservationSchema = new mongoose.Schema({
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batche', required: true },
  salesOrderNumber: { type: String, required: true },
  salesOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: false },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: false },
  qty: { type: Number, required: true },
  pickupDate: { type: Date, required: false },
  status: { type: String, enum: ['ACTIVE', 'FULFILLED', 'CANCELLED', 'IMMEDIATE'], default: 'ACTIVE' },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Reservation || mongoose.model('Reservation', reservationSchema);