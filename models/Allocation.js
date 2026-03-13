import mongoose from 'mongoose';
import { type } from 'os';

const allocationSchema = new mongoose.Schema({
  locationId: {type:mongoose.Schema.Types.ObjectId,required:true},
  productId: {type:mongoose.Schema.Types.ObjectId, required:true},
  date: {type:Date,required:true},
  from: {type:String,required:true},
  qty: {type:Number,required:true},
});


// Cek apakah model sudah ada (Next.js hot reload bisa bikin error)
export default mongoose.models.Allocation || mongoose.model('Allocation', allocationSchema)