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

## Current Task: Granular Role-Based Access Implementation (COMPLETED)

### Description
Implemented a granular role-based access system that determines access per feature and action (View, Create, Edit, Delete).

### Implementation Results
1. **Model Enhancement**: 
   - `Assignment.js` now includes `permissions` array.
   - `Role.js` global permission removed for per-feature granularity.
2. **API & Store**:
   - `login/route.ts` aggregates all assignments into a `pages` map.
   - `auth` store updated with new type-safe `pages` object.
3. **UI & Enforcement**:
   - `roles/page.tsx` overhauled with a premium interface for managing CRUD permissions.
   - `withAuth.tsx` now enforces route-level protection.
   - `sidebar.tsx` dynamically filters content.
   - `usePermission.ts` hook provides DX for action-level enforcement.

## Open Questions
- Should we use a bitmask or a simple array of strings for permissions? *Array of strings is more readable and flexible for custom actions like 'approve'.*
- How to handle SuperAdmin? *SuperAdmin should bypass all checks and see everything.*
