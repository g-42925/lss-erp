import mongoose from 'mongoose';

const quotationSchema = new mongoose.Schema({
  discountValue: { type: Number, required: false },
  companyId: { type: mongoose.Schema.Types.ObjectId, required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, required: true },
  discountType: { type: String, required: false, enum: ["percent", "fixed"] },
  expiredDate: { type: Date, required: false },
  price: { type: Number, required: true },
  createdAt: { type: Number, required: true },
  quotationNumber: { type: String, required: true },
  contractType: { type: String, required: false, enum: ["Full", "Trial"] },
  range: { type: Number, required: false },
  frequency: { type: String, required: false, enum: ["Day", "Week", "Month", "Year"] },
  productType: { type: String, required: false, enum: ["good", "service"] },
  locationId: { type: mongoose.Schema.Types.ObjectId, required: false },
  taxValue: { type: Number, required: false },
  cart: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, required: true },
      qty: { type: Number, required: true },
      subTotal: { type: Number, required: false },
      tax: { type: Boolean, required: false }
    }
  ],
});

export default mongoose.models.Quotation || mongoose.model('Quotation', quotationSchema)