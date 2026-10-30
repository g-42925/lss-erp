# Blueprint: LSS ERP - Cashflow Management & Approval Features

## 1. Overview & Capabilities
LSS ERP is an enterprise resource planning system built with Next.js (App Router), React, TailwindCSS / DaisyUI, MongoDB (Mongoose), and Zustand for authentication and state management. The finance module provides comprehensive cashflow tracking, bank accounts management, voucher generation, invoices, purchases, debt tracking, and financial reporting.

The Cashflow Report (`/dashboard/finance/cashflow`) aggregates monetary movements across:
- **Sales Invoices**: Dynamic payment receipts from sales orders.
- **Purchase Payments**: Dynamic cash disbursements for purchases.
- **Manual Entries**: Direct cash/bank adjustments, initial balances, and manual entries stored in the `Cashflow` MongoDB collection.

---

## 2. Project Architecture & Existing Features

### Tech Stack & Core Conventions
- **Framework**: Next.js (App Router)
- **Database**: MongoDB with Mongoose ODM
- **Styling**: Tailwind CSS & DaisyUI
- **Security & Authorization**: User role-based permissions and supervisor `approvalCode` for sensitive/destructive operations (e.g. debt reversal, adjust stock, refund, sales order void).

### Cashflow Report Features
- Mode switcher: Cash vs. Bank Accounts.
- Date range filtering (`startDate`, `endDate`), bank account selector, and search query.
- Real-time summary cards: Total In, Total Out, Net Cashflow, Saldo Akhir.
- Sticky header & filter toolbar for seamless scrolling experience.
- Manual entry creation (`POST /api/web/finance/reports/cashflow`) and editing (`PUT /api/web/finance/reports/cashflow`).
- Voucher linking and printing for cash/bank vouchers.

---

## 3. Plan & Steps for Current Requested Change: Delete Manual Entry with Approval Code

### Objective
Allow users to delete transactions of type `Manual Entry` on the Cashflow Report page, guarded by a supervisor/admin `approvalCode` verification modal.

### Actionable Steps:
1. **Backend (`app/api/web/finance/reports/cashflow/route.ts`)**:
   - Import `User` model (`@/models/User`).
   - Implement `DELETE` route handler:
     - Receive `id` (Cashflow document ID) and `approvalCode` (via query params or JSON body).
     - Validate input: ensure both `id` and `approvalCode` are provided.
     - Validate `approvalCode`: query `User.findOne({ approvalCode })`. If invalid, return an error with HTTP status 400 (`"Kode approval tidak valid"`).
     - Find the `Cashflow` entry by `id`. If not found, return HTTP status 404 (`"Data cashflow tidak ditemukan"`).
     - Delete the cashflow document via `Cashflow.findByIdAndDelete(id)`.
     - Return `{ error: false, message: "Entri cashflow berhasil dihapus" }`.

2. **Frontend UI & State (`app/dashboard/finance/cashflow/page.tsx`)**:
   - Add state for delete confirmation modal:
     - `deleteTargetTx`: transaction to be deleted (or `null`).
     - `deleteApprovalCode`: input string for the supervisor's approval code.
     - `deleteLoading`: boolean indicating API call progress.
     - `deleteError`: string for displaying validation/server errors in the modal.
   - Add "Hapus Entri" menu item inside the `dropdown-content` of rows where `t.source === 'Manual Entry'`.
     - Stylized with red/rose accent (`text-rose-600 hover:bg-rose-50 hover:text-rose-700`) and a trash icon.
   - Implement an aesthetic DaisyUI/Tailwind modal dialog for Approval Confirmation:
     - Displays transaction details (date, reference, type IN/OUT, amount formatted in IDR).
     - Password/masked or clear input field for `approvalCode` with auto-focus.
     - Error alert if validation fails.
     - Cancel and "Hapus Sekarang" action buttons with loading state indicator.
   - Handle delete submission:
     - Call `DELETE /api/web/finance/reports/cashflow?id=...&approvalCode=...`.
     - On success: close modal, reset state, and invoke `fetchCashflow()` to reload data and recalculate totals.
     - On failure: show error message within the modal.

### Status:
- [x] **Backend**: Handler `DELETE` implemented in `app/api/web/finance/reports/cashflow/route.ts` with validation of `approvalCode` against `User` collection.
- [x] **Frontend**: Dropdown action "Hapus Entri" & Modal konfirmasi kode approval implemented in `app/dashboard/finance/cashflow/page.tsx`.
- [x] **Testing & Lint**: Lint checks passed with 0 errors.

---

## 4. Plan & Steps: Support Decimal Comma in Manual Entry Forms

### Problem:
- `NumericFormat` in both Add Modal and Edit Modal had `decimalScale={0}` which completely disabled inputting decimal comma (`,`).
- `onValueChange` was reading `values.floatValue?.toString()`, which strips trailing decimal separators when the user types a comma (e.g. typing `150,` became `150`, dropping the comma).
- `IDR()` helper used default currency formatting which rounded fractional amounts (e.g. `3.379.249,9` would round to `Rp 3.379.250`).

### Actionable Steps:
1. **Frontend `IDR` helper ([`app/dashboard/finance/cashflow/page.tsx`](file:///home/muhammad/lss-erp/app/dashboard/finance/cashflow/page.tsx))**:
   - Set `maximumFractionDigits: 2` (or allow fractional digits) so numbers with decimals display cleanly (e.g. `Rp 3.379.249,9`).
2. **NumericFormat in Modals ([`app/dashboard/finance/cashflow/page.tsx`](file:///home/muhammad/lss-erp/app/dashboard/finance/cashflow/page.tsx))**:
   - Remove `decimalScale={0}`.
   - Configure `decimalSeparator=","` and `allowedDecimalSeparators={[",", "."]}` so users can type either comma or period on numpads.
   - Update `onValueChange` to preserve the raw numeric string via `values.value` instead of `values.floatValue?.toString()`, allowing trailing decimal inputs (e.g. typing `,` before the digit).
### Status:
- [x] **Backend**: Handler `DELETE` implemented in `app/api/web/finance/reports/cashflow/route.ts` with validation of `approvalCode` against `User` collection.
- [x] **Frontend**: Dropdown action "Hapus Entri" & Modal konfirmasi kode approval implemented in `app/dashboard/finance/cashflow/page.tsx`.
- [x] **Decimal Comma Support**: Removed `decimalScale={0}`, enabled comma/period input (`allowedDecimalSeparators`), preserved decimal values in state via `values.value`, and updated `IDR` helper with `maximumFractionDigits: 2`.
- [x] **Testing & Lint**: ESLint checks passed with 0 errors.

---

## 5. Plan & Steps: Quotation Barang (Goods Quotation)

### Objective
Tambahkan fitur membuat quotation (penawaran harga) untuk **barang** (product/goods), diakses dari `Sales > Items`. Flow: Sales Items → pilih katalog → lihat varian → klik "Buat Quotation" → buat penawaran.

Berbeda dari `Quotation` yang sudah ada (untuk service/jasa), fitur baru ini menggunakan model `GoodsQuotation` tersendiri dengan item-item berupa varian produk dari katalog.

### Files Created / Modified

#### Backend
- **`models/GoodsQuotation.js`** — Mongoose schema baru untuk quotation barang. Fields: `quotationNumber`, `companyId`, `customerId?` (ref Customer), `customCustomer` (manual entry), `date`, `validUntil`, `items[]` (productId, catalogId, qty, unit, price, discount, tax, subTotal), diskon global, totals (subtotal, totalDiscount, totalTax, grandTotal), `note`, `termsConditions`, `status`, `locked`.
- **`app/api/web/goods-quotation/route.ts`** — GET (list dengan filter) + POST (create, auto-generate nomor `GQU-YYMM-XXXX`).
- **`app/api/web/goods-quotation/[id]/route.ts`** — GET, PUT, DELETE per quotation.

#### Frontend
- **`app/sales/goods-quotation/page.tsx`** — Halaman list + create/edit modal lengkap:
  - List dengan filter search, summary card per status
  - Modal create/edit: input pelanggan (custom/dari database), picker produk 2-tahap (katalog → varian), item table (qty, harga, diskon per item, pajak), diskon global, total otomatis, note & T&C
  - Modal detail (view) dengan tombol Print & Edit
  - Ubah status via dropdown (draft → sent → accepted → rejected → expired)
  - `useSearchParams` untuk handle `?catalogId=` dari halaman items (auto-buka modal + pre-pilih katalog)
- **`app/sales/goods-quotation/print/page.tsx`** — Halaman cetak A4: header perusahaan, info pelanggan, tabel item, totals, catatan, area tanda tangan. Auto-trigger `window.print()` saat load.
- **`app/sales/items/page.tsx`** — Ditambahkan tombol "Buat Quotation" (teal) di header panel varian, navigasi ke `/sales/goods-quotation?catalogId=<id>`.
- **`components/sidebar.tsx`** — Ditambahkan `SidebarItem` "Quotation Barang" di bawah "Items" pada menu Sales.

### Status:
- [x] **Model**: `GoodsQuotation.js` dibuat
- [x] **API**: GET/POST list + GET/PUT/DELETE by ID
- [x] **Frontend**: List page, Create/Edit modal, View modal, Print page
- [x] **Integrasi items**: Tombol "Buat Quotation" di panel varian, auto-open dengan catalog pre-selected
- [x] **Sidebar**: Menu "Quotation Barang" ditambahkan


