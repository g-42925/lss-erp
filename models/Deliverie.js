import mongoose from 'mongoose';
import { type } from 'os';

const deliverySchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  salesOrderNumber: {
    type: String,
    required: true
  },
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, required: true },
      qty: { type: Number, required: true },
      batchNumber: { type: String, required: true },
      locationId: { type: mongoose.Schema.Types.ObjectId, required: true }
    }
  ],
  date: {
    type: Date,
    default: Date.now
  },
  deliveryNumber: {
    type: String,
    required: true
  }
});

// Cek apakah model sudah ada (Next.js hot reload bisa bikin error)
export default mongoose.models.Delivery || mongoose.model('Delivery', deliverySchema)