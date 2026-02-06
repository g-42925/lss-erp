import mongoose from 'mongoose';

const RoleSchema = new mongoose.Schema({
  companyId: {type:mongoose.Schema.Types.ObjectId, required:true},
  page:{type:String,required:true},
  permission:{type:String,required:true},
  name:{type:String, required:true}
});

// Cek apakah model sudah ada (Next.js hot reload bisa bikin error)
export default mongoose.models.Role || mongoose.model('Role', RoleSchema);