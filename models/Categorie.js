import mongoose from 'mongoose';

const CategorieSchema = new mongoose.Schema({
  name: { type: String, required: true },
  categoryCode: { type: String, required:true },
  description: { type: String, required:true },
  addedBy: { type: mongoose.Schema.Types.ObjectId, required:true },
});

// Cek apakah model sudah ada (Next.js hot reload bisa bikin error)
export default mongoose.models.Categorie || mongoose.model('Categorie', CategorieSchema)