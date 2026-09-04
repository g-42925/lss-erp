import fs from 'fs';
const filePath = 'app/api/web/dashboard/route.ts';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/\$sum: \{\s*\{\s*\$round: \[\{\s*\$add: \['\$orderTotal', '\$serviceTotal'\]\s*\}\]\s*\}\s*\}/g, '$sum: { $round: [{ $add: [\'$orderTotal\', \'$serviceTotal\'] }, 0] }');

content = content.replace(/invoiceTotal: \{\s*\{\s*\$round: \[\{\s*\$add: \['\$orderTotal', '\$serviceTotal'\]\s*\}\]\s*\}\s*\}/g, 'invoiceTotal: { $round: [{ $add: [\'$orderTotal\', \'$serviceTotal\'] }, 0] }');

fs.writeFileSync(filePath, content);
console.log('Fixed successfully.');
