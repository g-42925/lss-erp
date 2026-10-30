import mongoose from 'mongoose';

const PurchaseItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, required: true },
  quantity: { type: Number, required: true },
  finalPrice: { type: Number, required: false, default: 0 },
  note: { type: String, required: false },
}, { _id: false });

const PurchaseSchema = new mongoose.Schema({
  description: { type: String, required: false },
  purchaseOrderNumber: { type: String, required: true },
  measurementId: { type: mongoose.Schema.Types.ObjectId, required: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, required: true },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, required: false },
  approvedAt: { type: Date, required: false },
  voidedBy: { type: mongoose.Schema.Types.ObjectId, required: false },
  voidApproveBy: { type: mongoose.Schema.Types.ObjectId, required: false },
  voidedAt: { type: Date, required: false },
  companyId: { type: mongoose.Schema.Types.ObjectId, required: true },
  // ── legacy single-item fields (backward compat) ──────────────────────────
  productId: { type: mongoose.Schema.Types.ObjectId, required: false },
  quantity: { type: Number, required: false },
  // ── multi-item support ────────────────────────────────────────────────────
  items: { type: [PurchaseItemSchema], required: false, default: undefined },
  // ─────────────────────────────────────────────────────────────────────────
  vendorId: { type: mongoose.Schema.Types.ObjectId, required: false },
  supplierId: { type: mongoose.Schema.Types.ObjectId, required: false },
  customSupplier: { type: String, required: false },
  purchaseType: { type: String, required: true, enum: ['product', 'payment', 'procurement', 'service'] },
  estimatedPrice: { type: Number, required: false },
  date: { type: Date, Default: Date.now },
  finalPrice: { type: Number },
  receivedQty: { type: Number, default: 0 },
  payAmount: { type: Number, Default: false },
  shippingCost: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  appliedTaxes: [{
    taxId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tax' },
    name: String,
    rate: Number,
    isPPh: Boolean,
    amount: Number
  }],
  grossFinalPrice: { type: Number, required: false },
  editable: { type: Boolean, required: true },
  unitCost: { type: Number, required: false },
  status: {
    type: String,
    enum: [
      'requested',
      'approved',
      'ordered',
      'completed',
      'rejected'
    ]
  },
  priceAlert: {
    type: {
      previousPrice: { type: Number },
      currentPrice: { type: Number },
      priceDiff: { type: Number },
      priceDiffPct: { type: Number },
    },
    required: false,
    default: undefined,
  },
  nonCashDst: {
    accountNumber: String,
    description: String
  }
});

// Cek apakah model sudah ada (Next.js hot reload bisa bikin error)
export default mongoose.models.Purchase || mongoose.model('Purchase', PurchaseSchema);