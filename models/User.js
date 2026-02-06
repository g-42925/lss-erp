import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  username: {type:String,required:true},
  email: { type: String, required: true },
  password: { type: String, required:true },
  name: { type:String, required:true },
  isSuperAdmin: { type:Boolean, required:true},
  roleName: { type:String, required:true },
  masterAccountId: {type:String, required:true},
  roleId:{type:mongoose.Types.ObjectId,required:true}
});

// Cek apakah model sudah ada (Next.js hot reload bisa bikin error)
export default mongoose.models.User || mongoose.model('User', UserSchema);