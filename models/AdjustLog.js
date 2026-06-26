import mongoose from 'mongoose';

const adjustLogSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Companie',
    required: false
  },
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
  qty: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    enum: ['SHRINKAGE', 'DAMAGE', 'EXPIRED', 'OTHER'],
    required: true
  },
  note: {
    type: String,
    required: false
  },
  outboundLogId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'OutboundLog',
    required: false
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  originalQty: {
    type: Number,
    required: false
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'EDITED', 'STORED_BACK'],
    default: 'ACTIVE'
  },
  lastEditApprovedByName: {
    type: String,
    required: false
  },
  lastEditAt: {
    type: Date,
    required: false
  },
  storedBackQty: {
    type: Number,
    default: 0
  },
  storedBackAt: {
    type: Date,
    required: false
  },
  storeBackApprovedByName: {
    type: String,
    required: false
  },
});

// Clear cached model so Next.js HMR picks up schema changes
if (mongoose.models.AdjustLog) {
  delete mongoose.models.AdjustLog;
}
export default mongoose.model('AdjustLog', adjustLogSchema);
