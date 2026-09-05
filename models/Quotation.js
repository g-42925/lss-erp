import mongoose from 'mongoose';

const quotationSchema = new mongoose.Schema({
  quotationNumber: { type: String, required: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: false },
  customCustomer: {
    name: { type: String, required: false },
    address: { type: String, required: false },
  },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  specifications: [
    {
      label: { type: String },
      value: { type: String },
    }
  ],
  priceOptions: [
    {
      qty: { type: Number },
      frequency: { type: String },
      price: { type: Number },
    }
  ],
  note: { type: String },
  introduction: { type: String },
  disclaimers: [
    { type: String }
  ],
  programs: [
    { type: String }
  ],
  date: { type: Date, required: true },
  status: { type: String, enum: ['draft', 'sent', 'accepted', 'rejected'], default: 'draft' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.Quotation || mongoose.model('Quotation', quotationSchema);
