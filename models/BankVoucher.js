import mongoose from 'mongoose';

const bankVoucherItemSchema = new mongoose.Schema({
  no: { type: Number, required: true },
  keterangan: { type: String, default: '' },
  customer: { type: String, default: '' },
  jumlah: { type: Number, required: true, default: 0 },
});

const bankVoucherSchema = new mongoose.Schema(
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
    bankAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BankAccount',
      required: false,
    },
    dibayarDiterima: { type: String, default: '' },
    noRekening: { type: String, default: '' },
    date: { type: Date, required: true },
    items: [bankVoucherItemSchema],
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

export default mongoose.models.BankVoucher ||
  mongoose.model('BankVoucher', bankVoucherSchema);
