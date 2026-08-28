import mongoose from 'mongoose';
// Ensure referenced models are registered before populate calls
import User from './User.js';
import Coa from './Coa.js';

const journalLineSchema = new mongoose.Schema({
  accountId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Coa', 
    required: true 
  },
  debit: { type: Number, required: true, default: 0 },
  credit: { type: Number, required: true, default: 0 },
  description: { type: String, required: false }
});

const journalSchema = new mongoose.Schema({
  journalNumber: { type: String, required: true },
  date: { type: Date, required: true },
  description: { type: String, required: true },
  lines: [journalLineSchema],
  companyId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Companie', 
    required: true 
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: false 
  },
  createdAt: { type: Date, default: Date.now }
});

// Index to ensure unique journal number per company
journalSchema.index({ companyId: 1, journalNumber: 1 }, { unique: true });

export default mongoose.models.Journal || mongoose.model('Journal', journalSchema);
