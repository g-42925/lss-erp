import mongoose from 'mongoose';
import { type } from 'os';

const deliverySchema = new mongoose.Schema({
  companyId:{
    type:mongoose.Schema.Types.ObjectId,
    required:true
  },
  salesOrderNumber:{
    type:String,
    required:true
  },
  date:{
    type:Date,
    default:Date.now
  },
  qty:{
    type:Number,
    required:true
  },
  deliveryNumber:{
    type:String,
    required:true
  },
  batchNumber:{
    type:String,
    required:true
  },
  locationId:{
    type:mongoose.Schema.Types.ObjectId
  }
});

// Cek apakah model sudah ada (Next.js hot reload bisa bikin error)
export default mongoose.models.Delivery || mongoose.model('Delivery', deliverySchema)