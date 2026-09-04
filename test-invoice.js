import mongoose from 'mongoose';
mongoose.connect('mongodb://127.0.0.1:27017/lss-erp-test?retryWrites=true&w=majority')
  .then(async () => {
    const Invoice = mongoose.model('Invoice', new mongoose.Schema({}, { strict: false }));
    const invs = await Invoice.find().limit(5).lean();
    console.log(JSON.stringify(invs, null, 2));
    process.exit(0);
  });
