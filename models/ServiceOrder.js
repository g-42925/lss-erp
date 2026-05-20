import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  billed: { type: Number, default: 0 },
  frequency: { type: String, enum: ['Week', 'Month', 'Once'] },
  productId: { type: mongoose.Schema.Types.ObjectId, required: true },
  contractType: { type: String, enum: ['Full', 'Trial', 'One Time'] },
  companyId: { type: mongoose.Schema.Types.ObjectId, required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  salesOrderNumber: { type: String, required: true },
  price: { type: Number, required: true },
  range: { type: Number },
  contract: { type: String },
  payTerm: { type: Date },
  date: { type: Date, required: true },
  productType: { type: String, enum: ['service'] },
  qty: { type: Number, required: true },
  dueDate: { type: Number },
  taxes: [
    {
      taxName: { type: String },
      taxValue: { type: Number }
    }
  ],
  customCustomer: {
    name: { type: String, required: true },
    address: { type: String, required: true },
  }
});

export default mongoose.models.ServiceOrder || mongoose.model('ServiceOrder', orderSchema)