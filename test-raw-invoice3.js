import { MongoClient } from 'mongodb';
const uri = 'mongodb+srv://new-user-31:Yntktsx1@cluster0.qwxmz.mongodb.net/erp';
const client = new MongoClient(uri);
async function run() {
  try {
    await client.connect();
    const database = client.db('erp');
    const collection = database.collection('invoices');
    // find an invoice that has a total field
    const inv = await collection.findOne({ total: { $exists: true } });
    console.log("Invoice with total:", JSON.stringify(inv, null, 2));
  } finally {
    await client.close();
  }
}
run();
