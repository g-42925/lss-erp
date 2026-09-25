/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback } from "react";
import useAuth from "@/store/auth";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────
type VoucherItem = {
  description: string;
  customerName: string;
  amount: number;
  refModel?: "Invoice" | "Cashflow" | "Purchase" | "Debt";
  refId?: string;
  paymentHistoryId?: string;
};

type Signatures = {
  dibukukanOleh: { name: string; date: string };
  disetujuiOleh: { name: string; date: string };
  dicekOleh: { name: string; date: string };
  dibuatOleh: { name: string; date: string };
};

type VoucherCash = {
  _id: string;
  type: "in" | "out";
  voucherNumber: string;
  contactName: string;
  date: string;
  items: VoucherItem[];
  signatures: Signatures;
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

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
const IDR = (v: number) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v ?? 0);

const fmtDate = (d: string) => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const todayStr = () => new Date().toISOString().split("T")[0];

const emptySignatures = (): Signatures => ({
  dibukukanOleh: { name: "", date: todayStr() },
  disetujuiOleh: { name: "", date: todayStr() },
  dicekOleh: { name: "", date: todayStr() },
  dibuatOleh: { name: "", date: todayStr() },
});

// ──────────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────────
export default function VoucherCashPage() {
  const masterAccountId = useAuth((s) => s.masterAccountId);
  const hasHydrated = useAuth((s) => s._hasHydrated);

  const [activeTab, setActiveTab] = useState<"in" | "out">("in");
  const [vouchers, setVouchers] = useState<VoucherCash[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  // Refs available for linking
  const [invoiceRefs, setInvoiceRefs] = useState<InvoicePaymentRef[]>([]);
  const [cashflowRefs, setCashflowRefs] = useState<CashflowRef[]>([]);
  const [purchaseRefs, setPurchaseRefs] = useState<PurchasePaymentRef[]>([]);
  const [debtRefs, setDebtRefs] = useState<DebtPaymentRef[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(false);

  // Modal state
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form
  const [form, setForm] = useState({
    voucherNumber: "",
    contactName: "",
    date: todayStr(),
    items: [] as VoucherItem[],
    signatures: emptySignatures(),
  });

  const [editId, setEditId] = useState<string | null>(null);

  // Ref search filter
  const [refSearch, setRefSearch] = useState("");

  // ─── Fetch vouchers ───────────────────────────────────────────────────────
  const fetchVouchers = useCallback(async () => {
    if (!masterAccountId) return;
    setLoadingList(true);
    try {
      const res = await fetch(`/api/web/voucher-cash?id=${masterAccountId}&type=${activeTab}`);
      const data = await res.json();
      setVouchers(data.error ? [] : data.result ?? []);
    } catch {
      setVouchers([]);
    } finally {
      setLoadingList(false);
    }
  }, [masterAccountId, activeTab]);

  useEffect(() => {
    if (hasHydrated) fetchVouchers();
  }, [hasHydrated, fetchVouchers]);

  // ─── Fetch refs for picker ────────────────────────────────────────────────
  const fetchRefs = useCallback(async () => {
    if (!masterAccountId) return;
    setLoadingRefs(true);
    try {
      const res = await fetch(`/api/web/voucher-cash?id=${masterAccountId}&type=${activeTab}&mode=refs`);
      const data = await res.json();
      if (!data.error && data.result) {
        setInvoiceRefs(data.result.invoicePayments ?? []);
        setCashflowRefs(data.result.cashflows ?? []);
        setPurchaseRefs(data.result.purchasePayments ?? []);
        setDebtRefs(data.result.debtPayments ?? []);
      }
    } catch {
      /* silent */
    } finally {
      setLoadingRefs(false);
    }
  }, [masterAccountId, activeTab]);

  // ─── Open create modal ────────────────────────────────────────────────────
  const openCreate = async () => {
    const num = `VC-${Date.now().toString().slice(-6)}`;
    setForm({ voucherNumber: num, contactName: "", date: todayStr(), items: [], signatures: emptySignatures() });
    setEditId(null);
    setRefSearch("");
    setModalMode("create");
    await fetchRefs();
  };

  // ─── Open edit modal ──────────────────────────────────────────────────────
  const openEdit = async (v: VoucherCash) => {
    setForm({
      voucherNumber: v.voucherNumber,
      contactName: v.contactName,
      date: v.date ? v.date.split("T")[0] : todayStr(),
      items: v.items ?? [],
      signatures: v.signatures ?? emptySignatures(),
    });
    setEditId(v._id);
    setRefSearch("");
    setModalMode("edit");
    await fetchRefs();
  };

  // ─── Add item from ref ────────────────────────────────────────────────────
  const addFromInvoice = (ref: InvoicePaymentRef) => {
    // prevent duplicate
    if (form.items.find((i) => i.paymentHistoryId === ref.paymentHistoryId)) return;
    setForm((f) => ({
      ...f,
      items: [
        ...f.items,
        {
          description: `Invoice ${ref.invoiceNumber} – ${ref.method}`,
          customerName: "",
          amount: ref.amount,
          refModel: "Invoice",
          refId: ref.invoiceId,
          paymentHistoryId: ref.paymentHistoryId,
        },
      ],
    }));
  };

  const addFromCashflow = (ref: CashflowRef) => {
    if (form.items.find((i) => i.refId === ref.cashflowId)) return;
    setForm((f) => ({
      ...f,
      items: [
        ...f.items,
        {
          description: ref.reference || (activeTab === "in" ? ref.from : ref.to) || "Manual Cashflow",
          customerName: activeTab === "in" ? (ref.from ?? "") : (ref.to ?? ""),
          amount: ref.amount,
          refModel: "Cashflow",
          refId: ref.cashflowId,
        },
      ],
    }));
  };

  const addFromPurchase = (ref: PurchasePaymentRef) => {
    if (form.items.find((i) => i.paymentHistoryId === ref.paymentHistoryId)) return;
    setForm((f) => ({
      ...f,
      items: [
        ...f.items,
        {
          description: `Purchase ${ref.purchaseOrderNumber} - ${ref.paymentNumber}`,
          customerName: "",
          amount: ref.amount,
          refModel: "Purchase",
          refId: ref.purchaseId,
          paymentHistoryId: ref.paymentHistoryId,
        },
      ],
    }));
  };

  const addFromDebt = (ref: DebtPaymentRef) => {
    if (form.items.find((i) => i.paymentHistoryId === ref.paymentHistoryId)) return;
    setForm((f) => ({
      ...f,
      items: [
        ...f.items,
        {
          description: `Vendor Debt ${ref.invoiceNumber} - ${ref.paymentNumber}`,
          customerName: "",
          amount: ref.amount,
          refModel: "Debt",
          refId: ref.invoiceId,
          paymentHistoryId: ref.paymentHistoryId,
        },
      ],
    }));
  };

  const removeItem = (idx: number) =>
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const updateItem = (idx: number, field: keyof VoucherItem, value: any) =>
    setForm((f) => {
      const items = [...f.items];
      items[idx] = { ...items[idx], [field]: value };
      return { ...f, items };
    });

  const updateSig = (key: keyof Signatures, field: "name" | "date", value: string) =>
    setForm((f) => ({ ...f, signatures: { ...f.signatures, [key]: { ...f.signatures[key], [field]: value } } }));

  // ─── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.contactName.trim()) { alert("Nama harus diisi"); return; }
    if (!form.voucherNumber.trim()) { alert("Nomor voucher harus diisi"); return; }
    if (form.items.length === 0) { alert("Tambahkan minimal 1 item"); return; }

    setSaving(true);
    try {
      const payload = { ...form, type: activeTab, masterAccountId };
      const isEdit = modalMode === "edit" && editId;
      const res = await fetch(
        isEdit ? `/api/web/voucher-cash/${editId}` : "/api/web/voucher-cash",
        { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
      );
      const data = await res.json();
      if (data.error) throw new Error(data.message);
      setModalMode(null);
      fetchVouchers();
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm("Hapus voucher ini? Relasi ke Invoice/Cashflow akan dilepas.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/web/voucher-cash/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.error) throw new Error(data.message);
      fetchVouchers();
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setDeletingId(null);
    }
  };

  // ─── Totals ───────────────────────────────────────────────────────────────
  const grandTotal = form.items.reduce((s, i) => s + (Number(i.amount) || 0), 0);

  // ─── Filtered refs ────────────────────────────────────────────────────────
  const filteredInvoiceRefs = invoiceRefs.filter(
    (r) =>
      r.invoiceNumber.toLowerCase().includes(refSearch.toLowerCase()) ||
      r.method.toLowerCase().includes(refSearch.toLowerCase())
  );
  const filteredCashflowRefs = cashflowRefs.filter(
    (r) =>
      (r.reference ?? "").toLowerCase().includes(refSearch.toLowerCase()) ||
      (r.from ?? "").toLowerCase().includes(refSearch.toLowerCase()) ||
      (r.to ?? "").toLowerCase().includes(refSearch.toLowerCase())
  );
  const filteredPurchaseRefs = purchaseRefs.filter(
    (r) =>
      r.purchaseOrderNumber.toLowerCase().includes(refSearch.toLowerCase()) ||
      r.paymentNumber.toLowerCase().includes(refSearch.toLowerCase())
  );
  const filteredDebtRefs = debtRefs.filter(
    (r) =>
      r.invoiceNumber.toLowerCase().includes(refSearch.toLowerCase()) ||
      r.paymentNumber.toLowerCase().includes(refSearch.toLowerCase())
  );

  if (!hasHydrated) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Voucher</h1>
          <p className="text-sm text-gray-500">Bukti Voucher Cash Masuk / Keluar</p>
        </div>
        <button
          onClick={openCreate}
          className="btn btn-primary gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Buat Voucher
        </button>
      </div>

      {/* ── Sub-menu tabs ── */}
      <div className="tabs tabs-boxed bg-gray-100 mb-6 w-fit">
        <button
          className={`tab font-semibold ${activeTab === "in" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("in")}
        >
          💰 Voucher Cash Masuk
        </button>
        <button
          className={`tab font-semibold ${activeTab === "out" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("out")}
        >
          💸 Voucher Cash Keluar
        </button>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="table table-zebra w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="w-12 text-center">No</th>
              <th>No. Voucher</th>
              <th>Tanggal</th>
              <th>{activeTab === "in" ? "Diterima dari" : "Dibayarkan kepada"}</th>
              <th className="text-right">Total (Rp)</th>
              <th className="text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loadingList ? (
              <tr><td colSpan={6} className="text-center py-8"><span className="loading loading-spinner" /></td></tr>
            ) : vouchers.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-gray-400">
                  <div className="flex flex-col items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    <span>Belum ada data voucher</span>
                  </div>
                </td>
              </tr>
            ) : (
              vouchers.map((v, idx) => (
                <tr key={v._id}>
                  <td className="text-center">{idx + 1}</td>
                  <td className="font-mono font-semibold">{v.voucherNumber}</td>
                  <td>{fmtDate(v.date)}</td>
                  <td>{v.contactName}</td>
                  <td className="text-right font-medium">
                    {IDR(v.items?.reduce((s, i) => s + (i.amount || 0), 0) ?? 0)}
                  </td>
                  <td>
                    <div className="flex gap-1 justify-center">
                      <button
                        className="btn btn-xs btn-outline"
                        onClick={() => window.open(`/finance/voucher/cash/print/${v._id}`, "_blank")}
                        title="Print"
                      >🖨️</button>
                      <button
                        className="btn btn-xs btn-ghost"
                        onClick={() => openEdit(v)}
                        title="Edit"
                      >✏️</button>
                      <button
                        className="btn btn-xs btn-error btn-outline"
                        onClick={() => handleDelete(v._id)}
                        disabled={deletingId === v._id}
                        title="Hapus"
                      >
                        {deletingId === v._id ? <span className="loading loading-spinner loading-xs" /> : "🗑️"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ══════════════════════════════════════════════════
          MODAL CREATE / EDIT
      ══════════════════════════════════════════════════ */}
      {modalMode && (
        <div className="modal modal-open z-50">
          <div className="modal-box w-11/12 max-w-5xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">
                {modalMode === "create" ? "Buat" : "Edit"} Bukti Voucher Cash{" "}
                <span className={activeTab === "in" ? "text-success" : "text-error"}>
                  {activeTab === "in" ? "Masuk" : "Keluar"}
                </span>
              </h3>
              <button className="btn btn-sm btn-ghost" onClick={() => setModalMode(null)}>✕</button>
            </div>

            {/* ── Basic Info ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="form-control">
                <label className="label label-text font-semibold">No. Voucher</label>
                <input
                  className="input input-bordered input-sm font-mono"
                  value={form.voucherNumber}
                  onChange={(e) => setForm((f) => ({ ...f, voucherNumber: e.target.value }))}
                />
              </div>
              <div className="form-control">
                <label className="label label-text font-semibold">Tanggal</label>
                <input
                  type="date"
                  className="input input-bordered input-sm"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div className="form-control md:col-span-1">
                <label className="label label-text font-semibold">
                  {activeTab === "in" ? "Diterima dari" : "Dibayarkan kepada"}
                </label>
                <input
                  className="input input-bordered input-sm"
                  placeholder="Nama penerima / pembayar..."
                  value={form.contactName}
                  onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
                />
              </div>
            </div>

            <div className="divider text-sm">Pilih Relasi Item</div>

            {/* ── Ref Picker ── */}
            <div className="mb-3">
              <input
                className="input input-bordered input-sm w-full mb-2"
                placeholder="Cari referensi..."
                value={refSearch}
                onChange={(e) => setRefSearch(e.target.value)}
              />
              {loadingRefs ? (
                <div className="flex justify-center py-4"><span className="loading loading-spinner" /></div>
              ) : (
                <div className="flex gap-3">
                  {/* Invoice Payment (only for Masuk) */}
                  {activeTab === "in" && (
                    <div className="flex-1 border rounded-lg p-3 max-h-44 overflow-y-auto">
                      <p className="font-semibold text-xs text-gray-500 mb-2 uppercase tracking-wide">
                        📄 Invoice (Payment History)
                      </p>
                      {filteredInvoiceRefs.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-2">Tidak ada data</p>
                      ) : (
                        filteredInvoiceRefs.map((ref) => {
                          const alreadyAdded = form.items.some((i) => i.paymentHistoryId === ref.paymentHistoryId);
                          return (
                            <div key={ref.paymentHistoryId} className="flex items-center justify-between gap-2 text-xs border-b py-1.5 last:border-0">
                              <div className="flex-1 min-w-0">
                                <span className="font-semibold">{ref.invoiceNumber}</span>
                                <span className="text-gray-400 ml-1">({ref.method})</span>
                                <span className="block text-gray-500">{fmtDate(ref.date)} · Rp {IDR(ref.amount)}</span>
                              </div>
                              <button
                                className="btn btn-xs btn-primary shrink-0"
                                disabled={alreadyAdded}
                                onClick={() => addFromInvoice(ref)}
                              >
                                {alreadyAdded ? "✓" : "+ Tambah"}
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* Purchase Payment (only for Keluar) */}
                  {activeTab === "out" && (
                    <div className="flex-1 border rounded-lg p-3 max-h-44 overflow-y-auto">
                      <p className="font-semibold text-xs text-gray-500 mb-2 uppercase tracking-wide">
                        🛒 Purchase Payment
                      </p>
                      {filteredPurchaseRefs.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-2">Tidak ada data</p>
                      ) : (
                        filteredPurchaseRefs.map((ref) => {
                          const alreadyAdded = form.items.some((i) => i.paymentHistoryId === ref.paymentHistoryId);
                          return (
                            <div key={ref.paymentHistoryId} className="flex items-center justify-between gap-2 text-xs border-b py-1.5 last:border-0">
                              <div className="flex-1 min-w-0">
                                <span className="font-semibold">{ref.purchaseOrderNumber}</span>
                                <span className="text-gray-400 ml-1">({ref.method})</span>
                                <span className="block text-gray-500">{fmtDate(ref.date)} · Rp {IDR(ref.amount)}</span>
                              </div>
                              <button
                                className="btn btn-xs btn-primary shrink-0"
                                disabled={alreadyAdded}
                                onClick={() => addFromPurchase(ref)}
                              >
                                {alreadyAdded ? "✓" : "+ Tambah"}
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* Debt Payment (only for Keluar) */}
                  {activeTab === "out" && (
                    <div className="flex-1 border rounded-lg p-3 max-h-44 overflow-y-auto">
                      <p className="font-semibold text-xs text-gray-500 mb-2 uppercase tracking-wide">
                        🤝 Hutang Vendor
                      </p>
                      {filteredDebtRefs.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-2">Tidak ada data</p>
                      ) : (
                        filteredDebtRefs.map((ref) => {
                          const alreadyAdded = form.items.some((i) => i.paymentHistoryId === ref.paymentHistoryId);
                          return (
                            <div key={ref.paymentHistoryId} className="flex items-center justify-between gap-2 text-xs border-b py-1.5 last:border-0">
                              <div className="flex-1 min-w-0">
                                <span className="font-semibold">{ref.invoiceNumber}</span>
                                <span className="text-gray-400 ml-1">({ref.method})</span>
                                <span className="block text-gray-500">{fmtDate(ref.date)} · Rp {IDR(ref.amount)}</span>
                              </div>
                              <button
                                className="btn btn-xs btn-primary shrink-0"
                                disabled={alreadyAdded}
                                onClick={() => addFromDebt(ref)}
                              >
                                {alreadyAdded ? "✓" : "+ Tambah"}
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* Cashflow Manual */}
                  <div className="flex-1 border rounded-lg p-3 max-h-44 overflow-y-auto">
                    <p className="font-semibold text-xs text-gray-500 mb-2 uppercase tracking-wide">
                      💵 Cashflow Manual
                    </p>
                    {filteredCashflowRefs.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-2">Tidak ada data</p>
                    ) : (
                      filteredCashflowRefs.map((ref) => {
                        const alreadyAdded = form.items.some((i) => i.refId === ref.cashflowId);
                        return (
                          <div key={ref.cashflowId} className="flex items-center justify-between gap-2 text-xs border-b py-1.5 last:border-0">
                            <div className="flex-1 min-w-0">
                              <span className="font-semibold">{ref.reference || (activeTab === "in" ? ref.from : ref.to) || "—"}</span>
                              <span className="block text-gray-500">{fmtDate(ref.date)} · Rp {IDR(ref.amount)}</span>
                            </div>
                            <button
                              className="btn btn-xs btn-primary shrink-0"
                              disabled={alreadyAdded}
                              onClick={() => addFromCashflow(ref)}
                            >
                              {alreadyAdded ? "✓" : "+ Tambah"}
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="divider text-sm">Item Voucher</div>

            {/* ── Items Table ── */}
            <div className="overflow-x-auto mb-4">
              <table className="table table-sm w-full border">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="w-8 text-center">No</th>
                    <th>Keterangan</th>
                    <th className="w-44">Nama Customer</th>
                    <th className="w-40 text-right">Jumlah (Rp)</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {form.items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center text-gray-400 py-4 text-sm">
                        Belum ada item – pilih relasi di atas atau tambah manual
                      </td>
                    </tr>
                  ) : (
                    form.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="text-center text-gray-400">{idx + 1}</td>
                        <td>
                          <input
                            className="input input-xs input-ghost w-full"
                            value={item.description}
                            onChange={(e) => updateItem(idx, "description", e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            className="input input-xs input-ghost w-full"
                            value={item.customerName}
                            placeholder="Customer..."
                            onChange={(e) => updateItem(idx, "customerName", e.target.value)}
                          />
                        </td>
                        <td className="text-right">
                          <input
                            type="number"
                            className="input input-xs input-ghost w-full text-right"
                            value={item.amount}
                            onChange={(e) => updateItem(idx, "amount", parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td>
                          <button className="btn btn-xs btn-ghost text-error" onClick={() => removeItem(idx)}>✕</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="font-bold bg-gray-50">
                    <td colSpan={3} className="text-right pr-4 text-sm">TERBILANG:</td>
                    <td className="text-right">Rp {IDR(grandTotal)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
              <button
                className="btn btn-xs btn-ghost mt-2 border border-dashed w-full text-gray-400"
                onClick={() => setForm((f) => ({
                  ...f,
                  items: [...f.items, { description: "", customerName: "", amount: 0 }],
                }))}
              >
                + Tambah Item Manual
              </button>
            </div>

            {/* ── Signatures ── */}
            <div className="divider text-sm">Tanda Tangan</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {(["dibukukanOleh", "disetujuiOleh", "dicekOleh", "dibuatOleh"] as const).map((key) => {
                const labels: Record<string, string> = {
                  dibukukanOleh: "Dibukukan Oleh",
                  disetujuiOleh: "Disetujui Oleh",
                  dicekOleh: "Dicek Oleh",
                  dibuatOleh: "Dibuat Oleh",
                };
                return (
                  <div key={key} className="border rounded-lg p-3">
                    <p className="text-xs font-semibold text-gray-500 mb-2">{labels[key]}</p>
                    <input
                      className="input input-xs input-bordered w-full mb-1"
                      placeholder="Nama..."
                      value={form.signatures[key].name}
                      onChange={(e) => updateSig(key, "name", e.target.value)}
                    />
                    <input
                      type="date"
                      className="input input-xs input-bordered w-full"
                      value={form.signatures[key].date}
                      onChange={(e) => updateSig(key, "date", e.target.value)}
                    />
                  </div>
                );
              })}
            </div>

            {/* ── Actions ── */}
            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setModalMode(null)}>Batal</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <span className="loading loading-spinner loading-sm" /> : null}
                {modalMode === "create" ? "Simpan Voucher" : "Perbarui Voucher"}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setModalMode(null)} />
        </div>
      )}
    </div>
  );
}
