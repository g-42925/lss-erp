import mongoose from 'mongoose';

/**
 * InvUsage — Inventory Usage Log
 * Records when an internal item is used/consumed.
 * Each entry results in an atomic decrement of InvItem.currentStock.
 */
const InvUsageSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InvItem',
      required: true,
    },
    usageNumber: {
      type: String,
      required: true,
      unique: true,
    },
    qty: {
      type: Number,
      required: true,
      min: 1,
    },
    note: {
      type: String,
      required: false,
      trim: true,
      default: '',
    },
    usage_at: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

export default mongoose.models.InvUsage || mongoose.model('InvUsage', InvUsageSchema);
