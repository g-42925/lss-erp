import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  salesOrderNumber: { type: String, required: true },
  discountType: { type: String, enum: ['percent', 'fixed', 'none'] },
  companyId: { type: mongoose.Schema.Types.ObjectId, required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedAt: { type: Date },
  lastEditedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  lastApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  editedAt: { type: Date, required: false },
  productType: { type: String, enum: ['good', 'service'] },
  total: { type: Number, required: true },
  saleDate: { type: Date, required: true },
  quotationNumber: { type: String },
  type: { type: String },
  discountValue: { type: Number },
  taxValue: { type: Number },
  contract: { type: String },
  attachment: { type: String },
  payTerm: { type: mongoose.Schema.Types.Mixed },
  pickupDate: { type: Date },
  salesOrderId: { type: Number },
  contractType: { type: String },
  range: { type: Number },
  frequency: { type: String },
  taxes: [
    {
      taxName: { type: String },
      taxValue: { type: Number }
    }
  ],
  customCustomer: {
    name: { type: String, required: false },
    address: { type: String, required: false },
  },
  cart: [
    {
      warehouseId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Warehouse' },
      productId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Product' },
      qty: { type: Number, required: true },
      subTotal: { type: Number, required: true },
      taxes: [
        {
          taxName: { type: String },
          taxValue: { type: Number },
          taxAmount: { type: Number }  // total tax money for all units of this cart item
        }
      ]
    }
  ],
  adjustment: [
    {
      deliveryNumber: { type: String },
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      qty: { type: Number, required: true },
    }
  ],
  void: { type: Boolean, default: false },
  voidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  voidedAt: { type: Date, required: false },
});

export default mongoose.models.Order || mongoose.model('Order', orderSchema)