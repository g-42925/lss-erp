import mongoose from 'mongoose';

/**
 * PurchaseReturn — Retur Pembelian ke Supplier
 *
 * Flow:
 *   Staff buat return  → status: 'draft'
 *   Finance approve    → status: 'approved', stok batch dikurangi, stockValue produk dikurangi
 *   Finance reject     → status: 'rejected'
 *
 * Catatan: tidak ada debit memo dan tidak ada penyesuaian hutang pada alur ini.
 */
const PurchaseReturnSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Companie'
  },
  returnNumber: {
    type: String,
    required: true,
    unique: true
  },
  purchaseId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Purchase'
  },
  purchaseOrderNumber: {
    type: String,
    required: true
  },
  batchId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Batche'
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Product'
  },
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false,
    ref: 'Supplier'
  },
  returnQty: {
    type: Number,
    required: true,
    min: 1
  },
  /** Nilai retur = returnQty × unitCost dari PO */
  returnAmount: {
    type: Number,
    required: true,
    min: 0
  },
  reason: {
    type: String,
    required: true,
    enum: ['defective', 'wrong_item', 'excess_qty', 'other']
  },
  reasonNote: {
    type: String,
    required: false,
    default: ''
  },
  status: {
    type: String,
    required: true,
    enum: ['draft', 'approved', 'rejected'],
    default: 'draft'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    required: false,
    ref: 'User'
  },
  approvedAt: {
    type: Date,
    required: false,
    default: null
  },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    required: false,
    ref: 'User'
  },
  rejectedAt: {
    type: Date,
    required: false,
    default: null
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

export default mongoose.models.PurchaseReturn
  || mongoose.model('PurchaseReturn', PurchaseReturnSchema);
