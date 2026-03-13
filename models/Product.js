import mongoose from 'mongoose';
import { type } from 'os';

const ProductSchema = new mongoose.Schema({
  stockValue:{type:Number,required:false},
  unitCostStock:{type:Number,required:false},
  productName:{type:String,required:true},
  productId:{type:String,required:true},
  barcodeType:{type:String,required:false},
  category:{type:String,required:true},
  description:{type:String,required:true},
  image:{type:String,required:true},
  applicableTax:{type:String,required:true},
  sellingPriceTaxType:{type:String,required:false},
  productType:{type:String,required:true,enum:["service","good"]},
  sellingPrice:{type:Number,required:true},
  productOf:{type:mongoose.Schema.Types.ObjectId, required:true},
  haveExpiredDate:{type:Boolean,required:false},
  purchaseUnit:{type:String,required:false},
  warehouseUnit:{type:String,required:false},
  saleUnit:{type:String,required:false},
  discountType:{type:String,required:false,enum:["percent","fixed","none"]},
  discountValue:{type:Number,required:false}
});

// Cek apakah model sudah ada (Next.js hot reload bisa bikin error)
export default mongoose.models.Product || mongoose.model('Product', ProductSchema);