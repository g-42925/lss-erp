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
    enum: ['refunded', 'stored_back'],
    default: 'refunded'
  },
  storedBackQty: {
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
  }
});

export default mongoose.models.RefundLog || mongoose.model('RefundLog', refundLogSchema);
