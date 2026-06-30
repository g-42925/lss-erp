import mongoose from 'mongoose';
import { type } from 'os';

const deliverySchema = new mongoose.Schema({
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    required: false
  },
  editedBy: {
    type: mongoose.Schema.Types.ObjectId,
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
  },
  editedAt: {
    type: Date,
  },
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
  },
  editable: {
    type: Boolean,
    default: true
  },
  void: {
    type: Boolean,
    default: false
  }
});

// Cek apakah model sudah ada (Next.js hot reload bisa bikin error)
export default mongoose.models.Delivery || mongoose.model('Delivery', deliverySchema)