import { connectToDatabase } from './lib/mongodb.js';
import Product from './models/Product.js';

async function test() {
  await connectToDatabase();
  const p = await Product.findOne({ conversionType: 'value' });
  console.log(JSON.stringify(p, null, 2));
  process.exit(0);
}
test();
