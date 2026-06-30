import mongoose from 'mongoose';

const outboundLogSchema = new mongoose.Schema({
  warehouseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  referenceNumber: {
    type: String,
    required: false
  }
});

export default mongoose.models.OutboundLog || mongoose.model('OutboundLog', outboundLogSchema)
