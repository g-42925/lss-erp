import mongoose from 'mongoose';

const TaxSchema = new mongoose.Schema({
  name: { type: String, required: true },
  value: { type: Number, required: true },
  isPPh: { type: Boolean, default: false },
  addedBy: { type: mongoose.Schema.Types.ObjectId, required: true },
  isLiability: { type: Boolean, default: false },
});

export default mongoose.models.Tax || mongoose.model('Tax', TaxSchema);
