import mongoose from 'mongoose';

const RoleSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, required: true },
  name: { type: String, required: true },
  permission: { type: String, required: true, enum: ['r', 'rw'] }
});

export default mongoose.models.Role || mongoose.model('Role', RoleSchema);