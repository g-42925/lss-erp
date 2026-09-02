import mongoose from 'mongoose';

const CustomerSchema = new mongoose.Schema({
  bussinessName: { type: String, required: true },
  name: { type: String, required: true },
  addedOn: { type: Date, required: true },
  address: { type: String, required: true },
  mobile: { type: String, required: false },
  active: { type: String, required: false, default: 'yes' },
  taxType: { type: String, enum: ['KTP', 'NPWP'], required: false },
  taxNumber: { type: String, required: false },
  customerOf: { type: mongoose.Schema.Types.ObjectId, required: true }
});



// Cek apakah model sudah ada (Next.js hot reload bisa bikin error)
export default mongoose.models.Customer || mongoose.model('Customer', CustomerSchema);