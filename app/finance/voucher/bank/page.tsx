/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import useAuth from "@/store/auth";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────
type VoucherType = "in" | "out";
type ModalMode = "create" | "edit" | null;
type RefModel = "Invoice" | "Cashflow" | "Purchase" | "Debt";

type VoucherItem = {
  description: string;
  customerName: string;
  amount: number;
  refModel?: RefModel;
  refId?: string;
  paymentHistoryId?: string;
};

type Signature = {
  name: string;
  date: string;
};

type Signatures = {
  dibukukanOleh: Signature;
  disetujuiOleh: Signature;
  dicekOleh: Signature;
  dibuatOleh: Signature;
};

type VoucherForm = {
  voucherNumber: string;
  contactName: string;
  date: string;
  companyBankAccountId: string;
  externalBankName: string;
  externalAccountNumber: string;
  items: VoucherItem[];
  signatures: Signatures;
};

type VoucherBank = {
  _id: string;
  type: VoucherType;
  voucherNumber: string;
  contactName: string;
  date: string;
  companyBankAccountId?: string;
  externalBankName?: string;
  externalAccountNumber?: string;
  items: VoucherItem[];
  signatures: Signatures;
};

type BankAccount = {
  _id: string;
  bank: string;
  accountNumber: string;
  accountName: string;
};

type Customer = {
  _id: string;
  bussinessName?: string;
  name?: string;
};

type InvoicePaymentRef = {
  invoiceId: string;
  invoiceNumber: string;
  invoiceType: string;
  paymentHistoryId: string;
  amount: number;
  method: string;
  date: string;
};

type CashflowRef = {
  cashflowId: string;
  reference: string;
  from: string;
  to: string;
  amount: number;
  date: string;
};

type PurchasePaymentRef = {
  purchaseId: string;
  purchaseOrderNumber: string;
  description: string;
  paymentHistoryId: string;
  amount: number;
  method: string;
  date: string;
  paymentNumber: string;
};

type DebtPaymentRef = {
  invoiceId: string;
  invoiceNumber: string;
  paymentHistoryId: string;
  amount: number;
  method: string;
  date: string;
  paymentNumber: string;
};

type ReferenceData = {
  invoicePayments: InvoicePaymentRef[];
  cashflows: CashflowRef[];
  purchasePayments: PurchasePaymentRef[];
  debtPayments: DebtPaymentRef[];
};

type ApiResponse<T> = {
  error?: boolean;
  message?: string;
  result?: T;
};

// ──────────────────────────────────────────────
// Constants / Helpers
// ──────────────────────────────────────────────
const BANK_OPTIONS = [
  "Bank BCA (Bank Central Asia)",
  "Bank BRI (Bank Rakyat Indonesia)",
  "Bank BNI (Bank Negara Indonesia)",
  "Bank Mandiri",
  "Bank BTN",
  "Bank CIMB Niaga",
  "Bank Danamon",
  "Bank Permata",
  "Bank Maybank",
  "Bank Panin",
  "Bank Syariah Indonesia (BSI)",
  "Bank Bukopin",
  "Bank Muamalat",
  "Bank Mega",
  "Bank Sinarmas",
  "Bank OCBC NISP",
  "Bank HSBC",
  "Bank Citibank",
  "Lainnya",
] as const;

const SIGNATURE_FIELDS = [
  ["dibukukanOleh", "Dibukukan Oleh"],
  ["disetujuiOleh", "Disetujui Oleh"],
  ["dicekOleh", "Diterima Oleh"],
  ["dibuatOleh", "Dibuat Oleh"],
] as const satisfies ReadonlyArray<[keyof Signatures, string]>;

const ROMAN_MONTHS = [
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "XI",
  "XII",
];

const IDR_FORMATTER = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const IDR = (value: number) => IDR_FORMATTER.format(Number(value) || 0);

const fmtDate = (value: string) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const todayStr = () => new Date().toISOString().split("T")[0];

const emptySignatures = (): Signatures => {
  const date = todayStr();

  return {
    dibukukanOleh: { name: "", date },
    disetujuiOleh: { name: "", date },
    dicekOleh: { name: "", date },
    dibuatOleh: { name: "", date },
  };
};

const emptyForm = (): VoucherForm => ({
  voucherNumber: `VB-${Date.now().toString().slice(-6)}`,
  contactName: "",
  date: todayStr(),
  companyBankAccountId: "",
  externalBankName: "",
  externalAccountNumber: "",
  items: [],
  signatures: emptySignatures(),
});

const normalize = (value: unknown) => String(value ?? "").toLowerCase();

async function requestJson<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const response = await fetch(url, options);
  const data = (await response.json()) as ApiResponse<T>;

  if (!response.ok || data.error) {
    throw new Error(data.message || `Request gagal (${response.status})`);
  }

  return data;
}

// ──────────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────────
export default function VoucherBankPage() {
  const masterAccountId = useAuth((state) => state.masterAccountId);
  const hasHydrated = useAuth((state) => state._hasHydrated);

  const [activeTab, setActiveTab] = useState<VoucherType>("in");
  const [vouchers, setVouchers] = useState<VoucherBank[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedBankFilter, setSelectedBankFilter] = useState("");

  const [invoiceRefs, setInvoiceRefs] = useState<InvoicePaymentRef[]>([]);
  const [cashflowRefs, setCashflowRefs] = useState<CashflowRef[]>([]);
  const [purchaseRefs, setPurchaseRefs] = useState<PurchasePaymentRef[]>([]);
  const [debtRefs, setDebtRefs] = useState<DebtPaymentRef[]>([]);

  const [loadingList, setLoadingList] = useState(false);
  const [loadingRefs, setLoadingRefs] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [refSearch, setRefSearch] = useState("");
  const [form, setForm] = useState<VoucherForm>(emptyForm);

  const selectedBankAccount = useMemo(
    () => bankAccounts.find((account) => account._id === form.companyBankAccountId) ?? null,
    [bankAccounts, form.companyBankAccountId]
  );

  const grandTotal = useMemo(
    () => form.items.reduce((total, item) => total + (Number(item.amount) || 0), 0),
    [form.items]
  );

  const accountVouchers = useMemo(() => {
    if (selectedBankFilter === "unassigned") {
      return vouchers.filter(
        (voucher) =>
          !voucher.companyBankAccountId ||
          !bankAccounts.some((account) => account._id === voucher.companyBankAccountId)
      );
    }

    if (!selectedBankFilter) return [];

    return vouchers.filter((voucher) => voucher.companyBankAccountId === selectedBankFilter);
  }, [bankAccounts, selectedBankFilter, vouchers]);

  const selectedFilterAccount = useMemo(
    () => bankAccounts.find((account) => account._id === selectedBankFilter) ?? null,
    [bankAccounts, selectedBankFilter]
  );

  const filteredRefs = useMemo(() => {
    const search = normalize(refSearch);

    return {
      invoice: invoiceRefs.filter(
        (ref) =>
          normalize(ref.invoiceNumber).includes(search) ||
          normalize(ref.method).includes(search)
      ),
      cashflow: cashflowRefs.filter(
        (ref) =>
          normalize(ref.reference).includes(search) ||
          normalize(ref.from).includes(search) ||
          normalize(ref.to).includes(search)
      ),
      purchase: purchaseRefs.filter(
        (ref) =>
          normalize(ref.purchaseOrderNumber).includes(search) ||
          normalize(ref.paymentNumber).includes(search)
      ),
      debt: debtRefs.filter(
        (ref) =>
          normalize(ref.invoiceNumber).includes(search) ||
          normalize(ref.paymentNumber).includes(search)
      ),
    };
  }, [cashflowRefs, debtRefs, invoiceRefs, purchaseRefs, refSearch]);

  // ──────────────────────────────────────────────
  // Fetchers
  // ──────────────────────────────────────────────
  const fetchVouchers = useCallback(async () => {
    if (!masterAccountId) return;

    setLoadingList(true);
    try {
      const data = await requestJson<VoucherBank[]>(
        `/api/web/voucher-bank?id=${masterAccountId}&type=${activeTab}`
      );
      setVouchers(data.result ?? []);
    } catch {
      setVouchers([]);
    } finally {
      setLoadingList(false);
    }
  }, [activeTab, masterAccountId]);

  const fetchCustomers = useCallback(async () => {
    if (!masterAccountId) return;

    try {
      const data = await requestJson<Customer[]>(`/api/web/customers?id=${masterAccountId}`);
      setCustomers(data.result ?? []);
    } catch {
      setCustomers([]);
    }
  }, [masterAccountId]);

  const fetchBankAccounts = useCallback(async () => {
    if (!masterAccountId) return;

    try {
      const data = await requestJson<BankAccount[]>(`/api/web/bank-accounts?id=${masterAccountId}`);
      setBankAccounts(data.result ?? []);
    } catch {
      setBankAccounts([]);
    }
  }, [masterAccountId]);

  const fetchRefs = useCallback(async () => {
    if (!masterAccountId) return;

    setLoadingRefs(true);
    try {
      const data = await requestJson<ReferenceData>(
        `/api/web/voucher-bank?id=${masterAccountId}&type=${activeTab}&mode=refs`
      );
      const result = data.result;

      setInvoiceRefs(result?.invoicePayments ?? []);
      setCashflowRefs(result?.cashflows ?? []);
      setPurchaseRefs(result?.purchasePayments ?? []);
      setDebtRefs(result?.debtPayments ?? []);
    } catch {
      setInvoiceRefs([]);
      setCashflowRefs([]);
      setPurchaseRefs([]);
      setDebtRefs([]);
    } finally {
      setLoadingRefs(false);
    }
  }, [activeTab, masterAccountId]);

  useEffect(() => {
    if (!hasHydrated) return;
    fetchVouchers();
  }, [fetchVouchers, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;
    fetchCustomers();
    fetchBankAccounts();
  }, [fetchBankAccounts, fetchCustomers, hasHydrated]);

  useEffect(() => {
    if (!bankAccounts.length) {
      setSelectedBankFilter("");
      return;
    }

    const filterStillExists =
      selectedBankFilter === "unassigned" ||
      bankAccounts.some((account) => account._id === selectedBankFilter);

    if (!filterStillExists) setSelectedBankFilter(bankAccounts[0]._id);
  }, [bankAccounts, selectedBankFilter]);

  // ──────────────────────────────────────────────
  // Voucher number / form
  // ──────────────────────────────────────────────
  const generateVoucherBankNumber = useCallback(
    (bankAccountId: string, dateStr: string, type: VoucherType) => {
      const account = bankAccounts.find((item) => item._id === bankAccountId);
      if (!account) return "";

      const bankName = account.bank
        .toUpperCase()
        .replace(/BANK/g, "")
        .replace(/[^A-Z0-9]/g, "");
      const last4 = account.accountNumber.slice(-4);
      const date = dateStr ? new Date(dateStr) : new Date();
      const month = ROMAN_MONTHS[date.getMonth()];
      const year = date.getFullYear().toString().slice(-2);
      const count = vouchers.filter(
        (voucher) => voucher.companyBankAccountId === bankAccountId
      ).length + 1;
      const sequence = count.toString().padStart(3, "0");
      const prefix = type === "in" ? "BM" : "BK";

      return `${prefix}-${bankName}${last4}/${month}/${year}/${sequence}`;
    },
    [bankAccounts, vouchers]
  );

  const openCreate = async () => {
    setForm(emptyForm());
    setEditId(null);
    setRefSearch("");
    setModalMode("create");
    await fetchRefs();
  };

  const openEdit = async (voucher: VoucherBank) => {
    setForm({
      voucherNumber: voucher.voucherNumber,
      contactName: voucher.contactName,
      date: voucher.date ? voucher.date.split("T")[0] : todayStr(),
      companyBankAccountId: voucher.companyBankAccountId ?? "",
      externalBankName: voucher.externalBankName ?? "",
      externalAccountNumber: voucher.externalAccountNumber ?? "",
      items: voucher.items ?? [],
      signatures: voucher.signatures ?? emptySignatures(),
    });
    setEditId(voucher._id);
    setRefSearch("");
    setModalMode("edit");
    await fetchRefs();
  };

  const closeModal = () => {
    if (saving) return;
    setModalMode(null);
  };

  const updateForm = <K extends keyof VoucherForm>(field: K, value: VoucherForm[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleBankAccountChange = (bankAccountId: string) => {
    setForm((current) => {
      if (modalMode !== "create") {
        return { ...current, companyBankAccountId: bankAccountId };
      }

      const voucherNumber = bankAccountId
        ? generateVoucherBankNumber(bankAccountId, current.date, activeTab) || current.voucherNumber
        : `VB-${Date.now().toString().slice(-6)}`;

      return {
        ...current,
        companyBankAccountId: bankAccountId,
        voucherNumber,
      };
    });
  };

  const handleDateChange = (date: string) => {
    setForm((current) => {
      if (modalMode !== "create" || !current.companyBankAccountId) {
        return { ...current, date };
      }

      return {
        ...current,
        date,
        voucherNumber:
          generateVoucherBankNumber(current.companyBankAccountId, date, activeTab) ||
          current.voucherNumber,
      };
    });
  };

  // ──────────────────────────────────────────────
  // Items
  // ──────────────────────────────────────────────
  const addItem = (item: VoucherItem) => {
    setForm((current) => ({
      ...current,
      items: [...current.items, item],
    }));
  };

  const addFromInvoice = (ref: InvoicePaymentRef) => {
    if (form.items.some((item) => item.paymentHistoryId === ref.paymentHistoryId)) return;

    addItem({
      description: `Invoice ${ref.invoiceNumber} – ${ref.method}`,
      customerName: "",
      amount: ref.amount,
      refModel: "Invoice",
      refId: ref.invoiceId,
      paymentHistoryId: ref.paymentHistoryId,
    });
  };

  const addFromCashflow = (ref: CashflowRef) => {
    if (form.items.some((item) => item.refId === ref.cashflowId)) return;

    addItem({
      description:
        ref.reference || (activeTab === "in" ? ref.from : ref.to) || "Manual Cashflow",
      customerName: activeTab === "in" ? ref.from ?? "" : ref.to ?? "",
      amount: ref.amount,
      refModel: "Cashflow",
      refId: ref.cashflowId,
    });
  };

  const addFromPurchase = (ref: PurchasePaymentRef) => {
    if (form.items.some((item) => item.paymentHistoryId === ref.paymentHistoryId)) return;

    addItem({
      description: `Purchase ${ref.purchaseOrderNumber} - ${ref.paymentNumber}`,
      customerName: "",
      amount: ref.amount,
      refModel: "Purchase",
      refId: ref.purchaseId,
      paymentHistoryId: ref.paymentHistoryId,
    });
  };

  const addFromDebt = (ref: DebtPaymentRef) => {
    if (form.items.some((item) => item.paymentHistoryId === ref.paymentHistoryId)) return;

    addItem({
      description: `Vendor Debt ${ref.invoiceNumber} - ${ref.paymentNumber}`,
      customerName: "",
      amount: ref.amount,
      refModel: "Debt",
      refId: ref.invoiceId,
      paymentHistoryId: ref.paymentHistoryId,
    });
  };

  const removeItem = (index: number) => {
    setForm((current) => ({
      ...current,
      items: current.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const updateItem = <K extends keyof VoucherItem>(
    index: number,
    field: K,
    value: VoucherItem[K]
  ) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const updateSignature = (
    key: keyof Signatures,
    field: keyof Signature,
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      signatures: {
        ...current.signatures,
        [key]: {
          ...current.signatures[key],
          [field]: value,
        },
      },
    }));
  };

  // ──────────────────────────────────────────────
  // Save / Delete
  // ──────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.contactName.trim()) return alert("Nama harus diisi");
    if (!form.voucherNumber.trim()) return alert("Nomor voucher harus diisi");
    if (!form.companyBankAccountId) return alert("Pilih rekening perusahaan");
    if (!form.items.length) return alert("Tambahkan minimal 1 item");

    setSaving(true);

    try {
      const isEdit = modalMode === "edit" && editId;
      const url = isEdit
        ? `/api/web/voucher-bank/${editId}`
        : "/api/web/voucher-bank";

      const data = await requestJson<unknown>(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          type: activeTab,
          masterAccountId,
        }),
      });

      if (data.error) throw new Error(data.message);

      setModalMode(null);
      await fetchVouchers();
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : "Gagal menyimpan voucher"}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus voucher ini? Relasi ke Invoice/Cashflow akan dilepas.")) return;

    setDeletingId(id);
    try {
      await requestJson(`/api/web/voucher-bank/${id}`, { method: "DELETE" });
      await fetchVouchers();
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : "Gagal menghapus voucher"}`);
    } finally {
      setDeletingId(null);
    }
  };

  if (!hasHydrated) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      <PageHeader onCreate={openCreate} />

      <VoucherFilters
        activeTab={activeTab}
        selectedBankFilter={selectedBankFilter}
        bankAccounts={bankAccounts}
        onTabChange={setActiveTab}
        onBankChange={setSelectedBankFilter}
      />

      <VoucherTable
        loading={loadingList}
        vouchers={accountVouchers}
        account={selectedFilterAccount}
        activeTab={activeTab}
        isUnassigned={selectedBankFilter === "unassigned"}
        deletingId={deletingId}
        onEdit={openEdit}
        onDelete={handleDelete}
      />

      {modalMode && (
        <VoucherModal
          mode={modalMode}
          activeTab={activeTab}
          form={form}
          customers={customers}
          bankAccounts={bankAccounts}
          selectedBankAccount={selectedBankAccount}
          filteredRefs={filteredRefs}
          loadingRefs={loadingRefs}
          saving={saving}
          refSearch={refSearch}
          grandTotal={grandTotal}
          onClose={closeModal}
          onRefSearch={setRefSearch}
          onFormChange={updateForm}
          onBankChange={handleBankAccountChange}
          onDateChange={handleDateChange}
          onAddInvoice={addFromInvoice}
          onAddCashflow={addFromCashflow}
          onAddPurchase={addFromPurchase}
          onAddDebt={addFromDebt}
          onRemoveItem={removeItem}
          onUpdateItem={updateItem}
          onAddManualItem={() =>
            addItem({ description: "", customerName: "", amount: 0 })
          }
          onUpdateSignature={updateSignature}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Page Header
// ──────────────────────────────────────────────
function PageHeader({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Voucher Bank</h1>
        <p className="text-sm text-gray-500">Bukti Voucher Bank Masuk / Keluar</p>
      </div>

      <button onClick={onCreate} className="btn btn-primary gap-2">
        <span className="text-base">＋</span>
        Buat Voucher Bank
      </button>
    </div>
  );
}

// ──────────────────────────────────────────────
// Filters
// ──────────────────────────────────────────────
function VoucherFilters({
  activeTab,
  selectedBankFilter,
  bankAccounts,
  onTabChange,
  onBankChange,
}: {
  activeTab: VoucherType;
  selectedBankFilter: string;
  bankAccounts: BankAccount[];
  onTabChange: (type: VoucherType) => void;
  onBankChange: (value: string) => void;
}) {
  return (
    <div className="mb-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
      <div className="tabs tabs-boxed w-fit bg-gray-100">
        <button
          className={`tab font-semibold ${activeTab === "in" ? "tab-active" : ""}`}
          onClick={() => onTabChange("in")}
        >
          🏦 Bank Masuk
        </button>
        <button
          className={`tab font-semibold ${activeTab === "out" ? "tab-active" : ""}`}
          onClick={() => onTabChange("out")}
        >
          💸 Bank Keluar
        </button>
      </div>

      {bankAccounts.length > 0 && (
        <select
          className="select select-bordered select-sm min-w-[250px] bg-white"
          value={selectedBankFilter}
          onChange={(event) => onBankChange(event.target.value)}
        >
          {bankAccounts.map((account) => (
            <option key={account._id} value={account._id}>
              {account.bank} – {account.accountNumber} ({account.accountName})
            </option>
          ))}
          <option value="unassigned">Lainnya / Tidak Diketahui</option>
        </select>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Voucher Table
// ──────────────────────────────────────────────
function VoucherTable({
  loading,
  vouchers,
  account,
  activeTab,
  isUnassigned,
  deletingId,
  onEdit,
  onDelete,
}: {
  loading: boolean;
  vouchers: VoucherBank[];
  account: BankAccount | null;
  activeTab: VoucherType;
  isUnassigned: boolean;
  deletingId: string | null;
  onEdit: (voucher: VoucherBank) => void;
  onDelete: (id: string) => void;
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (!vouchers.length) {
    return (
      <div className="rounded-xl bg-white p-10 text-center text-gray-400 shadow">
        <div className="flex flex-col items-center gap-2">
          <span className="text-4xl opacity-30">▣</span>
          <span>{isUnassigned ? "Tidak ada voucher kategori ini." : "Belum ada data voucher bank"}</span>
        </div>
      </div>
    );
  }

  const title = isUnassigned
    ? "Lainnya / Tidak Diketahui"
    : account
      ? `${account.bank} – ${account.accountNumber} (${account.accountName})`
      : "Voucher Bank";

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow">
      <div className="flex items-center justify-between border-b bg-gray-100 px-4 py-3">
        <h2 className="font-semibold text-gray-700">{title}</h2>
        <span className={`badge badge-sm ${isUnassigned ? "badge-neutral" : "badge-primary"}`}>
          {vouchers.length} Voucher
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="table table-zebra w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="w-12 text-center">No</th>
              <th>No. Voucher</th>
              <th>Tanggal</th>
              <th>{activeTab === "in" ? "Diterima dari" : "Dibayarkan kepada"}</th>
              {activeTab === "out" && <th>Bank Penerima</th>}
              <th className="text-right">Total (Rp)</th>
              <th className="text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {vouchers.map((voucher, index) => (
              <VoucherRow
                key={voucher._id}
                voucher={voucher}
                index={index}
                activeTab={activeTab}
                deleting={deletingId === voucher._id}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function VoucherRow({
  voucher,
  index,
  activeTab,
  deleting,
  onEdit,
  onDelete,
}: {
  voucher: VoucherBank;
  index: number;
  activeTab: VoucherType;
  deleting: boolean;
  onEdit: (voucher: VoucherBank) => void;
  onDelete: (id: string) => void;
}) {
  const total = voucher.items?.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) ?? 0;

  return (
    <tr>
      <td className="text-center">{index + 1}</td>
      <td className="font-mono font-semibold">{voucher.voucherNumber}</td>
      <td>{fmtDate(voucher.date)}</td>
      <td>{voucher.contactName}</td>
      {activeTab === "out" && (
        <td className="text-xs text-gray-600">
          {voucher.externalBankName
            ? `${voucher.externalBankName} – ${voucher.externalAccountNumber ?? "-"}`
            : "-"}
        </td>
      )}
      <td className="text-right font-medium">{IDR(total)}</td>
      <td>
        <div className="flex justify-center gap-1">
          <button
            className="btn btn-xs btn-outline"
            onClick={() => window.open(`/finance/voucher/bank/print/${voucher._id}`, "_blank")}
            title="Print"
          >
            🖨️
          </button>
          <button className="btn btn-xs btn-ghost" onClick={() => onEdit(voucher)} title="Edit">
            ✏️
          </button>
          <button
            className="btn btn-xs btn-error btn-outline"
            onClick={() => onDelete(voucher._id)}
            disabled={deleting}
            title="Hapus"
          >
            {deleting ? <span className="loading loading-spinner loading-xs" /> : "🗑️"}
          </button>
        </div>
      </td>
    </tr>
  );
}

// ──────────────────────────────────────────────
// Modal
// ──────────────────────────────────────────────
function VoucherModal({
  mode,
  activeTab,
  form,
  customers,
  bankAccounts,
  selectedBankAccount,
  filteredRefs,
  loadingRefs,
  saving,
  refSearch,
  grandTotal,
  onClose,
  onRefSearch,
  onFormChange,
  onBankChange,
  onDateChange,
  onAddInvoice,
  onAddCashflow,
  onAddPurchase,
  onAddDebt,
  onRemoveItem,
  onUpdateItem,
  onAddManualItem,
  onUpdateSignature,
  onSave,
}: {
  mode: Exclude<ModalMode, null>;
  activeTab: VoucherType;
  form: VoucherForm;
  customers: Customer[];
  bankAccounts: BankAccount[];
  selectedBankAccount: BankAccount | null;
  filteredRefs: {
    invoice: InvoicePaymentRef[];
    cashflow: CashflowRef[];
    purchase: PurchasePaymentRef[];
    debt: DebtPaymentRef[];
  };
  loadingRefs: boolean;
  saving: boolean;
  refSearch: string;
  grandTotal: number;
  onClose: () => void;
  onRefSearch: (value: string) => void;
  onFormChange: <K extends keyof VoucherForm>(field: K, value: VoucherForm[K]) => void;
  onBankChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onAddInvoice: (ref: InvoicePaymentRef) => void;
  onAddCashflow: (ref: CashflowRef) => void;
  onAddPurchase: (ref: PurchasePaymentRef) => void;
  onAddDebt: (ref: DebtPaymentRef) => void;
  onRemoveItem: (index: number) => void;
  onUpdateItem: <K extends keyof VoucherItem>(index: number, field: K, value: VoucherItem[K]) => void;
  onAddManualItem: () => void;
  onUpdateSignature: (key: keyof Signatures, field: keyof Signature, value: string) => void;
  onSave: () => void;
}) {
  const title = mode === "create" ? "Buat" : "Edit";
  const typeLabel = activeTab === "in" ? "Masuk" : "Keluar";

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[94vh] w-full max-w-[1200px] flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b px-5 py-4 sm:px-6">
          <h3 className="text-lg font-bold">
            {title} Bukti Voucher Bank{" "}
            <span className={activeTab === "in" ? "text-success" : "text-error"}>
              {typeLabel}
            </span>
          </h3>
          <button className="btn btn-sm btn-ghost" onClick={onClose} disabled={saving}>
            ✕
          </button>
        </div>

        {/* Scrollable form body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <BasicInfo
            form={form}
            activeTab={activeTab}
            customers={customers}
            onFormChange={onFormChange}
            onDateChange={onDateChange}
          />

          <BankFields
            activeTab={activeTab}
            form={form}
            bankAccounts={bankAccounts}
            selectedBankAccount={selectedBankAccount}
            onBankChange={onBankChange}
            onFormChange={onFormChange}
          />

          <ReferencePicker
            activeTab={activeTab}
            form={form}
            filteredRefs={filteredRefs}
            loadingRefs={loadingRefs}
            refSearch={refSearch}
            onRefSearch={onRefSearch}
            onAddInvoice={onAddInvoice}
            onAddCashflow={onAddCashflow}
            onAddPurchase={onAddPurchase}
            onAddDebt={onAddDebt}
          />

          <VoucherItems
            form={form}
            customers={customers}
            grandTotal={grandTotal}
            onRemoveItem={onRemoveItem}
            onUpdateItem={onUpdateItem}
            onAddManualItem={onAddManualItem}
          />

          <SignatureFields
            signatures={form.signatures}
            onUpdate={onUpdateSignature}
          />
        </div>

        {/* Footer */}
        <div className="flex shrink-0 justify-end gap-2 border-t bg-gray-50 px-5 py-4 sm:px-6">
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>
            Batal
          </button>
          <button className="btn btn-primary" onClick={onSave} disabled={saving}>
            {saving && <span className="loading loading-spinner loading-sm" />}
            {mode === "create" ? "Simpan Voucher" : "Perbarui Voucher"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Modal sections
// ──────────────────────────────────────────────
function SectionTitle({ children }: { children: ReactNode }) {
  return <div className="divider my-4 text-sm">{children}</div>;
}

function BasicInfo({
  form,
  activeTab,
  customers,
  onFormChange,
  onDateChange,
}: {
  form: VoucherForm;
  activeTab: VoucherType;
  customers: Customer[];
  onFormChange: <K extends keyof VoucherForm>(field: K, value: VoucherForm[K]) => void;
  onDateChange: (value: string) => void;
}) {
  return (
    <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
      <div className="form-control">
        <label className="label label-text font-semibold">No. Voucher</label>
        <input
          className="input input-bordered input-sm font-mono"
          value={form.voucherNumber}
          onChange={(event) => onFormChange("voucherNumber", event.target.value)}
        />
      </div>

      <div className="form-control">
        <label className="label label-text font-semibold">Tanggal</label>
        <input
          type="date"
          className="input input-bordered input-sm"
          value={form.date}
          onChange={(event) => onDateChange(event.target.value)}
        />
      </div>

      <div className="form-control">
        <label className="label label-text font-semibold">
          {activeTab === "in" ? "Diterima dari" : "Dibayarkan kepada"}
        </label>
        <input
          className="input input-bordered input-sm"
          placeholder="Nama penerima / pembayar..."
          value={form.contactName}
          onChange={(event) => onFormChange("contactName", event.target.value)}
          list="voucher-bank-customers"
        />
        <datalist id="voucher-bank-customers">
          {customers.map((customer) => (
            <option key={customer._id} value={customer.bussinessName || customer.name} />
          ))}
        </datalist>
      </div>
    </div>
  );
}

function BankFields({
  activeTab,
  form,
  bankAccounts,
  selectedBankAccount,
  onBankChange,
  onFormChange,
}: {
  activeTab: VoucherType;
  form: VoucherForm;
  bankAccounts: BankAccount[];
  selectedBankAccount: BankAccount | null;
  onBankChange: (value: string) => void;
  onFormChange: <K extends keyof VoucherForm>(field: K, value: VoucherForm[K]) => void;
}) {
  return (
    <div
      className={`mb-4 grid gap-4 ${activeTab === "in" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-3"
        }`}
    >
      <div className="form-control flex flex-row gap-3">
        <label className="label label-text font-semibold">
          {activeTab === "in" ? "🏦 Bank Penerima" : "🏦 Bank Pengirim"}
        </label>
        <select
          className="select select-bordered select-sm"
          value={form.companyBankAccountId}
          onChange={(event) => onBankChange(event.target.value)}
        >
          <option value="">-- Pilih Rekening --</option>
          {bankAccounts.map((account) => (
            <option key={account._id} value={account._id}>
              {account.bank} – {account.accountName}
            </option>
          ))}
        </select>
      </div>

      {activeTab === "in" ? (
        <div className="form-control flex flex-row gap-3">
          <label className="label label-text font-semibold">No. Rekening</label>
          <input
            className="input input-bordered input-sm bg-gray-50 font-mono"
            readOnly
            value={selectedBankAccount?.accountNumber ?? ""}
            placeholder="Otomatis terisi dari rekening yang dipilih"
          />
        </div>
      ) : (
        <>
          <div className="form-control">
            <label className="label label-text font-semibold">🏛️ Bank Penerima</label>
            <select
              className="select select-bordered select-sm"
              value={form.externalBankName}
              onChange={(event) => onFormChange("externalBankName", event.target.value)}
            >
              <option value="">-- Pilih Bank --</option>
              {BANK_OPTIONS.map((bank) => (
                <option key={bank} value={bank}>
                  {bank}
                </option>
              ))}
            </select>
          </div>

          <div className="form-control">
            <label className="label label-text font-semibold">No. Rekening</label>
            <input
              className="input input-bordered input-sm font-mono"
              placeholder="Masukkan nomor rekening penerima..."
              value={form.externalAccountNumber}
              onChange={(event) => onFormChange("externalAccountNumber", event.target.value)}
            />
          </div>
        </>
      )}
    </div>
  );
}

function ReferencePicker({
  activeTab,
  form,
  filteredRefs,
  loadingRefs,
  refSearch,
  onRefSearch,
  onAddInvoice,
  onAddCashflow,
  onAddPurchase,
  onAddDebt,
}: {
  activeTab: VoucherType;
  form: VoucherForm;
  filteredRefs: {
    invoice: InvoicePaymentRef[];
    cashflow: CashflowRef[];
    purchase: PurchasePaymentRef[];
    debt: DebtPaymentRef[];
  };
  loadingRefs: boolean;
  refSearch: string;
  onRefSearch: (value: string) => void;
  onAddInvoice: (ref: InvoicePaymentRef) => void;
  onAddCashflow: (ref: CashflowRef) => void;
  onAddPurchase: (ref: PurchasePaymentRef) => void;
  onAddDebt: (ref: DebtPaymentRef) => void;
}) {
  return (
    <>
      <SectionTitle>Pilih Relasi Item</SectionTitle>

      <div className="mb-3">
        <input
          className="input input-bordered input-sm mb-2 w-full"
          placeholder="Cari referensi..."
          value={refSearch}
          onChange={(event) => onRefSearch(event.target.value)}
        />

        {loadingRefs ? (
          <div className="flex justify-center py-4">
            <span className="loading loading-spinner" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {activeTab === "in" && (
              <ReferenceList
                title="📄 Invoice (Payment History)"
                refs={filteredRefs.invoice}
                emptyText="Tidak ada data"
                getKey={(ref) => ref.paymentHistoryId}
                isAdded={(ref) => form.items.some((item) => item.paymentHistoryId === ref.paymentHistoryId)}
                renderTitle={(ref) => ref.invoiceNumber}
                renderMeta={(ref) => `(${ref.method})`}
                renderSub={(ref) => `${fmtDate(ref.date)} · Rp ${IDR(ref.amount)}`}
                onAdd={onAddInvoice}
              />
            )}

            {activeTab === "out" && (
              <ReferenceList
                title="🛒 Purchase Payment"
                refs={filteredRefs.purchase}
                emptyText="Tidak ada data"
                getKey={(ref) => ref.paymentHistoryId}
                isAdded={(ref) => form.items.some((item) => item.paymentHistoryId === ref.paymentHistoryId)}
                renderTitle={(ref) => ref.purchaseOrderNumber}
                renderMeta={(ref) => `(${ref.method})`}
                renderSub={(ref) => `${fmtDate(ref.date)} · Rp ${IDR(ref.amount)}`}
                onAdd={onAddPurchase}
              />
            )}

            {activeTab === "out" && (
              <ReferenceList
                title="🤝 Hutang Vendor"
                refs={filteredRefs.debt}
                emptyText="Tidak ada data"
                getKey={(ref) => ref.paymentHistoryId}
                isAdded={(ref) => form.items.some((item) => item.paymentHistoryId === ref.paymentHistoryId)}
                renderTitle={(ref) => ref.invoiceNumber}
                renderMeta={(ref) => `(${ref.method})`}
                renderSub={(ref) => `${fmtDate(ref.date)} · Rp ${IDR(ref.amount)}`}
                onAdd={onAddDebt}
              />
            )}

            <ReferenceList
              title="🏦 Cashflow Bank Manual"
              refs={filteredRefs.cashflow}
              emptyText="Tidak ada data"
              getKey={(ref) => ref.cashflowId}
              isAdded={(ref) => form.items.some((item) => item.refId === ref.cashflowId)}
              renderTitle={(ref) =>
                ref.reference || (activeTab === "in" ? ref.from : ref.to) || "—"
              }
              renderMeta={() => ""}
              renderSub={(ref) => `${fmtDate(ref.date)} · Rp ${IDR(ref.amount)}`}
              onAdd={onAddCashflow}
            />
          </div>
        )}
      </div>
    </>
  );
}

function ReferenceList<T>({
  title,
  refs,
  emptyText,
  getKey,
  isAdded,
  renderTitle,
  renderMeta,
  renderSub,
  onAdd,
}: {
  title: string;
  refs: T[];
  emptyText: string;
  getKey: (ref: T) => string;
  isAdded: (ref: T) => boolean;
  renderTitle: (ref: T) => string;
  renderMeta: (ref: T) => string;
  renderSub: (ref: T) => string;
  onAdd: (ref: T) => void;
}) {
  return (
    <div className="max-h-52 overflow-y-auto rounded-lg border p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p>

      {!refs.length ? (
        <p className="py-2 text-center text-xs text-gray-400">{emptyText}</p>
      ) : (
        refs.map((ref) => {
          const added = isAdded(ref);

          return (
            <div
              key={getKey(ref)}
              className="flex items-center justify-between gap-2 border-b py-1.5 text-xs last:border-0"
            >
              <div className="min-w-0 flex-1">
                <span className="font-semibold">{renderTitle(ref)}</span>
                {renderMeta(ref) && <span className="ml-1 text-gray-400">{renderMeta(ref)}</span>}
                <span className="block text-gray-500">{renderSub(ref)}</span>
              </div>
              <button
                className="btn btn-xs btn-primary shrink-0"
                disabled={added}
                onClick={() => onAdd(ref)}
              >
                {added ? "✓" : "+ Tambah"}
              </button>
            </div>
          );
        })
      )}
    </div>
  );
}

function VoucherItems({
  form,
  customers,
  grandTotal,
  onRemoveItem,
  onUpdateItem,
  onAddManualItem,
}: {
  form: VoucherForm;
  customers: Customer[];
  grandTotal: number;
  onRemoveItem: (index: number) => void;
  onUpdateItem: <K extends keyof VoucherItem>(index: number, field: K, value: VoucherItem[K]) => void;
  onAddManualItem: () => void;
}) {
  return (
    <>
      <SectionTitle>Item Voucher</SectionTitle>

      <div className="mb-4 overflow-x-auto">
        <table className="table table-sm w-full border">
          <thead>
            <tr className="bg-gray-50">
              <th className="w-8 text-center">No</th>
              <th>Keterangan</th>
              <th className="w-44">Nama Customer</th>
              <th className="w-40 text-right">Jumlah (Rp)</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {!form.items.length ? (
              <tr>
                <td colSpan={5} className="py-4 text-center text-sm text-gray-400">
                  Belum ada item – pilih relasi di atas atau tambah manual
                </td>
              </tr>
            ) : (
              form.items.map((item, index) => (
                <tr key={`${item.refId ?? item.paymentHistoryId ?? "manual"}-${index}`}>
                  <td className="text-center text-gray-400">{index + 1}</td>
                  <td>
                    <input
                      className="input input-xs input-ghost w-full"
                      value={item.description}
                      onChange={(event) =>
                        onUpdateItem(index, "description", event.target.value)
                      }
                    />
                  </td>
                  <td>
                    <input
                      className="input input-xs input-ghost w-full"
                      value={item.customerName}
                      placeholder="Customer..."
                      onChange={(event) =>
                        onUpdateItem(index, "customerName", event.target.value)
                      }
                      list="voucher-bank-item-customers"
                    />
                    <datalist id="voucher-bank-item-customers">
                      {customers.map((customer) => (
                        <option
                          key={customer._id}
                          value={customer.bussinessName || customer.name}
                        />
                      ))}
                    </datalist>
                  </td>
                  <td className="text-right">
                    <input
                      type="number"
                      className="input input-xs input-ghost w-full text-right"
                      value={item.amount}
                      onChange={(event) =>
                        onUpdateItem(index, "amount", Number(event.target.value) || 0)
                      }
                    />
                  </td>
                  <td>
                    <button
                      className="btn btn-xs btn-ghost text-error"
                      onClick={() => onRemoveItem(index)}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 font-bold">
              <td colSpan={3} className="pr-4 text-right text-sm">
                TERBILANG:
              </td>
              <td className="text-right">Rp {IDR(grandTotal)}</td>
              <td />
            </tr>
          </tfoot>
        </table>

        <button
          className="btn btn-xs mt-2 w-full border border-dashed text-gray-400"
          onClick={onAddManualItem}
        >
          ＋ Tambah Item Manual
        </button>
      </div>
    </>
  );
}

function SignatureFields({
  signatures,
  onUpdate,
}: {
  signatures: Signatures;
  onUpdate: (key: keyof Signatures, field: keyof Signature, value: string) => void;
}) {
  return (
    <>
      <SectionTitle>Tanda Tangan</SectionTitle>

      <div className="mb-2 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SIGNATURE_FIELDS.map(([key, label]) => (
          <div key={key} className="rounded-lg border p-3">
            <p className="mb-2 text-xs font-semibold text-gray-500">{label}</p>
            <input
              className="input input-xs input-bordered mb-1 w-full"
              placeholder="Nama..."
              value={signatures[key].name}
              onChange={(event) => onUpdate(key, "name", event.target.value)}
            />
            <input
              type="date"
              className="input input-xs input-bordered w-full"
              value={signatures[key].date}
              onChange={(event) => onUpdate(key, "date", event.target.value)}
            />
          </div>
        ))}
      </div>
    </>
  );
}
