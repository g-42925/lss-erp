import mongoose from 'mongoose';

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
  productId: { type: mongoose.Schema.Types.ObjectId, required: false },
  vendorId: { type: mongoose.Schema.Types.ObjectId, required: false },
  supplierId: { type: mongoose.Schema.Types.ObjectId, required: false },
  purchaseType: { type: String, required: true, enum: ['product', 'payment', 'procurement'] },
  quantity: { type: Number, required: false },
  estimatedPrice: { type: Number, required: true },
  date: { type: Date, Default: Date.now },
  finalPrice: { type: Number, required: false },
  receivedQty: { type: Number, default: 0 },
  payAmount: { type: Number, Default: false },
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
});

// Cek apakah model sudah ada (Next.js hot reload bisa bikin error)
export default mongoose.models.Purchase || mongoose.model('Purchase', PurchaseSchema);