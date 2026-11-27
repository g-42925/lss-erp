import mongoose from 'mongoose';

const contractSchema = new mongoose.Schema({
	contractNumber: { type: String, required: true },
	applicantName: { type: String, required: true },
	companyId: { type: mongoose.Schema.Types.ObjectId, required: true },
	customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: false },
	productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
	from: { type: Date, required: true },
	to: { type: Date, required: true },
	rules: {
		title: { type: String, required: true },
		points: [{ type: String, required: true }],
	},
	clauses: {
		note: { type: String, required: true },
		title: { type: String, required: true },
		points: [{
			label: { type: String, required: true },
			articles: [{
				value: { type: String, required: true },
				subArticles: [{ type: String, required: false }],
			}]
		}],
	},
	billing: {
		value: { type: Number, required: true },
		note: { type: String, required: false },
	}
});

export default mongoose.models.Contract || mongoose.model('Contract', contractSchema);
