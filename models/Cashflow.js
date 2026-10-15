import mongoose from 'mongoose';

const cashflowSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Company'
  },
  bankAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BankAccount',
    required: false
  },
  accountType: {
    type: String,
    enum: ['Cash', 'Bank'],
    required: true,
    default: 'Cash'
  },
  type: {
    type: String,
    enum: ['in', 'out', 'initial'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  reference: {
    type: String,
    required: false
  },
  date: {
    type: Date,
    default: Date.now
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  from: {
    type: String,
    required: false
  },
  to: {
    type: String,
    required: false
  },
  voucherId: {
    type: mongoose.Schema.Types.ObjectId
  },
  cashVoucherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VoucherCash'
  },
  bankVoucherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VoucherBank'
  },
  time: {
    type: String,
    match: /^([01]\d|2[0-3]):[0-5]\d$/,
    default: () => new Date().toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta'
    })
  },
  source: {
    type: String,
    enum: ['manual', 'purchase_payment'],
    default: 'manual',
    required: false
  }

}, { timestamps: true });

// prevent Next.js HMR reload issues
if (mongoose.models.Cashflow) {
  delete mongoose.models.Cashflow;
}

export default mongoose.models.Cashflow || mongoose.model('Cashflow', cashflowSchema);
