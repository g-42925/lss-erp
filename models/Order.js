import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  salesOrderId: {type:Number,required:true},
  companyId: {type:mongoose.Schema.Types.ObjectId, required:true},
  productId: {type:mongoose.Schema.Types.ObjectId, required:true},
  customerId: {type:mongoose.Schema.Types.ObjectId, required:true},
  qty: {type:Number, required:true},
  price : {type:Number,required:true},
  discount: {type:Number, required:false},
  taxType: {type:String,required:true},
  contract: {type:String,require:false},
  attachment: {type:String,required:true},
  payTerm: {type:Number,required:false},
  quotationNumber: {type:String,required:true},
  saleDate: {type:Date,required:true},
  productType: {type:String,required:false,enum:['good','service']},
  contractType: {type:String,required:false,enum:['Full','Trial']},
  frequency: {type:String,required:false,enum:['Day','Week','Month','Year']},
  range: {type:Number,required:false}

});

export default mongoose.models.Order || mongoose.model('Order', orderSchema)