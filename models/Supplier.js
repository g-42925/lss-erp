import mongoose from 'mongoose';

const SupplierSchema = new mongoose.Schema({
  contactId: {type:String,required:true},
  vendorId:{type:String,required:true},
  bussinessName:{type:String,required:true},
  name:{type:String,required:true},
  email:{type:String,required:true},
  taxNumber:{type:String,required:true},
  creditLimit:{type:Number,required:true},
  payTerm:{type:String,required:true},
  openingBalance:{type:Number,required:true},
  advanceBalance:{type:Number,required:true},
  addedOn:{type:Date,required:true},
  address:{type:String,required:true},
  mobile:{type:String,required:true},
  supplierOf:{type:mongoose.Schema.Types.ObjectId, required:true}
});



// Cek apakah model sudah ada (Next.js hot reload bisa bikin error)
export default mongoose.models.Supplier || mongoose.model('Supplier', SupplierSchema);