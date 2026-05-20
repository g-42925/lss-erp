import mongoose from 'mongoose';

const RoleSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, required: true },
  name: { type: String, required: true },
});

export default mongoose.models.Role || mongoose.model('Role', RoleSchema);