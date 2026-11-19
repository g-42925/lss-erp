import mongoose from 'mongoose';

const procurementReceivingLogSchema = new mongoose.Schema({
  purchaseOrderNumber: { type: String, required: true },
  purchaseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Purchase', required: true },
  itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
  qty: { type: Number, required: true },
  saveAs: { type: String, enum: ['inventory', 'asset'], default: 'inventory' },
  assetCategoryId: { type: mongoose.Schema.Types.ObjectId, required: false },
  assetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: false },
  unitLabels: [{ type: String }],
  receivedDate: { type: Date, required: true, default: Date.now },
  receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  lastEditedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  lastApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  editedAt: { type: Date, required: false },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.ProcurementReceivingLog ||
  mongoose.model('ProcurementReceivingLog', procurementReceivingLogSchema);
