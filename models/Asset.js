import mongoose from 'mongoose';

const AssetSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'AssetCategory', required: true },
  addedAt: { type: Date, required: true, default: Date.now },
  condition: { type: String, required: true, enum: ['good', 'fair', 'poor', 'damaged'] },
  status: { type: String, required: true, enum: ['active', 'inactive', 'disposed', 'under_maintenance'] },
  desc: { type: String, required: false },

  companyId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Companie' },
}, { timestamps: true });

export default mongoose.models.Asset || mongoose.model('Asset', AssetSchema);
