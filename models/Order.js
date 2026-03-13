import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  salesOrderId: {type:Number,required:false},
  salesOrderNumber:{type:String,required:true},
  companyId: {type:mongoose.Schema.Types.ObjectId, required:true},
  productId: [{type:mongoose.Schema.Types.ObjectId, required:true}],
  customerId: {type:mongoose.Schema.Types.ObjectId, required:false},
  customerName: {type:String,required:false},
  contract: {type:String,required:false},
  attachment: {type:String,required:false},
  payTerm: {type:Number,required:false},
  quotationNumber: {type:String,required:false},
  saleDate: {type:Date,required:true},
  productType: {type:String,required:false,enum:['good','service']},
  contractType: {type:String,required:false,enum:['Full','Trial']},
  frequency: {type:String,required:false,enum:['Week','Month']},
  type: {type:String,required:false},
  range: {type:Number,required:false},
  cart:[
    {
      productId: {type:mongoose.Schema.Types.ObjectId, required:true},
      qty: {type:Number, required:true},
      discountType: {type:String,required:true,enum:['percent','fixed','none']},
      discountValue: {type:Number,required:false}
    }
  ],
});

export default mongoose.models.Order || mongoose.model('Order', orderSchema)