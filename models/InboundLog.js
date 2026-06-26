import mongoose from 'mongoose';

const inboundLogSchema = new mongoose.Schema({
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
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  // Source tracking
  sourceType: {
    type: String,
    enum: ['PURCHASE', 'STORE_BACK', 'OTHER'],
    default: 'OTHER'
  },
  sourceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false   // references ExitLog._id when sourceType = STORE_BACK
  },
  approvedByName: {
    type: String,
    required: false
  },
  note: {
    type: String,
    required: false
  }
});

if (mongoose.models.InboundLog) {
  delete mongoose.models.InboundLog;
}
export default mongoose.model('InboundLog', inboundLogSchema);
