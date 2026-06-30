import { MongoClient } from 'mongodb';

const uri = "mongodb+srv://new-user-31:Yntktsx1@cluster0.qwxmz.mongodb.net/erp";

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('erp');
  const batches = await db.collection('batches').find({}).limit(10).toArray();
  const withoutWarehouse = batches.filter(b => !b.warehouseId);
  console.log("Total checked:", batches.length);
  console.log("Batches without warehouseId:", withoutWarehouse.length);
  if (withoutWarehouse.length > 0) {
     console.log("Example without warehouseId:", withoutWarehouse[0]);
  }
  
  // Actually, check if effectiveWarehouseId can fail due to order 
  await client.close();
}

main().catch(console.error);
