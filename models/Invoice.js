import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },

  serviceDiscount: {
    discountType: String,
    discountValue: Number
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
    type: mongoose.Schema.Types.ObjectId
  },

  salesOrderNumber: String,

  payAmount: {
    type: Number,
    required: true,
    min: 0
  },

  missing: {
    type: Number,
    min: 0
  },

  refundCredit: {
    type: Number,
    default: 0
  },

  paid: {
    type: Boolean,
    default: false,
    required: true
  },

  date: {
    type: Date,
    required: true
  },

  paymentHistory: {
    type: [{
      amount: {
        type: Number,
        required: true
      },
      method: {
        type: String,
        required: true
      },
      date: {
        type: Date,
        required: true
      },
      reverted: {
        type: Boolean,
        default: false
      },
      voucherId: {
        type: mongoose.Schema.Types.ObjectId
      }
    }],
    default: []
  },

  status: {
    type: String,
    enum: ["active", "draft"],
    default: "draft"
  },

  unavailableList: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    qty: {
      type: Number,
      required: true
    }
  }],

  pphDeduction: {
    type: Number,
    default: 0
  },

  unavailable: {
    type: Number,
    min: 0
  },

  void: {
    type: Boolean,
    default: false
  },

  vendorPaid: {
    type: Number,
    default: 0
  },

  bankVoucherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BankVoucher'
  },
  cashVoucherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CashVoucher'
  },

  price: Number,

  qty: Number,

  taxes: {
    type: Array,
    default: []
  },
  debt: {
    type: Number,
    default: 0
  },
  handledBy: {
    type: String,
    enum: ["internal", "vendor"],
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  description: {
    type: String
  },
  vendorInvoiceNumber: {
    type: String,
    required: false
  }
});

export default mongoose.models.Invoice || mongoose.model("Invoice", invoiceSchema);