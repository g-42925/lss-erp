import mongoose from 'mongoose';

const voucherCashSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Company'
  },
  type: {
    type: String,
    enum: ['in', 'out'],
    required: true
  },
  contactName: {
    type: String,
    required: true
  },
  voucherNumber: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    default: Date.now,
    required: true
  },
  items: [{
    description: {
      type: String,
      required: true
    },
    customerName: {
      type: String
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    refModel: {
      type: String,
      enum: ['Invoice', 'Cashflow', 'Purchase', 'Debt']
    },
    refId: {
      type: mongoose.Schema.Types.ObjectId
    },
    paymentHistoryId: {
      type: mongoose.Schema.Types.ObjectId
    }
  }],
  signatures: {
    dibukukanOleh: {
      name: String,
      date: Date
    },
    disetujuiOleh: {
      name: String,
      date: Date
    },
    dicekOleh: {
      name: String,
      date: Date
    },
    dibuatOleh: {
      name: String,
      date: Date
    }
  }
}, { timestamps: true });

// prevent Next.js HMR reload issues
if (mongoose.models.VoucherCash) {
  delete mongoose.models.VoucherCash;
}

export default mongoose.models.VoucherCash || mongoose.model('VoucherCash', voucherCashSchema);
