import fs from 'fs';
const filePath = 'app/api/web/dashboard/route.ts';
let content = fs.readFileSync(filePath, 'utf8');
content = content.replace(/\$add: \['\$orderTotal', '\$serviceTotal'\]/g, '{ $round: [{ $add: [\'$orderTotal\', \'$serviceTotal\'] }] }');
fs.writeFileSync(filePath, content);
console.log('Replaced successfully.');
