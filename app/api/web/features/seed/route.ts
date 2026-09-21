import { connectToDatabase } from "@/lib/mongodb";
import Feature from "@/models/feature";
import { NextRequest, NextResponse } from "next/server";

const allFeatures = [
  // User Management
  { group: "User Management", name: "Users", link: "/users" },
  { group: "User Management", name: "Roles", link: "/roles" },
  { group: "User Management", name: "Location", link: "/products/location" },
  // Contacts
  { group: "Contacts", name: "Customers", link: "/customers" },
  { group: "Contacts", name: "Vendor", link: "/vendor" },
  { group: "Contacts", name: "Suppliers", link: "/suppliers" },
  // Product
  { group: "Product", name: "Catalog", link: "/products/catalog" },
  { group: "Product", name: "New", link: "/products/add/good" },
  { group: "Product", name: "UoM", link: "/products/packaging" },
  { group: "Product", name: "List", link: "/products/list" },
  // Warehouse
  { group: "Warehouse", name: "Exit", link: "/inventory/exit" },
  { group: "Warehouse", name: "Adjust", link: "/warehouse/adjust" },
  { group: "Warehouse", name: "Stock", link: "/warehouse/availability" },
  { group: "Warehouse", name: "Shipping", link: "/warehouse/movement" },
  { group: "Warehouse", name: "Shipping Log", link: "/warehouse/log" },
  { group: "Warehouse", name: "New", link: "/warehouse/new" },
  { group: "Warehouse", name: "Receiving", link: "/warehouse/receiving" },
  { group: "Warehouse", name: "Receiving Log", link: "/warehouse/rlog" },
  { group: "Warehouse", name: "Quality Check", link: "/warehouse/qc" },
  { group: "Warehouse", name: "Stock Alerts", link: "/warehouse/alerts" },
  // Inventory
  { group: "Inventory", name: "Items", link: "/inventory/items" },
  { group: "Inventory", name: "Usage Logs", link: "/inventory/usage" },
  { group: "Inventory", name: "Batch Management", link: "/batches" },
  // Purchases
  { group: "Purchases", name: "Requisition", link: "/purchases" },
  { group: "Purchases", name: "Purchase Return", link: "/purchases/purchase-return" },
  // Sales
  { group: "Sales", name: "Order", link: "/sales/order" },
  { group: "Sales", name: "Service Order", link: "/sales/svc-order" },
  { group: "Sales", name: "Refund Log", link: "/sales/refund" },
  { group: "Sales", name: "Invoice", link: "/sales/p-invoice" },
  { group: "Sales", name: "Service Invoice", link: "/sales/svc-invoice" },
  { group: "Sales", name: "Quotation", link: "/sales/quotation" },
  // Finance
  { group: "Finance", name: "Purchases Approval", link: "/finance/purchases" },
  { group: "Finance", name: "Purchase Return Approval", link: "/finance/purchase-return" },
  { group: "Finance", name: "Debts", link: "/finance/debt" },
  { group: "Finance", name: "Bank Accounts", link: "/finance/bank-accounts" },
  { group: "Finance", name: "Voucher", link: "/finance/voucher" },
  { group: "Finance", name: "Bank Report", link: "/finance/bank-report" },
  { group: "Finance", name: "Finance Log", link: "/finance/log" },
  { group: "Finance", name: "Service Log", link: "/finance/svc-log" },
  { group: "Finance", name: "Inventory Logs", link: "/finance/inv-logs" },
  // Accounting
  { group: "Accounting", name: "General Journal", link: "/finance/accounting/journal" },
  { group: "Accounting", name: "Master COA", link: "/finance/accounting/coa" },
  { group: "Accounting", name: "Assets Summary", link: "/finance/accounting/coa/assets" },
  // Payroll / HMR
  { group: "HMR", name: "Payroll", link: "/payroll" },
  // Asset
  { group: "Asset", name: "Asset Perusahaan", link: "/assets" },
  // Master Data
  { group: "Master Data", name: "Master Data Config", link: "/master" },
  { group: "Master Data", name: "Taxes", link: "/sales/taxes" },
  // Report
  { group: "Report", name: "Cashflow", link: "/dashboard/finance/cashflow" },
  { group: "Report", name: "Profit & Loss", link: "/reports/profit-loss" },
  { group: "Report", name: "Tax Report", link: "/reports/tax" },
  { group: "Report", name: "Product Sales", link: "/reports/product-sell" },
  { group: "Report", name: "Product Purchases", link: "/reports/product-purchase" },
  { group: "Report", name: "Sell Payment", link: "/finance/report/sell-payment" },
  { group: "Report", name: "Purchase Payment", link: "/finance/report/purchase-payment" },
  { group: "Report", name: "Stock Report", link: "/reports/stock-report" },
  { group: "Report", name: "Remark Report", link: "/reports/remarks" },
  { group: "Report", name: "Expiry Report", link: "/reports/expiry" },
  { group: "Report", name: "Work Orders", link: "/work-orders" },
];

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    // Hapus fitur yang ada agar bersih
    await Feature.deleteMany({});
    
    // Insert ulang data secara utuh
    await Feature.insertMany(allFeatures);
    
    return NextResponse.json({
      noResult: false,
      message: 'Features seeded successfully',
      result: allFeatures,
      error: false
    });
  } catch (error) {
    return NextResponse.json({ noResult: true, message: (error as Error).message, result: null, error: true });
  }
}
