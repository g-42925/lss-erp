import fs from 'fs';

const filePath = 'app/api/web/dashboard/route.ts';
let content = fs.readFileSync(filePath, 'utf8');

const targetStr = `        $addFields: {
          orderTotal: { $ifNull: [{ $arrayElemAt: ['$order.total', 0] }, 0] },
          serviceTotal: { $ifNull: [{ $arrayElemAt: ['$serviceOrder.price', 0] }, 0] }
        }`;

const replacementStr = `        $addFields: {
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

// Some places have 10 spaces indentation, some have 12. Let's use regex to replace it robustly.
const regex10 = new RegExp(`\\s*\\$addFields: \\{\\s*orderTotal: \\{ \\$ifNull: \\[\\{ \\$arrayElemAt: \\['\\$order\\.total', 0\\] \\}, 0\\] \\},\\s*serviceTotal: \\{ \\$ifNull: \\[\\{ \\$arrayElemAt: \\['\\$serviceOrder\\.price', 0\\] \\}, 0\\] \\}\\s*\\}`, 'g');

content = content.replace(regex10, match => {
  const indent = match.match(/^\s*/)[0];
  return replacementStr.split('\n').map((line, i) => i === 0 ? indent.replace(/\n/g, '') + line.trim() : line).join('\n');
});

fs.writeFileSync(filePath, content);
console.log('Fixed', filePath);
