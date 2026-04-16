import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  invoiceType: {
    type: String,
    required: true
  },
  invoiceNumber: {
    type: String,
    required: true
  },
  salesOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  salesOrderNumber: {
    type: String,
    required: true
  },
  payAmount: {
    type: Number,
    required: true,
    min: 0
  },
  missing: {
    type: Number,
    required: false,
    min: 0
  },
  paid: {
    type: Boolean,
    default: false,
    required: true,
  },
  date: {
    type: Date,
    required: true
  },
  paymentHistory: {
    type: [{
      amount: { type: Number, required: true },
      method: { type: String, required: true },
      date: { type: Date, required: true }
    }],
    default: []
  }
});

export default mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema)