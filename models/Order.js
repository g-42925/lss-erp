import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  total: { type: Number, required: true },
  salesOrderId: { type: Number },
  salesOrderNumber: { type: String, required: true },
  discountType: { type: String, enum: ['percent', 'fixed', 'none'] },
  discountValue: { type: Number },
  taxValue: { type: Number },
  taxes: [
    {
      taxName: { type: String },
      taxValue: { type: Number }
    }
  ],
  companyId: { type: mongoose.Schema.Types.ObjectId, required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  customCustomer: {
    name: { type: String, required: true },
    address: { type: String, required: true },
  },
  contract: { type: String },
  attachment: { type: String },
  payTerm: { type: Date },
  quotationNumber: { type: String },
  saleDate: { type: Date, required: true },
  productType: { type: String, enum: ['good', 'service'] },
  contractType: { type: String, enum: ['Full', 'Trial', 'One Time'] },
  frequency: { type: String, enum: ['Week', 'Month', 'Once'] },
  type: { type: String },
  range: { type: Number },
  cart: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Product' },
      qty: { type: Number, required: true },
      subTotal: { type: Number, required: true },
      taxes: [
        {
          taxName: { type: String },
          taxValue: { type: Number }
        }
      ]
    }
  ],
});

export default mongoose.models.Order || mongoose.model('Order', orderSchema)