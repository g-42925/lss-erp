import mongoose from 'mongoose';

const exitLogSchema = new mongoose.Schema({
  locationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    required: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  batchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batche',
    required: false
  },
  qty: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    enum: ['BROKEN', 'EXPIRED', 'LOST', 'OTHER'],
    required: true
  },
  note: {
    type: String,
    required: false
  },
  date: {
    type: Date,
    default: Date.now
  },
});

export default mongoose.models.ExitLog || mongoose.model('ExitLog', exitLogSchema)
