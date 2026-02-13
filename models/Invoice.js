import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
  companyId:{
    type:mongoose.Schema.Types.ObjectId,
    required:true
  },
  invoiceType:{
    type:String,
    required:true
  },
  invoiceNumber:{
    type:String,
    required:true
  },
  salesOrderId:{
    type:mongoose.Schema.Types.ObjectId,
    required:true,
  },
  salesOrderNumber:{
    type:String,
    required:true
  },
  payAmount:{
    type:Number,
    required:true,
    min:0
  },
  missing:{
    type:Number,
    required:false,
    min:0
  },
  paid: {
    type: Boolean,
    default:false,
  },
  date:{
    type:Date,
    required:true
  },
});

export default mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema)