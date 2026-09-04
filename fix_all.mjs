import fs from 'fs';

const filePath = 'app/api/web/dashboard/route.ts';
let content = fs.readFileSync(filePath, 'utf8');

const targetAddFields = `        $addFields: {
          orderTotal: { $ifNull: [{ $arrayElemAt: ['$order.total', 0] }, 0] },
          serviceTotal: { $ifNull: [{ $arrayElemAt: ['$serviceOrder.price', 0] }, 0] }
        }`;

const replacementAddFields = `        $addFields: {
          orderTotal: { $ifNull: [{ $arrayElemAt: ['$order.total', 0] }, 0] },
          serviceTotal: {
            $let: {
              vars: { sOrder: { $arrayElemAt: ['$serviceOrder', 0] } },
              in: {
                $let: {
                  vars: {
                    baseTotal: {
                      $cond: {
                        if: {
                          $and: [
                            { $eq: ['$$sOrder.contractType', 'One Time'] },
                            { $eq: ['$$sOrder.frequency', 'Once'] }
                          ]
                        },
                        then: { $ifNull: ['$$sOrder.price', 0] },
                        else: {
                          $subtract: [
                            { $ifNull: ['$$sOrder.price', 0] },
                            {
                              $multiply: [
                                { $divide: [{ $ifNull: ['$$sOrder.price', 0] }, { $max: [{ $ifNull: ['$$sOrder.qty', 1] }, 1] }] },
                                { $ifNull: ['$missing', 0] }
                              ]
                            }
                          ]
                        }
                      }
                    }
                  },
                  in: {
                    $add: [
                      '$$baseTotal',
                      {
                        $reduce: {
                          input: { $ifNull: ['$$sOrder.taxes', []] },
                          initialValue: 0,
                          in: {
                            $cond: {
                              if: { $eq: ['$$this.isPPh', true] },
                              then: { $subtract: ['$$value', '$$this.taxValue'] },
                              else: { $add: ['$$value', '$$this.taxValue'] }
                            }
                          }
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
        }`;

// 1. Replace all $addFields occurrences using regex to handle whitespace variations securely
const regexAddFields = new RegExp(targetAddFields.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s*'), 'g');
let matchCount = 0;
content = content.replace(regexAddFields, (match) => {
  matchCount++;
  const indent = match.match(/^\s*/)[0];
  return replacementAddFields.split('\n').map((line, i) => i === 0 ? indent.replace(/\n/g, '') + line.trim() : line).join('\n');
});
console.log(`Replaced $addFields ${matchCount} times.`);

// 2. Replace all $add: ['$orderTotal', '$serviceTotal'] with rounding
const targetAdd = `$add: ['$orderTotal', '$serviceTotal']`;
const replacementAdd = `$round: [{ $add: ['$orderTotal', '$serviceTotal'] }, 0]`;

let addMatchCount = 0;
content = content.replace(/\$add: \['\$orderTotal', '\$serviceTotal'\]/g, () => {
    addMatchCount++;
    return replacementAdd;
});
console.log(`Replaced $add ${addMatchCount} times.`);

fs.writeFileSync(filePath, content);
console.log('Fixed successfully.');
