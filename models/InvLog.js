import mongoose from 'mongoose';

/**
 * InvLog — Inventory Procurement Log
 * Records all stock procurement events for internal items.
 *
 * Finance approval flow:
 *   created → finance_status: "pending"
 *   approved → finance_status: "approved", approved_at set
 *   rejected → finance_status: "rejected", approved_at set
 *
 * Goods receiving flow (only after approved):
 *   received → received_status: true, received_at set, product stock incremented
 *   Idempotency: received_status prevents double-receive at the service level.
 */
const InvLogSchema = new mongoose.Schema(
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
    logNumber: {
      type: String,
      required: true,
      unique: true,
    },
    qty: {
      type: Number,
      required: true,
      min: 1,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    /**
     * Stored (not just computed) for audit trail integrity.
     * Always equals qty * unitPrice — set at creation time.
     */
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    note: {
      type: String,
      required: false,
      trim: true,
      default: '',
    },
    finance_status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      required: true,
    },
    /**
     * Idempotency guard — prevent double stock updates.
     * Only set to true once, when goods are physically received.
     */
    received_status: {
      type: Boolean,
      default: false,
      required: true,
    },
    approved_at: {
      type: Date,
      required: false,
      default: null,
    },
    received_at: {
      type: Date,
      required: false,
      default: null,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

export default mongoose.models.InvLog || mongoose.model('InvLog', InvLogSchema);
