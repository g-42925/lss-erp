import mongoose from 'mongoose';

const logSchema = new mongoose.Schema({
  paymentNumber:{
    type:String,
    required:true
  },
  purchaseId:{
    type:mongoose.Schema.Types.ObjectId,
    required:true
  },
  date:{
    type:Date,
    required:true
  },
  amount:{
    type:Number,
    required:true
  },
  initial:{
    type:Boolean,
    required:true
  },
  type:{
    type:String,
    enum:['payment','adjustment'],
    required:true
  },
  reference:{
    type:String,
    required:false
  }
});



// Cek apakah model sudah ada (Next.js hot reload bisa bikin error)
export default mongoose.models.Log || mongoose.model('Log', logSchema)