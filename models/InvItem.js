import mongoose from 'mongoose';

/**
 * InvItem — Internal Item Master
 * Tracks consumable / internal-use items (office supplies, maintenance goods, etc.)
 * NOT for selling. Price does NOT belong here — it belongs in InvLog (per transaction).
 *
 * currentStock is SYSTEM-MANAGED only. It must never be edited directly.
 * Stock is incremented atomically when goods are physically received (received_status → true).
 */
const InvItemSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    unit: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: false,
      trim: true,
      default: '',
    },
    /**
     * System-managed. Only modified via the receive-goods flow.
     * Use $inc for atomic increments to handle concurrency safely.
     */
    currentStock: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    itemCode: {
      type: String,
      required: true,
      unique: true,
    },
  },
  {
    timestamps: true, // adds createdAt & updatedAt
  }
);

export default mongoose.models.InvItem || mongoose.model('InvItem', InvItemSchema);
