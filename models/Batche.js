import mongoose from 'mongoose';
import { type } from 'os';

const batcheSchema = new mongoose.Schema({
  productId: {type:mongoose.Schema.Types.ObjectId, required:true},
  unitCost: {type:Number, required:true},
  qty: {type:Number, required:true},
  accumulative:{type:Number,required:true},
  outQty: {type:Number, required:true},
  expiryDate: {type:Date, required:true},
  batchNumber: {type:String, required:true},
  locationId: {type:mongoose.Schema.Types.ObjectId, required:true},
  status: {type:String, required:true,enum: ['ACTIVE', 'DEPLETED', 'EXPIRED', 'INACTIVE']},
  isOpening: {type:Boolean,required:false},
  createdAt: { type: Date, default: Date.now },
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false
  },
  note: {
    type: String,
    required: false
  }
});

batcheSchema.index(
  { productId: 1, 
    locationId: 1 
  },
  {
    unique: true,
    partialFilterExpression: { 
      isOpening: true 
    }
  }
);

// Cek apakah model sudah ada (Next.js hot reload bisa bikin error)
export default mongoose.models.Batche || mongoose.model('Batche', batcheSchema)