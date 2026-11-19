
import mongoose from 'mongoose';

const AssetUnitSchema = new mongoose.Schema({
  label: {
    type: String,
    required: true,
    trim: true
  },

  condition: {
    type: String,
    required: true,
    enum: ['good', 'fair', 'poor', 'damaged'],
    default: 'good'
  },

  status: {
    type: String,
    required: true,
    enum: ['active', 'inactive', 'disposed', 'under_maintenance'],
    default: 'active'
  },

  purchaseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Purchase'
  },

  receivingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PurchaseReceiving'
  },

  addedAt: {
    type: Date,
    default: Date.now
  },
}, { _id: true });

const AssetSchema = new mongoose.Schema({
  name: { type: String, required: true },

  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AssetCategory',
    required: true
  },

  units: {
    type: [AssetUnitSchema],
    default: []
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Companie'
  },
  measurement: {
    type: String,
    required: true
  }
}, { timestamps: true });

export default mongoose.models.Asset ||
  mongoose.model('Asset', AssetSchema);
