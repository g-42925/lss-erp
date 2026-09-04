const fs = require('fs');
const file = '/home/muhammad/lss-erp/app/api/web/dashboard/route.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/\.\.\.invoiceValuePipeline\n\s*\},/g, '...invoiceValuePipeline,');

fs.writeFileSync(file, code, 'utf8');
console.log("Syntax fixed");
