# Blueprint - LSS ERP

## Overview

LSS ERP is an Enterprise Resource Planning system built with Next.js (App Router), Node.js, and a hybrid database approach using Mongoose (MongoDB) and Prisma (MySQL). It focuses on sales, procurement, and warehouse modules.

## Features & Design

- **Modern UI**: Uses Tailwind CSS and DaisyUI for a clean, responsive layout.
- **Role-Based Access Control (RBAC)**: Restricts access to pages and specific actions (Create, Read, Update, Delete) based on assigned user roles.
- **Sales Module**: Handles quotations, orders, and invoices.
- **Invoice Printout**: Optimized for A4 printing with customizable headers and automatic pagination.
- **Warehouse Module**: Managing receipts, deliveries, and now physical warehouses linked to locations.
- **Finance Module**: Accounting and report management.

## Project History

- **Invoice Pagination**: Implemented forced page breaks after every 5 items for consistent A4 printing.
- **Finance Assets**: Added asset sections (Cash, Bank, Inventory) to the COA report.
- **Quotation Separation**: Split Product and Service quotations into separate models.
- **Warehouse Management**: Added sub-warehouses under geographical locations.
- **Superadmin Location Selection**: Implemented mandatory location assignment during super admin login.

## Current Task: Product Refund & Restock (COMPLETED)

### Description

Implemented a mechanism to refund products directly from a sales order cart, log the refund into a new `RefundLog` collection, and allow users to store the refunded items back into the designated warehouse inventory.

### Implementation Results

1. **RefundLog Model**: Created `models/RefundLog.js` to securely track refund history independent of original purchase logs.
2. **Backend API**: Added `/api/web/refund` with `POST` (create refund log) and `PUT` (restock to warehouse by creating a restocking batch).
3. **Sales Order View**: Upgraded `/app/sales/order/page.tsx` with a dynamic Cart viewer per order, allowing partial or full quantity refunds against specific products.
4. **Refund Log UI**: Created a new page `/sales/refund/page.tsx` to list active and processed refunds, providing an actionable "Store Back" feature for returned products.
5. **Navigation**: Linked the "Refund Log" page into the system sidebar under Sales.

## Open Questions

- Should a refund action automatically deduct the associated original Invoice value or Order balance, or should it remain strictly as a logging and restock mechanism? (*Currently operates as logging/restock mechanism as requested by user*).
