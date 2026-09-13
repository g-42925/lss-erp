import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' }
});
const Model = mongoose.model('Test', schema);
const doc = new Model({ vendorId: "" });
console.log(doc.validateSync());
