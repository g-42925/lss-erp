import mongoose from 'mongoose';

const PackagingSchema = new mongoose.Schema({
  name: { type: String, required: true },
  mainUnit: { type: String, required: true },
  qty: { type: Number, required: true },
  addedBy: { type: mongoose.Schema.Types.ObjectId, required: true },
});

export default mongoose.models.Packaging || mongoose.model('Packaging', PackagingSchema);
