import mongoose from 'mongoose';

const exitLogSchema = new mongoose.Schema({
  // Company reference for multi-tenant filtering
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Companie',
    required: false  // optional for backward compat with old records
  },
  // Warehouse (preferred over locationId for new records)
  warehouseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: false
  },
  // Legacy field — kept for backward compatibility
  locationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    required: false
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  batchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batche',
    required: false
  },
  qty: {
    type: Number,
    required: true
  },
  originalQty: {
    type: Number,
    required: false   // set on first edit, to preserve the original value
  },
  reason: {
    type: String,
    enum: ['BROKEN', 'EXPIRED', 'LOST', 'OTHER'],
    required: true
  },
  note: {
    type: String,
    required: false
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'EDITED', 'STORED_BACK'],
    default: 'ACTIVE'
  },

  // Audit — who created
  createdByUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  createdByName: {
    type: String,
    required: false
  },

  // Audit — who approved initially
  approvedByUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  approvedByName: {
    type: String,
    required: false
  },

  // Audit — last edit approval
  lastEditApprovedByName: {
    type: String,
    required: false
  },
  lastEditAt: {
    type: Date,
    required: false
  },

  // Store back tracking
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

  date: {
    type: Date,
    default: Date.now
  },
});

// Clear cached model so Next.js HMR picks up schema changes
if (mongoose.models.ExitLog) {
  delete mongoose.models.ExitLog;
}
export default mongoose.model('ExitLog', exitLogSchema);
