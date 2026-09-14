import mongoose from 'mongoose';

const cashVoucherItemSchema = new mongoose.Schema({
  no: { type: Number, required: true },
  keterangan: { type: String, default: '' },
  customer: { type: String, default: '' },
  jumlah: { type: Number, required: true, default: 0 },
});

const cashVoucherSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Companie',
      required: true,
    },
    voucherNumber: { type: String, required: true },
    voucherType: {
      type: String,
      enum: ['masuk', 'keluar'],
      required: true,
    },
    dibayarDiterima: { type: String, default: '' },
    date: { type: Date, required: true },
    items: [cashVoucherItemSchema],
    total: { type: Number, required: true, default: 0 },
    terbilang: { type: String, default: '' },
    status: {
      type: String,
      enum: ['draft', 'saved'],
      default: 'saved',
    }
  },
  { timestamps: true }
);

export default mongoose.models.CashVoucher ||
  mongoose.model('CashVoucher', cashVoucherSchema);
