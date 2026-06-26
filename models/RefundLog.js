import mongoose from 'mongoose';

const refundLogSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Company'
  },
  salesOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  salesOrderNumber: {
    type: String,
    required: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  warehouseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: true
  },
  qty: {
    type: Number,
    required: true
  },
  refundAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['refunded', 'stored_back', 'resolved'],
    default: 'refunded'
  },
  storedBackQty: {
    type: Number,
    default: 0
  },
  exitedQty: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  storedBackAt: {
    type: Date,
    default: null
  },
  unitCost: {
    type: Number
  },
  createdByUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdByName: {
    type: String
  },
  approvedByUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedByName: {
    type: String
  }
});

// Delete the cached model to ensure Next.js HMR uses the updated schema with 'resolved' status
if (mongoose.models.RefundLog) {
  delete mongoose.models.RefundLog;
}
export default mongoose.model('RefundLog', refundLogSchema);
