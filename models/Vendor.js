import mongoose from 'mongoose';

const vendorSchema = new mongoose.Schema({
  vendorId:{type:String,required:true},
  name:{type:String,required:true},
  email:{type:String,required:true},
  address:{type:String,required:true},
  mobile:{type:String,required:true},
  vendorOf:{type:mongoose.Schema.Types.ObjectId, required:true}
});



// Cek apakah model sudah ada (Next.js hot reload bisa bikin error)
export default mongoose.models.Vendor || mongoose.model('Vendor', vendorSchema);