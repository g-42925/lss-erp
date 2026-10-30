import mongoose from 'mongoose';

/**
 * GoodsQuotation — Quotation untuk penjualan barang (product/goods).
 * Berbeda dengan Quotation yang digunakan untuk layanan/jasa (service).
 * Setiap GoodsQuotation memiliki satu atau lebih item barang dari katalog.
 */
const GoodsQuotationSchema = new mongoose.Schema(
  {
    quotationNumber: { type: String, required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, required: true },

    // Customer — bisa dari database atau custom (manual entry)
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: false,
    },
    customCustomer: {
      name: { type: String, default: '' },
      address: { type: String, default: '' },
      phone: { type: String, default: '' },
      email: { type: String, default: '' },
    },

    // Tanggal quotation dan tanggal kadaluarsa
    date: { type: Date, required: true },
    validUntil: { type: Date, required: false },

    // Item-item barang dalam quotation
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        catalogId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'SalesCatalog',
          required: false,
        },
        productName: { type: String, required: true },
        variantName: { type: String, default: '' },
        qty: { type: Number, required: true, default: 1 },
        unit: { type: String, default: 'pcs' },
        unitPrice: { type: Number, required: true, default: 0 },
        discountType: {
          type: String,
          enum: ['percent', 'fixed', 'none'],
          default: 'none',
        },
        discountValue: { type: Number, default: 0 },
        applicableTax: { type: String, default: 'none' },
        taxType: { type: String, default: 'inclusive' },
        subTotal: { type: Number, required: true, default: 0 },
      },
    ],

    // Diskon global quotation
    discountType: {
      type: String,
      enum: ['percent', 'fixed', 'none'],
      default: 'none',
    },
    discountValue: { type: Number, default: 0 },

    // Totals
    subtotal: { type: Number, default: 0 },
    totalDiscount: { type: Number, default: 0 },
    totalTax: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },

    // Catatan
    note: { type: String, default: '' },
    termsConditions: { type: String, default: '' },

    // Status & lifecycle
    status: {
      type: String,
      enum: ['draft', 'sent', 'accepted', 'rejected', 'expired'],
      default: 'draft',
    },
    locked: { type: Boolean, default: false },

    // Referensi ke Sales Order (jika sudah dikonversi)
    salesOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: false,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
  },
  { timestamps: true }
);

export default mongoose.models.GoodsQuotation ||
  mongoose.model('GoodsQuotation', GoodsQuotationSchema);
