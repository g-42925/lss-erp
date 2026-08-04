const fs = require('fs');

const path = 'app/api/web/purchases/route.ts';
let content = fs.readFileSync(path, 'utf8');

// Add Asset import if not present
if (!content.includes("import Asset from")) {
  content = content.replace(
    "import Batche from '@/models/Batche'",
    "import Batche from '@/models/Batche'\nimport Asset from '@/models/Asset'"
  );
}

// Modify the procurement block around line 324
const oldBlock = `      if (purchase.purchaseType === 'procurement') {
        // For procurement, we don't update Product stock values or create Batches the same way.
        await Purchase.findByIdAndUpdate(_id, {
          $inc: { receivedQty: parseInt(rest.qty) }
        });
        await InvItem.findByIdAndUpdate(purchase.productId, {
          $inc: { currentStock: parseInt(rest.qty) }
        });
        return NextResponse.json({
          noResult: false,
          message: "",
          result: {},
          error: false
        })
      }`;

const newBlock = `      if (purchase.purchaseType === 'procurement') {
        const received = parseInt(rest.qty);
        await Purchase.findByIdAndUpdate(_id, {
          $inc: { receivedQty: received }
        });
        
        if (rest.saveAs === 'asset') {
          // Create Asset records (1 per received qty since qty field was removed)
          const company = await Companie.findOne({ masterAccountId: rest.masterAccountId || purchase.companyId || (await Log.findOne({purchaseId: _id}))?.createdBy || rest.userId }); // try to get company
          // If we can't get company from rest, try to get from purchase.productId -> productOf
          let companyId = null;
          if (company) companyId = company._id;
          else {
             const prod = await Product.findById(purchase.productId);
             if (prod) companyId = prod.productOf;
          }

          if (companyId) {
             const assetPromises = [];
             for (let i = 0; i < received; i++) {
               assetPromises.push(Asset.create({
                 name: (await Product.findById(purchase.productId))?.productName || "Received Asset",
                 category: rest.assetCategoryId,
                 addedAt: new Date(),
                 condition: "good",
                 status: "active",
                 desc: "Received from PO: " + purchase.purchaseOrderNumber,
                 companyId: companyId
               }));
             }
             await Promise.all(assetPromises);
          }
        } else {
          // Save as inventory
          await InvItem.findByIdAndUpdate(purchase.productId, {
            $inc: { currentStock: received }
          });
        }
        
        return NextResponse.json({
          noResult: false,
          message: "",
          result: {},
          error: false
        })
      }`;

content = content.replace(oldBlock, newBlock);

fs.writeFileSync(path, content);
console.log("Patched route.ts");
