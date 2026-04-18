import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  total: { type: Number, required: true },
  salesOrderId: { type: Number, required: false },
  salesOrderNumber: { type: String, required: true },
  discountType: { type: String, required: false, enum: ['percent', 'fixed', 'none'] },
  discountValue: { type: Number, required: false },
  taxValue: { type: Number, required: false },
  companyId: { type: mongoose.Schema.Types.ObjectId, required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'Customer' },
  customerName: { type: String, required: false },
  contract: { type: String, required: false },
  attachment: { type: String, required: false },
  payTerm: { type: Number, required: false },
  quotationNumber: { type: String, required: false },
  saleDate: { type: Date, required: true },
  productType: { type: String, required: false, enum: ['good', 'service'] },
  contractType: { type: String, required: false, enum: ['Full', 'Trial', 'One Time'] },
  frequency: { type: String, required: false, enum: ['Week', 'Month', 'Once'] },
  type: { type: String, required: false },
  range: { type: Number, required: false },
  cart: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Product' },
      qty: { type: Number, required: true },
      subTotal: { type: Number, required: true },
    }
  ],
});

export default mongoose.models.Order || mongoose.model('Order', orderSchema)