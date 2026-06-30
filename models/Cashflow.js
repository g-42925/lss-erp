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
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  }
}, { timestamps: true });

// prevent Next.js HMR reload issues
if (mongoose.models.Cashflow) {
  delete mongoose.models.Cashflow;
}

export default mongoose.models.Cashflow || mongoose.model('Cashflow', cashflowSchema);
