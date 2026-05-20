import mongoose from 'mongoose';

const AssignmentSchema = new mongoose.Schema({
  roleId: { type: mongoose.Schema.Types.ObjectId, required: true },
  link: { type: String, required: true },
  permissions: { type: [String], default: ['view'] }
});

export default mongoose.models.Assignment || mongoose.model('Assignment', AssignmentSchema);