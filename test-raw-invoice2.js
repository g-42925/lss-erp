import { MongoClient } from 'mongodb';
const uri = 'mongodb+srv://new-user-31:Yntktsx1@cluster0.qwxmz.mongodb.net/erp';
const client = new MongoClient(uri);
async function run() {
  try {
    await client.connect();
    const database = client.db('erp');
    const collection = database.collection('invoices');
    // find an invoice that has some unavailable or missing, or just a recent invoice
    const inv = await collection.findOne({ missing: { $exists: true } }) || await collection.findOne();
    console.log(JSON.stringify(inv, null, 2));
  } finally {
    await client.close();
  }
}
run();
