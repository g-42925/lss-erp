import mongoose from 'mongoose';

const BankAccountSchema = new mongoose.Schema(
  {
    bank: { type: String, required: true },
    accountNumber: { type: String, required: true },
    accountName: { type: String, required: true },
    addedBy: { type: mongoose.Schema.Types.ObjectId, required: true },
    balance: { type: Number, required: true },
  },
  {
    timestamps: true
  }
);

export default mongoose.models.BankAccount || mongoose.model('BankAccount', BankAccountSchema);
