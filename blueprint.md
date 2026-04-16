# Blueprint

## Overview
LSS-ERP Next.js Application. Features multiple views for quotations, orders, invoices (both products and services). 

## Detailed Outline
- **Initial Version**: Quotations and Orders pages
- **Current Version**:
  - Implemented popup modal for managing invoices over multiple products with print functionality.
  - Allowed conversion of quotations into orders via popup in `quotations` page.
  - Implemented converting service-based quotations into orders.

## Current Plan (Inventory Usage)
1.  **Create Model**: Implement `models/InvUsage.js` to track item decrement events.
2.  **Create API**: Implement `app/api/web/inv-usage/route.ts` for POST (usage creation + stock $inc decrement) and GET (usage history).
3.  **UI Updates**:
    - Update `app/inventory/items/page.tsx` with a "Use" button and modal.
    - Create `app/inventory/usage/page.tsx` to list usage logs.
4.  **Sidebar**: Add "Usage" link to `components/sidebar.tsx` under Inventory.
5.  **Verification**: Add an item, add stock, use item, and verify stock levels.


