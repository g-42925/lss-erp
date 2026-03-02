import mongoose from 'mongoose';

const SupplierSchema = new mongoose.Schema({
  bussinessName:{type:String,required:true},
  name:{type:String,required:false},
  email:{type:String,required:true},
  taxNumber:{type:String,required:true},
  addedOn:{type:Date,required:true},
  address:{type:String,required:true},
  mobile:{type:String,required:true},
  supplierOf:{type:mongoose.Schema.Types.ObjectId, required:true}
});



// Cek apakah model sudah ada (Next.js hot reload bisa bikin error)
export default mongoose.models.Supplier || mongoose.model('Supplier', SupplierSchema);