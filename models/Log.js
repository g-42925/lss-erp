import mongoose from 'mongoose';

const logSchema = new mongoose.Schema({
  paymentNumber: {
    type: String,
    required: true
  },
  purchaseId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  amount: {
    type: Number,
    required: false,
    default: 0
  },
  initial: {
    type: Boolean,
    required: true
  },
  type: {
    type: String,
    enum: ['payment', 'adjustment'],
    required: true
  },
  reference: {
    type: String,
    required: false
  },
  paymentMethod: {
    type: String,
    required: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  editedAt: {
    type: Date,
    required: false
  },
  editedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  editApprovedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  from: {
    name: {
      type: String,
      required: false
    }
  },
  to: {
    name: {
      type: String,
      required: false
    }
  }
});



// Cek apakah model sudah ada (Next.js hot reload bisa bikin error)
export default mongoose.models.Log || mongoose.model('Log', logSchema)