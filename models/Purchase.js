import mongoose from 'mongoose';

const PurchaseSchema = new mongoose.Schema({
  description: {type:String, required:false},
  editable: {type:Boolean,required:true},
  companyId: {type:mongoose.Schema.Types.ObjectId, required:true},
  productId: {type:mongoose.Schema.Types.ObjectId, required:false},
  vendorId: {type:mongoose.Schema.Types.ObjectId, required:false},
  supplierId: {type:mongoose.Schema.Types.ObjectId, required:false},
  purchaseType: {type:String,required:true,enum:['product','payment']},
  quantity: {type:Number, required:false},
  estimatedPrice: {type:Number, required:true},
  date: {type:Date,Default:Date.now},
  finalPrice:{type:Number,required:false},
  payAmount: {type:Number,Default:false},
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