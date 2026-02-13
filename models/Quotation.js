import mongoose from 'mongoose';
import { type } from 'os';

const quotationSchema = new mongoose.Schema({
  companyId: {type:mongoose.Schema.Types.ObjectId, required:true},
  productId: {type:mongoose.Schema.Types.ObjectId, required:true},
  customerId: {type:mongoose.Schema.Types.ObjectId, required:true},
  qty: {type:Number, required:true},
  discount: {type:Number, required:false},
  taxType: {type:String,required:true},
  expiredDate: {type:Date,required:false},
  price: {type:Number,required:true},
  createdAt: {type:Number,required:true},
  quotationNumber: {type:String,required:true},
  contractType: {type:String,required:false,enum:["Full","Trial"]},
  range: {type:Number,required:false},
  frequency : {type:String,required:false,enum:["Day","Week","Month","Year"]},
  productType: {type:String,required:false,enum:["good","service"]},
  locationId: {type:mongoose.Schema.Types.ObjectId,required:false},
});

export default mongoose.models.Quotation || mongoose.model('Quotation', quotationSchema)