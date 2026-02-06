import mongoose from 'mongoose';

const UnitSchema = new mongoose.Schema({
  name: { type: String, required: true },
  shortName: { type: String, required:true },
  allowDecimal: { type: String, required:true },
  addedBy: { type: mongoose.Schema.Types.ObjectId, required:true },
});

// Cek apakah model sudah ada (Next.js hot reload bisa bikin error)
export default mongoose.models.UnitSchema || mongoose.model('Unit', UnitSchema)