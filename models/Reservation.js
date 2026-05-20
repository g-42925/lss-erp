import mongoose from 'mongoose';

const reservationSchema = new mongoose.Schema({
  batchId: { type: mongoose.Schema.Types.ObjectId, required: true },
  salesOrderNumber: { type: String, required: true },
  qty: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});


export default mongoose.models.Reservation || mongoose.model('Reservation', reservationSchema)