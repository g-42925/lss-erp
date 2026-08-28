import mongoose from 'mongoose';

const coaSchema = new mongoose.Schema({
  accountCode: { type: String, required: true },
  accountName: { type: String, required: true },
  category: { 
    type: String, 
    required: true,
    enum: ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense']
  },
  companyId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Companie',
    required: true 
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Compound index to ensure uniqueness per company
coaSchema.index({ companyId: 1, accountCode: 1 }, { unique: true });

export default mongoose.models.Coa || mongoose.model('Coa', coaSchema);
