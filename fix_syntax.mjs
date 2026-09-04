import fs from 'fs';

const filePath = 'app/api/web/dashboard/route.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Fix the vars: { sOrder... issue
content = content.replace(/vars: \{ sOrder: \{ \$arrayElemAt: \['\$serviceOrder', 0\] \},\n\s*in: \{/g, "vars: { sOrder: { $arrayElemAt: ['$serviceOrder', 0] } },\n              in: {");

// Also check the $cond braces:
// else: { $add: ['$value', '$this.taxValue'] } \n } \n } \n }
content = content.replace(/else: \{ \$add: \['\$\$value', '\$\$this\.taxValue'\] \}\n\s*\}\n\s*\}\n\s*\}/g, "else: { $add: ['$$value', '$$this.taxValue'] }\n                            }\n                          }\n                        }");

fs.writeFileSync(filePath, content);
console.log('Fixed syntax.');
