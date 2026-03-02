import mongoose from 'mongoose';

const measurementSchema = new mongoose.Schema({
  supplierId: { type: mongoose.Schema.Types.ObjectId, required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, required: true },
  supplierOf: { type: mongoose.Schema.Types.ObjectId, required: true},
  unit:{type:String,required:true},
  ratio:{type:Number,required:true}
});

export default mongoose.models.Measurement || mongoose.model('Measurement', measurementSchema);                                                 