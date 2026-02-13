import mongoose from 'mongoose';

const DebtSchema = new mongoose.Schema({
  salesOrderId: {type:mongoose.Schema.Types.ObjectId, required:true},
  customerId: {type:mongoose.Schema.Types.ObjectId, required:false},
  amount: {type:Number, required:true},
  date: {type:Date,default:Date.now},
});



// Cek apakah model sudah ada (Next.js hot reload bisa bikin error)
export default mongoose.models.Debt || mongoose.model('Debt', DebtSchema);