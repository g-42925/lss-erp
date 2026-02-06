import mongoose from 'mongoose';
import { type } from 'os';

const ProductSchema = new mongoose.Schema({
  productName:{type:String,required:true},
  productId:{type:String,required:true},
  barcodeType:{type:String,required:false},
  category:{type:String,required:true},
  description:{type:String,required:true},
  image:{type:String,required:true},
  unit:{type:String,required:false},
  altUnit:{type:String,required:false},
  applicableTax:{type:String,required:true},
  sellingPriceTaxType:{type:String,required:false},
  productType:{type:String,required:true,enum:["service","good"]},
  sellingPrice:{type:Number,required:true},
  productOf:{type:mongoose.Schema.Types.ObjectId, required:true},
});



// Cek apakah model sudah ada (Next.js hot reload bisa bikin error)
export default mongoose.models.Product || mongoose.model('Product', ProductSchema);