import mongoose from 'mongoose';

const WarehouseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true },
  locationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Companie', required: true },
});

export default mongoose.models.Warehouse || mongoose.model('Warehouse', WarehouseSchema);
