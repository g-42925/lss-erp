import mongoose from 'mongoose';

const WorkOrderSchema = new mongoose.Schema({
  taskName: { type: String, required: true },
  description: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  attachment: { type: String, required: false },
  assignedTo: { type: String, required: true },
  status: { type: String, default: 'Pending' },
  addedOn: { type: Date, default: Date.now },
  requestedBy: { type: String, required: true },
  masterAccountId: { type: String, required: true },
});

export default mongoose.models.WorkOrder || mongoose.model('WorkOrder', WorkOrderSchema)
