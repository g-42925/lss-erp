import mongoose from 'mongoose';

const TaxSchema = new mongoose.Schema({
  name: { type: String, required: true },
  value: { type: Number, required: true },
  addedBy: { type: mongoose.Schema.Types.ObjectId, required: true },
});

export default mongoose.models.Tax || mongoose.model('Tax', TaxSchema);
