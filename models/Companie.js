import mongoose from 'mongoose';

const CompanieSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required:true },
  email: { type: String, required:true },
  logo: { type:String, required:true },
  address: { type:String, required:true },
  masterAccountId: { type:String, required:true}
});

// Cek apakah model sudah ada (Next.js hot reload bisa bikin error)
export default mongoose.models.Companie || mongoose.model('Companie', CompanieSchema)