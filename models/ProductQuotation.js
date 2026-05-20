import mongoose from 'mongoose';

const quotationSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, required: true },
  createdAt: { type: Date, required: true },
  expiredAt: { type: Date, required: false },
  quotationNumber: { type: String, required: true },
  productType: { type: String, required: false, enum: ["good", "service"] },
  taxValue: { type: Number, required: false },
  price: { type: Number, required: false },
  discountType: { type: String, enum: ['percent', 'fixed', 'none'], default: 'none' },
  discountValue: { type: Number, default: 0 },
  contractType: { type: String },
  range: { type: Number },
  frequency: { type: String },
  cart: [
    {
      warehouseId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Warehouse' },
      locationId: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'Location' },
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
  ]
});

export default mongoose.models.ProductQuotation || mongoose.model('ProductQuotation', quotationSchema)