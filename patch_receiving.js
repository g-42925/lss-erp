const fs = require('fs');

const path = 'app/warehouse/receiving/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// Add assetCategories state
content = content.replace(
  'const [warehouses, setWarehouses] = useState<any[]>([])',
  'const [warehouses, setWarehouses] = useState<any[]>([])\n  const [assetCategories, setAssetCategories] = useState<any[]>([])'
);

// Add saveAs and assetCategoryId watch
content = content.replace(
  'const receivedQtyWatch = editPrForm.watch("receivedQty")',
  'const receivedQtyWatch = editPrForm.watch("receivedQty")\n  const saveAsWatch = editPrForm.watch("saveAs")'
);

// Fetch asset categories
content = content.replace(
  'fetchWarehousesFn.fn(url3, body, (result) => {',
  `fetch('/api/web/asset-categories?id=' + masterAccountId).then(r => r.json()).then(j => setAssetCategories(j.result || []))\n\n      fetchWarehousesFn.fn(url3, body, (result) => {`
);

// Add default values for saveAs
content = content.replace(
  'purchaseOrderNumber: filter.purchaseOrderNumber,',
  'purchaseOrderNumber: filter.purchaseOrderNumber,\n      saveAs: "inventory",\n      assetCategoryId: "",'
);

// Add the form fields to the modal
const fieldsHtml = `
              {purchaseType === 'procurement' && (
                <div className="flex flex-col gap-3 border p-4 rounded-md mt-2">
                  <fieldset className="fieldset">
                    <legend className="fieldset-legend">Save As</legend>
                    <select className="select w-full" {...editPrForm.register("saveAs")}>
                      <option value="inventory">Inventory Item</option>
                      <option value="asset">Company Asset</option>
                    </select>
                  </fieldset>
                  {saveAsWatch === 'asset' && (
                    <fieldset className="fieldset">
                      <legend className="fieldset-legend">Asset Category</legend>
                      <select className="select w-full" {...editPrForm.register("assetCategoryId", { required: saveAsWatch === 'asset' })}>
                        <option value="">Select Category</option>
                        {assetCategories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                      </select>
                    </fieldset>
                  )}
                </div>
              )}
`;

content = content.replace(
  '{/* ── Conversion Value preview panel ── */}',
  fieldsHtml + '\n              {/* ── Conversion Value preview panel ── */}'
);

fs.writeFileSync(path, content);
console.log("Patched page.tsx");
