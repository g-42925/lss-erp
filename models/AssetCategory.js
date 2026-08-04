import mongoose from 'mongoose';

const AssetCategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Companie' },
}, { timestamps: true });

export default mongoose.models.AssetCategory || mongoose.model('AssetCategory', AssetCategorySchema);
