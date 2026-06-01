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

## Current Task: Super Admin Location Selection (COMPLETED)

### Description

Implemented a mandatory location selection step for super admin accounts that triggers after login but before accessing the main application.

### Implementation Results

1. **Zustand State**: Added `setLocationId` action to `auth.ts` to persist the selected location.
2. **Login Redirect**: Modified `login/page.tsx` to redirect super admins to `/select-location` instead of `/dashboard`.
3. **Location Selection UI**: Created `/select-location/page.tsx`, a dedicated page that loads available locations based on the super admin's master account ID, allowing them to choose a location context before proceeding to the dashboard.

## Open Questions

- Should we use a bitmask or a simple array of strings for permissions? *Array of strings is more readable and flexible for custom actions like 'approve'.*
- How to handle SuperAdmin? *SuperAdmin bypasses standard roles but must explicitly select a location context upfront.*
