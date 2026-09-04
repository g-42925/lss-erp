import { MongoClient } from 'mongodb';
const uri = 'mongodb://127.0.0.1:27017';
const client = new MongoClient(uri);
async function run() {
  try {
    await client.connect();
    const database = client.db('lss-erp-test'); // Or whatever DB name
    const collection = database.collection('invoices');
    const inv = await collection.findOne({ missing: { $exists: true } }) || await collection.findOne();
    console.log(JSON.stringify(inv, null, 2));
  } finally {
    await client.close();
  }
}
run();
