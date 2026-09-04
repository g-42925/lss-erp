const fs = require('fs');

const file = '/home/muhammad/lss-erp/app/api/web/dashboard/route.ts';
let code = fs.readFileSync(file, 'utf8');

const pipeline = `    const invoiceValuePipeline: any[] = [
      { $lookup: { from: 'orders', localField: 'salesOrderId', foreignField: '_id', as: 'order' } },
      { $lookup: { from: 'serviceorders', localField: 'salesOrderId', foreignField: '_id', as: 'serviceOrder' } },
      { $addFields: { orderDoc: { $arrayElemAt: ['$order', 0] }, svcOrderDoc: { $arrayElemAt: ['$serviceOrder', 0] } } },
      {
        $addFields: {
          orderTotal: { $ifNull: ['$orderDoc.total', 0] },
          isOneTimeService: { $and: [ { $eq: ['$svcOrderDoc.contractType', 'One Time'] }, { $eq: ['$svcOrderDoc.frequency', 'Once'] } ] },
          svcPrice: { $ifNull: ['$svcOrderDoc.price', 0] },
          svcQty: { $ifNull: ['$svcOrderDoc.qty', 1] }
        }
      },
      {
        $addFields: {
          missingQty: { $ifNull: ['$missing', 0] },
          svcUnitPrice: { $divide: ['$svcPrice', { $cond: [{ $eq: ['$svcQty', 0] }, 1, '$svcQty'] }] }
        }
      },
      {
        $addFields: {
          svcBaseTotal: {
            $cond: [
              '$isOneTimeService',
              '$svcPrice',
              { $subtract: ['$svcPrice', { $multiply: ['$svcUnitPrice', '$missingQty'] }] }
            ]
          },
          svcTaxTotal: {
            $reduce: {
              input: { $ifNull: ['$svcOrderDoc.taxes', []] },
              initialValue: 0,
              in: {
                $add: [
                  '$$value',
                  { $cond: [ { $eq: ['$$this.isPPh', true] }, { $multiply: ['$$this.taxValue', -1] }, '$$this.taxValue' ] }
                ]
              }
            }
          }
        }
      },
      {
        $addFields: {
          serviceTotal: { $cond: [ { $gt: ['$svcPrice', 0] }, { $add: ['$svcBaseTotal', '$svcTaxTotal'] }, 0 ] }
        }
      },
      {
        $addFields: { invoiceTotal: { $add: ['$orderTotal', '$serviceTotal'] } }
      }
    ];
`;

if (!code.includes('invoiceValuePipeline')) {
    code = code.replace(/const now = new Date\(\)/, pipeline + '\n    const now = new Date()');
}

// 2.5 Invoice Revenue: First occurrence
let r1 = code.indexOf(`        {
          $lookup: {
            from: 'orders',`);

// Let's replace the whole blocks safely.
// We will replace every sequence of:
/*
        {
          $lookup: {
            from: 'orders',
            localField: 'salesOrderId',
            foreignField: '_id',
            as: 'order'
          }
        },
        {
          $lookup: {
            from: 'serviceorders',
            localField: 'salesOrderId',
            foreignField: '_id',
            as: 'serviceOrder'
          }
        },
        {
          $addFields: {
            orderTotal: { $ifNull: [{ $arrayElemAt: ['$order.total', 0] }, 0] },
            serviceTotal: { $ifNull: [{ $arrayElemAt: ['$serviceOrder.price', 0] }, 0] }
          }
        },
*/
const searchPattern = /\{\s*\$lookup:\s*\{\s*from:\s*'orders'[\s\S]*?as:\s*'order'\s*\}\s*\},[\s\S]*?\{\s*\$lookup:\s*\{\s*from:\s*'serviceorders'[\s\S]*?as:\s*'serviceOrder'\s*\}\s*\},[\s\S]*?\{\s*\$addFields:\s*\{\s*orderTotal:[\s\S]*?serviceTotal:[\s\S]*?\}\s*\}/g;

code = code.replace(searchPattern, '...invoiceValuePipeline');

// Fix the $group inside 2.5 and others that use $add instead of invoiceTotal directly.
code = code.replace(/total:\s*\{\s*\$sum:\s*\{\s*\$add:\s*\['\$orderTotal',\s*'\$serviceTotal'\]\s*\}\s*\}/g, `total: { $sum: '$invoiceTotal' }`);

// Fix outstandingInvoices $group
// from: total: { $sum: { $subtract: ['$invoiceTotal', '$payAmount'] } }
//   to: total: { $sum: { $subtract: ['$invoiceTotal', { $ifNull: ['$payAmount', 0] }] } }

code = code.replace(/total:\s*\{\s*\$sum:\s*\{\s*\$subtract:\s*\['\$invoiceTotal',\s*'\$payAmount'\]\s*\}\s*\}/, `total: {
            $sum: {
              $subtract: ['$invoiceTotal', { $ifNull: ['$payAmount', 0] }]
            }
          }`);


// Wait, in `outstandingInvoices` there is another addFields:
/*
      {
        $addFields: {
          invoiceTotal: { $add: ['$orderTotal', '$serviceTotal'] }
        }
      },
*/
// The searchPattern didn't match the second addFields in outstandingInvoices!
// Actually, outstandingInvoices has TWO addFields. 
// Let's remove the second addFields specifically since we already replaced the first addFields with `...invoiceValuePipeline`, which INCLUDES invoiceTotal.
code = code.replace(/,\s*\{\s*\$addFields:\s*\{\s*invoiceTotal:\s*\{\s*\$add:\s*\['\$orderTotal',\s*'\$serviceTotal'\]\s*\}\s*\}\s*\}/g, '');


fs.writeFileSync(file, code, 'utf8');
console.log("Done");
