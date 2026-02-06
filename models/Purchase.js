import mongoose from 'mongoose';

const PurchaseSchema = new mongoose.Schema({
  companyId: {type:mongoose.Schema.Types.ObjectId, required:true},
  productId: {type:mongoose.Schema.Types.ObjectId, required:true},
  supplierId: {type:mongoose.Schema.Types.ObjectId, required:false},
  quantity: {type:Number, required:true},
  estimatedPrice: {type:Number, required:true},
  date: {type:Date,Default:Date.now},
  finalPrice:{type:Number,required:false},
  status: { 
    type: String, 
    enum: [
      'requested',
      'approved',
      'ordered', 
      'completed',
      'rejected'
    ]
  },
});

// Cek apakah model sudah ada (Next.js hot reload bisa bikin error)
export default mongoose.models.Purchase || mongoose.model('Purchase', PurchaseSchema);