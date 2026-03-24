import mongoose from 'mongoose';

const CustomerSchema = new mongoose.Schema({
  bussinessName: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  taxNumber: { type: String, required: true },
  addedOn: { type: Date, required: true },
  address: { type: String, required: true },
  mobile: { type: String, required: true },
  customerOf: { type: mongoose.Schema.Types.ObjectId, required: true }
});



// Cek apakah model sudah ada (Next.js hot reload bisa bikin error)
export default mongoose.models.Customer || mongoose.model('Customer', CustomerSchema);