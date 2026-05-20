import mongoose from 'mongoose';

const quotationSchema = new mongoose.Schema({
  frequency: { type: String, enum: ['Week', 'Month', 'Once'] },
  productId: { type: mongoose.Schema.Types.ObjectId, required: true },
  contractType: { type: String, enum: ['Full', 'Trial', 'One Time'] },
  companyId: { type: mongoose.Schema.Types.ObjectId, required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  quotationNumber: { type: String, required: true },
  price: { type: Number, required: true },
  range: { type: Number },
  date: { type: Date, required: true },
  expiredAt: { type: Date },
  productType: { type: String, enum: ['service'], default: 'service' },
  qty: { type: Number, required: true },
  customCustomer: {
    name: { type: String },
    address: { type: String },
  }
});

export default mongoose.models.ServiceQuotation || mongoose.model('ServiceQuotation', quotationSchema)
