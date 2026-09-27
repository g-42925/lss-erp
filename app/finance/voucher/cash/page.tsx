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

const IDR = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value ?? 0);

const fmtDate = (value: string) => {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const todayStr = () => new Date().toISOString().split("T")[0];

const emptySignatures = (): Signatures => ({
  dibukukanOleh: {
    name: "",
    date: todayStr(),
  },
  disetujuiOleh: {
    name: "",
    date: todayStr(),
  },
  dicekOleh: {
    name: "",
    date: todayStr(),
  },
  dibuatOleh: {
    name: "",
    date: todayStr(),
  },
});

// ──────────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────────

export default function VoucherCashPage() {
  const masterAccountId = useAuth((state) => state.masterAccountId);
  const hasHydrated = useAuth((state) => state._hasHydrated);

  const [activeTab, setActiveTab] =
    useState<"in" | "out">("in");

  const [vouchers, setVouchers] = useState<VoucherCash[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  // References
  const [invoiceRefs, setInvoiceRefs] =
    useState<InvoicePaymentRef[]>([]);

  const [cashflowRefs, setCashflowRefs] =
    useState<CashflowRef[]>([]);

  const [purchaseRefs, setPurchaseRefs] =
    useState<PurchasePaymentRef[]>([]);

  const [debtRefs, setDebtRefs] =
    useState<DebtPaymentRef[]>([]);

  const [loadingRefs, setLoadingRefs] = useState(false);

  // Customers
  const [customers, setCustomers] = useState<any[]>([]);

  // Modal
  const [modalMode, setModalMode] =
    useState<"create" | "edit" | null>(null);

  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  // Form
  const [form, setForm] = useState({
    voucherNumber: "",
    contactName: "",
    date: todayStr(),
    items: [] as VoucherItem[],
    signatures: emptySignatures(),
  });

  const [refSearch, setRefSearch] = useState("");

  // ──────────────────────────────────────────────
  // Fetch vouchers
  // ──────────────────────────────────────────────

  const fetchVouchers = useCallback(async () => {
    if (!masterAccountId) return;

    setLoadingList(true);

    try {
      const response = await fetch(
        `/api/web/voucher-cash?id=${masterAccountId}&type=${activeTab}`
      );

      const data = await response.json();

      setVouchers(
        data.error
          ? []
          : data.result ?? []
      );
    } catch {
      setVouchers([]);
    } finally {
      setLoadingList(false);
    }
  }, [masterAccountId, activeTab]);

  useEffect(() => {
    if (hasHydrated) {
      fetchVouchers();
    }
  }, [hasHydrated, fetchVouchers]);

  // ──────────────────────────────────────────────
  // Fetch customers
  // ──────────────────────────────────────────────

  const fetchCustomers = useCallback(async () => {
    if (!masterAccountId) return;

    try {
      const response = await fetch(
        `/api/web/customers?id=${masterAccountId}`
      );

      const data = await response.json();

      setCustomers(
        data.error
          ? []
          : data.result ?? []
      );
    } catch {
      // silent
    }
  }, [masterAccountId]);

  useEffect(() => {
    if (hasHydrated) {
      fetchCustomers();
    }
  }, [hasHydrated, fetchCustomers]);

  // ──────────────────────────────────────────────
  // Fetch references
  // ──────────────────────────────────────────────

  const fetchRefs = useCallback(async () => {
    if (!masterAccountId) return;

    setLoadingRefs(true);

    try {
      const response = await fetch(
        `/api/web/voucher-cash?id=${masterAccountId}&type=${activeTab}&mode=refs`
      );

      const data = await response.json();

      if (!data.error && data.result) {
        setInvoiceRefs(
          data.result.invoicePayments ?? []
        );

        setCashflowRefs(
          data.result.cashflows ?? []
        );

        setPurchaseRefs(
          data.result.purchasePayments ?? []
        );

        setDebtRefs(
          data.result.debtPayments ?? []
        );
      }
    } catch {
      // silent
    } finally {
      setLoadingRefs(false);
    }
  }, [masterAccountId, activeTab]);

  // ──────────────────────────────────────────────
  // Modal
  // ──────────────────────────────────────────────

  const openCreate = async () => {
    setForm({
      voucherNumber: "Memuat...",
      contactName: "",
      date: todayStr(),
      items: [],
      signatures: emptySignatures(),
    });

    setEditId(null);
    setRefSearch("");
    setModalMode("create");

    await fetchRefs();

    try {
      if (masterAccountId) {
        const response = await fetch(
          `/api/web/voucher-cash?id=${masterAccountId}&type=${activeTab}&mode=generate-number`
        );
        const data = await response.json();
        if (!data.error && data.result?.voucherNumber) {
          setForm(f => ({ ...f, voucherNumber: data.result.voucherNumber }));
        } else {
          setForm(f => ({ ...f, voucherNumber: data.message || "[Gagal get number]" }));
        }
      } else {
        setForm(f => ({ ...f, voucherNumber: "[No Master Account ID]" }));
      }
    } catch (e: any) {
      setForm(f => ({ ...f, voucherNumber: e?.message || "[Catch Error]" }));
    }
  };

  const openEdit = async (voucher: VoucherCash) => {
    setForm({
      voucherNumber: voucher.voucherNumber,
      contactName: voucher.contactName,
      date: voucher.date
        ? voucher.date.split("T")[0]
        : todayStr(),
      items: voucher.items ?? [],
      signatures:
        voucher.signatures ??
        emptySignatures(),
    });

    setEditId(voucher._id);
    setRefSearch("");
    setModalMode("edit");

    await fetchRefs();
  };

  const closeModal = () => {
    if (saving) return;

    setModalMode(null);
    setEditId(null);
    setRefSearch("");
  };

  // ──────────────────────────────────────────────
  // Item helpers
  // ──────────────────────────────────────────────

  const addItem = (item: VoucherItem) => {
    setForm((current) => ({
      ...current,
      items: [
        ...current.items,
        item,
      ],
    }));
  };

  const addManualItem = () => {
    addItem({
      description: "",
      customerName: "",
      amount: 0,
    });
  };

  const removeItem = (index: number) => {
    setForm((current) => ({
      ...current,
      items: current.items.filter(
        (_, itemIndex) =>
          itemIndex !== index
      ),
    }));
  };

  const updateItem = (
    index: number,
    field: keyof VoucherItem,
    value: any
  ) => {
    setForm((current) => {
      const items = [...current.items];

      items[index] = {
        ...items[index],
        [field]: value,
      };

      return {
        ...current,
        items,
      };
    });
  };

  // ──────────────────────────────────────────────
  // Add references
  // ──────────────────────────────────────────────

  const addFromInvoice = (
    ref: InvoicePaymentRef
  ) => {
    if (
      form.items.some(
        (item) =>
          item.paymentHistoryId ===
          ref.paymentHistoryId
      )
    ) {
      return;
    }

    addItem({
      description: `Invoice ${ref.invoiceNumber} – ${ref.method}`,
      customerName: "",
      amount: ref.amount,
      refModel: "Invoice",
      refId: ref.invoiceId,
      paymentHistoryId:
        ref.paymentHistoryId,
    });
  };

  const addFromCashflow = (
    ref: CashflowRef
  ) => {
    if (
      form.items.some(
        (item) =>
          item.refId === ref.cashflowId
      )
    ) {
      return;
    }

    addItem({
      description:
        ref.reference ||
        (activeTab === "in"
          ? ref.from
          : ref.to) ||
        "Manual Cashflow",
      customerName:
        activeTab === "in"
          ? ref.from ?? ""
          : ref.to ?? "",
      amount: ref.amount,
      refModel: "Cashflow",
      refId: ref.cashflowId,
    });
  };

  const addFromPurchase = (
    ref: PurchasePaymentRef
  ) => {
    if (
      form.items.some(
        (item) =>
          item.paymentHistoryId ===
          ref.paymentHistoryId
      )
    ) {
      return;
    }

    addItem({
      description: `Purchase ${ref.purchaseOrderNumber} - ${ref.paymentNumber}`,
      customerName: "",
      amount: ref.amount,
      refModel: "Purchase",
      refId: ref.purchaseId,
      paymentHistoryId:
        ref.paymentHistoryId,
    });
  };

  const addFromDebt = (
    ref: DebtPaymentRef
  ) => {
    if (
      form.items.some(
        (item) =>
          item.paymentHistoryId ===
          ref.paymentHistoryId
      )
    ) {
      return;
    }

    addItem({
      description: `Vendor Debt ${ref.invoiceNumber} - ${ref.paymentNumber}`,
      customerName: "",
      amount: ref.amount,
      refModel: "Debt",
      refId: ref.invoiceId,
      paymentHistoryId:
        ref.paymentHistoryId,
    });
  };

  // ──────────────────────────────────────────────
  // Signature
  // ──────────────────────────────────────────────

  const updateSignature = (
    key: keyof Signatures,
    field: "name" | "date",
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
  // Save
  // ──────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.contactName.trim()) {
      alert("Nama harus diisi");
      return;
    }

    if (!form.voucherNumber.trim()) {
      alert(
        "Nomor voucher harus diisi"
      );
      return;
    }

    if (form.items.length === 0) {
      alert(
        "Tambahkan minimal 1 item"
      );
      return;
    }

    setSaving(true);

    try {
      const payload = {
        ...form,
        type: activeTab,
        masterAccountId,
      };

      const isEdit =
        modalMode === "edit" &&
        editId;

      const response = await fetch(
        isEdit
          ? `/api/web/voucher-cash/${editId}`
          : "/api/web/voucher-cash",
        {
          method: isEdit
            ? "PUT"
            : "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(
            payload
          ),
        }
      );

      const data =
        await response.json();

      if (data.error) {
        throw new Error(
          data.message
        );
      }

      closeModal();
      fetchVouchers();
    } catch (error: any) {
      alert(
        "Error: " +
        error.message
      );
    } finally {
      setSaving(false);
    }
  };

  // ──────────────────────────────────────────────
  // Delete
  // ──────────────────────────────────────────────

  const handleDelete = async (
    id: string
  ) => {
    if (
      !confirm(
        "Hapus voucher ini? Relasi ke Invoice/Cashflow akan dilepas."
      )
    ) {
      return;
    }

    setDeletingId(id);

    try {
      const response = await fetch(
        `/api/web/voucher-cash/${id}`,
        {
          method: "DELETE",
        }
      );

      const data =
        await response.json();

      if (data.error) {
        throw new Error(
          data.message
        );
      }

      fetchVouchers();
    } catch (error: any) {
      alert(
        "Error: " +
        error.message
      );
    } finally {
      setDeletingId(null);
    }
  };

  // ──────────────────────────────────────────────
  // Derived data
  // ──────────────────────────────────────────────

  const grandTotal =
    form.items.reduce(
      (sum, item) =>
        sum +
        (Number(item.amount) || 0),
      0
    );

  const search =
    refSearch
      .toLowerCase()
      .trim();

  const filteredInvoiceRefs =
    invoiceRefs.filter(
      (ref) =>
        ref.invoiceNumber
          .toLowerCase()
          .includes(search) ||
        ref.method
          .toLowerCase()
          .includes(search)
    );

  const filteredCashflowRefs =
    cashflowRefs.filter(
      (ref) =>
        (ref.reference ?? "")
          .toLowerCase()
          .includes(search) ||
        (ref.from ?? "")
          .toLowerCase()
          .includes(search) ||
        (ref.to ?? "")
          .toLowerCase()
          .includes(search)
    );

  const filteredPurchaseRefs =
    purchaseRefs.filter(
      (ref) =>
        ref.purchaseOrderNumber
          .toLowerCase()
          .includes(search) ||
        ref.paymentNumber
          .toLowerCase()
          .includes(search)
    );

  const filteredDebtRefs =
    debtRefs.filter(
      (ref) =>
        ref.invoiceNumber
          .toLowerCase()
          .includes(search) ||
        ref.paymentNumber
          .toLowerCase()
          .includes(search)
    );

  // ──────────────────────────────────────────────
  // Loading
  // ──────────────────────────────────────────────

  if (!hasHydrated) {
    return (
      <div className="p-8 text-center">
        Loading...
      </div>
    );
  }

  // ──────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* ───────────────────────────────
          Page Header
      ─────────────────────────────── */}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Voucher
          </h1>

          <p className="text-sm text-gray-500">
            Bukti Voucher Cash Masuk /
            Keluar
          </p>
        </div>

        <button
          onClick={openCreate}
          className="btn btn-primary gap-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>

          Buat Voucher
        </button>
      </div>

      {/* ───────────────────────────────
          Tabs
      ─────────────────────────────── */}

      <div className="tabs tabs-boxed bg-gray-100 mb-6 w-fit">
        <button
          className={`tab font-semibold ${activeTab === "in"
              ? "tab-active"
              : ""
            }`}
          onClick={() =>
            setActiveTab("in")
          }
        >
          💰 Voucher Cash Masuk
        </button>

        <button
          className={`tab font-semibold ${activeTab === "out"
              ? "tab-active"
              : ""
            }`}
          onClick={() =>
            setActiveTab("out")
          }
        >
          💸 Voucher Cash Keluar
        </button>
      </div>

      {/* ───────────────────────────────
          Voucher Table
      ─────────────────────────────── */}

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="table table-zebra w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="w-12 text-center">
                No
              </th>
              <th>No. Voucher</th>
              <th>Tanggal</th>
              <th>
                {activeTab === "in"
                  ? "Diterima dari"
                  : "Dibayarkan kepada"}
              </th>
              <th className="text-right">
                Total (Rp)
              </th>
              <th className="text-center">
                Aksi
              </th>
            </tr>
          </thead>

          <tbody>
            {loadingList ? (
              <tr>
                <td
                  colSpan={6}
                  className="text-center py-8"
                >
                  <span className="loading loading-spinner" />
                </td>
              </tr>
            ) : vouchers.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="text-center py-10 text-gray-400"
                >
                  <div className="flex flex-col items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-10 h-10 opacity-30"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>

                    <span>
                      Belum ada data voucher
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              vouchers.map(
                (voucher, index) => (
                  <tr
                    key={voucher._id}
                  >
                    <td className="text-center">
                      {index + 1}
                    </td>

                    <td className="font-mono font-semibold">
                      {
                        voucher.voucherNumber
                      }
                    </td>

                    <td>
                      {fmtDate(
                        voucher.date
                      )}
                    </td>

                    <td>
                      {
                        voucher.contactName
                      }
                    </td>

                    <td className="text-right font-medium">
                      {IDR(
                        voucher.items?.reduce(
                          (
                            sum,
                            item
                          ) =>
                            sum +
                            (item.amount ||
                              0),
                          0
                        ) ?? 0
                      )}
                    </td>

                    <td>
                      <div className="flex gap-1 justify-center">
                        <button
                          className="btn btn-xs btn-outline"
                          onClick={() =>
                            window.open(
                              `/finance/voucher/cash/print/${voucher._id}`,
                              "_blank"
                            )
                          }
                          title="Print"
                        >
                          🖨️
                        </button>

                        <button
                          className="btn btn-xs btn-ghost"
                          onClick={() =>
                            openEdit(
                              voucher
                            )
                          }
                          title="Edit"
                        >
                          ✏️
                        </button>

                        <button
                          className="btn btn-xs btn-error btn-outline"
                          onClick={() =>
                            handleDelete(
                              voucher._id
                            )
                          }
                          disabled={
                            deletingId ===
                            voucher._id
                          }
                          title="Hapus"
                        >
                          {deletingId ===
                            voucher._id ? (
                            <span className="loading loading-spinner loading-xs" />
                          ) : (
                            "🗑️"
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )
            )}
          </tbody>
        </table>
      </div>

      {/* ═══════════════════════════════════════
          CUSTOM MODAL
          
          IMPORTANT:
          Tidak menggunakan `modal-box` DaisyUI.
          ═══════════════════════════════════════ */}

      {modalMode && (
        <div className="modal modal-open z-[999]">
          {/* Overlay */}

          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeModal}
          />

          {/* Custom Modal Panel */}

          <div
            className="
              relative
              z-10
              flex
              flex-col
              w-[95vw]
              max-w-[1500px]
              h-[92vh]
              max-h-[92vh]
              bg-white
              rounded-2xl
              shadow-2xl
              overflow-hidden
            "
          >
            {/* ─────────────────────────
                Modal Header
            ───────────────────────── */}

            <div className="shrink-0 px-8 py-5 border-b bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-gray-800">
                      {modalMode === "create"
                        ? "Buat"
                        : "Edit"}{" "}
                      Bukti Voucher Cash
                    </h2>

                    <span
                      className={`badge ${activeTab === "in"
                          ? "badge-success"
                          : "badge-error"
                        } badge-outline`}
                    >
                      {activeTab === "in"
                        ? "Cash Masuk"
                        : "Cash Keluar"}
                    </span>
                  </div>

                  <p className="text-sm text-gray-500 mt-1">
                    Lengkapi informasi voucher,
                    transaksi, dan tanda tangan
                  </p>
                </div>

                <button
                  type="button"
                  className="btn btn-sm btn-circle btn-ghost"
                  onClick={closeModal}
                  disabled={saving}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* ─────────────────────────
                Modal Body
            ───────────────────────── */}

            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="px-8 py-7 space-y-8">

                {/* ═════════════════════
                    1. BASIC INFO
                ═════════════════════ */}

                <section>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary text-primary-content font-bold">
                      1
                    </div>

                    <div>
                      <h3 className="font-bold text-gray-800">
                        Informasi Voucher
                      </h3>

                      <p className="text-xs text-gray-500">
                        Informasi dasar bukti voucher
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-semibold">
                          No. Voucher
                        </span>
                      </label>

                      <input
                        className="input input-bordered w-full font-mono"
                        value={
                          form.voucherNumber
                        }
                        onChange={(event) =>
                          setForm(
                            (current) => ({
                              ...current,
                              voucherNumber:
                                event.target
                                  .value,
                            })
                          )
                        }
                      />
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-semibold">
                          Tanggal
                        </span>
                      </label>

                      <input
                        type="date"
                        className="input input-bordered w-full"
                        value={form.date}
                        onChange={(event) =>
                          setForm(
                            (current) => ({
                              ...current,
                              date: event.target
                                .value,
                            })
                          )
                        }
                      />
                    </div>

                    <div className="form-control md:col-span-2">
                      <label className="label">
                        <span className="label-text font-semibold">
                          {activeTab === "in"
                            ? "Diterima dari"
                            : "Dibayarkan kepada"}
                        </span>
                      </label>

                      <input
                        className="input input-bordered w-full"
                        placeholder={
                          activeTab === "in"
                            ? "Nama pihak yang menyerahkan uang..."
                            : "Nama pihak yang menerima uang..."
                        }
                        value={
                          form.contactName
                        }
                        onChange={(event) =>
                          setForm(
                            (current) => ({
                              ...current,
                              contactName:
                                event.target
                                  .value,
                            })
                          )
                        }
                        list="voucher-cash-customers"
                      />

                      <datalist id="voucher-cash-customers">
                        {customers.map(
                          (customer: any) => (
                            <option
                              key={
                                customer._id
                              }
                              value={
                                customer.bussinessName ||
                                customer.name
                              }
                            />
                          )
                        )}
                      </datalist>
                    </div>
                  </div>
                </section>

                {/* ═════════════════════
                    2. REFERENCES
                ═════════════════════ */}

                <section>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary text-primary-content font-bold">
                      2
                    </div>

                    <div>
                      <h3 className="font-bold text-gray-800">
                        Relasi Transaksi
                      </h3>

                      <p className="text-xs text-gray-500">
                        Pilih transaksi yang akan dimasukkan
                        ke voucher
                      </p>
                    </div>
                  </div>

                  <div className="mb-5">
                    <input
                      className="input input-bordered w-full"
                      placeholder="Cari invoice, purchase order, cashflow, metode pembayaran..."
                      value={refSearch}
                      onChange={(event) =>
                        setRefSearch(
                          event.target.value
                        )
                      }
                    />
                  </div>

                  {loadingRefs ? (
                    <div className="flex justify-center py-16">
                      <span className="loading loading-spinner loading-lg" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

                      {/* Invoice */}

                      {activeTab === "in" && (
                        <div className="border border-gray-200 rounded-xl overflow-hidden">
                          <div className="px-5 py-4 bg-gray-50 border-b">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-bold text-gray-700">
                                  📄 Invoice Payment
                                </h4>

                                <p className="text-xs text-gray-500 mt-0.5">
                                  Payment History Invoice
                                </p>
                              </div>

                              <span className="badge badge-sm">
                                {
                                  filteredInvoiceRefs.length
                                }
                              </span>
                            </div>
                          </div>

                          <div className="max-h-72 overflow-y-auto divide-y">
                            {filteredInvoiceRefs.length ===
                              0 ? (
                              <div className="py-12 text-center text-sm text-gray-400">
                                Tidak ada data
                              </div>
                            ) : (
                              filteredInvoiceRefs.map(
                                (ref) => {
                                  const exists =
                                    form.items.some(
                                      (item) =>
                                        item.paymentHistoryId ===
                                        ref.paymentHistoryId
                                    );

                                  return (
                                    <div
                                      key={
                                        ref.paymentHistoryId
                                      }
                                      className="p-5 hover:bg-gray-50 transition-colors"
                                    >
                                      <div className="flex items-center gap-5">
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                            <p className="font-bold text-sm">
                                              {
                                                ref.invoiceNumber
                                              }
                                            </p>

                                            <span className="badge badge-sm badge-ghost">
                                              {
                                                ref.method
                                              }
                                            </span>
                                          </div>

                                          <p className="text-xs text-gray-500 mt-1">
                                            {fmtDate(
                                              ref.date
                                            )}
                                          </p>

                                          <p className="font-bold text-sm mt-2">
                                            Rp{" "}
                                            {IDR(
                                              ref.amount
                                            )}
                                          </p>
                                        </div>

                                        <button
                                          className="btn btn-sm btn-primary"
                                          disabled={
                                            exists
                                          }
                                          onClick={() =>
                                            addFromInvoice(
                                              ref
                                            )
                                          }
                                        >
                                          {exists
                                            ? "✓"
                                            : "+ Tambah"}
                                        </button>
                                      </div>
                                    </div>
                                  );
                                }
                              )
                            )}
                          </div>
                        </div>
                      )}

                      {/* Purchase */}

                      {activeTab === "out" && (
                        <div className="border border-gray-200 rounded-xl overflow-hidden">
                          <div className="px-5 py-4 bg-gray-50 border-b">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-bold text-gray-700">
                                  🛒 Purchase Payment
                                </h4>

                                <p className="text-xs text-gray-500 mt-0.5">
                                  Pembayaran Purchase Order
                                </p>
                              </div>

                              <span className="badge badge-sm">
                                {
                                  filteredPurchaseRefs.length
                                }
                              </span>
                            </div>
                          </div>

                          <div className="max-h-72 overflow-y-auto divide-y">
                            {filteredPurchaseRefs.length ===
                              0 ? (
                              <div className="py-12 text-center text-sm text-gray-400">
                                Tidak ada data
                              </div>
                            ) : (
                              filteredPurchaseRefs.map(
                                (ref) => {
                                  const exists =
                                    form.items.some(
                                      (item) =>
                                        item.paymentHistoryId ===
                                        ref.paymentHistoryId
                                    );

                                  return (
                                    <div
                                      key={
                                        ref.paymentHistoryId
                                      }
                                      className="p-5 hover:bg-gray-50"
                                    >
                                      <div className="flex items-center gap-5">
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                            <p className="font-bold text-sm">
                                              {
                                                ref.purchaseOrderNumber
                                              }
                                            </p>

                                            <span className="badge badge-sm badge-ghost">
                                              {
                                                ref.method
                                              }
                                            </span>
                                          </div>

                                          <p className="text-xs text-gray-500 mt-1">
                                            {
                                              ref.paymentNumber
                                            }{" "}
                                            ·{" "}
                                            {fmtDate(
                                              ref.date
                                            )}
                                          </p>

                                          <p className="font-bold text-sm mt-2">
                                            Rp{" "}
                                            {IDR(
                                              ref.amount
                                            )}
                                          </p>
                                        </div>

                                        <button
                                          className="btn btn-sm btn-primary"
                                          disabled={
                                            exists
                                          }
                                          onClick={() =>
                                            addFromPurchase(
                                              ref
                                            )
                                          }
                                        >
                                          {exists
                                            ? "✓"
                                            : "+ Tambah"}
                                        </button>
                                      </div>
                                    </div>
                                  );
                                }
                              )
                            )}
                          </div>
                        </div>
                      )}

                      {/* Debt */}

                      {activeTab === "out" && (
                        <div className="border border-gray-200 rounded-xl overflow-hidden">
                          <div className="px-5 py-4 bg-gray-50 border-b">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-bold text-gray-700">
                                  🤝 Hutang Vendor
                                </h4>

                                <p className="text-xs text-gray-500 mt-0.5">
                                  Pembayaran hutang vendor
                                </p>
                              </div>

                              <span className="badge badge-sm">
                                {
                                  filteredDebtRefs.length
                                }
                              </span>
                            </div>
                          </div>

                          <div className="max-h-72 overflow-y-auto divide-y">
                            {filteredDebtRefs.length ===
                              0 ? (
                              <div className="py-12 text-center text-sm text-gray-400">
                                Tidak ada data
                              </div>
                            ) : (
                              filteredDebtRefs.map(
                                (ref) => {
                                  const exists =
                                    form.items.some(
                                      (item) =>
                                        item.paymentHistoryId ===
                                        ref.paymentHistoryId
                                    );

                                  return (
                                    <div
                                      key={
                                        ref.paymentHistoryId
                                      }
                                      className="p-5 hover:bg-gray-50"
                                    >
                                      <div className="flex items-center gap-5">
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                            <p className="font-bold text-sm">
                                              {
                                                ref.invoiceNumber
                                              }
                                            </p>

                                            <span className="badge badge-sm badge-ghost">
                                              {
                                                ref.method
                                              }
                                            </span>
                                          </div>

                                          <p className="text-xs text-gray-500 mt-1">
                                            {
                                              ref.paymentNumber
                                            }{" "}
                                            ·{" "}
                                            {fmtDate(
                                              ref.date
                                            )}
                                          </p>

                                          <p className="font-bold text-sm mt-2">
                                            Rp{" "}
                                            {IDR(
                                              ref.amount
                                            )}
                                          </p>
                                        </div>

                                        <button
                                          className="btn btn-sm btn-primary"
                                          disabled={
                                            exists
                                          }
                                          onClick={() =>
                                            addFromDebt(
                                              ref
                                            )
                                          }
                                        >
                                          {exists
                                            ? "✓"
                                            : "+ Tambah"}
                                        </button>
                                      </div>
                                    </div>
                                  );
                                }
                              )
                            )}
                          </div>
                        </div>
                      )}

                      {/* Cashflow */}

                      <div className="border border-gray-200 rounded-xl overflow-hidden">
                        <div className="px-5 py-4 bg-gray-50 border-b">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-bold text-gray-700">
                                💵 Cashflow Manual
                              </h4>

                              <p className="text-xs text-gray-500 mt-0.5">
                                Transaksi cashflow manual
                              </p>
                            </div>

                            <span className="badge badge-sm">
                              {
                                filteredCashflowRefs.length
                              }
                            </span>
                          </div>
                        </div>

                        <div className="max-h-72 overflow-y-auto divide-y">
                          {filteredCashflowRefs.length ===
                            0 ? (
                            <div className="py-12 text-center text-sm text-gray-400">
                              Tidak ada data
                            </div>
                          ) : (
                            filteredCashflowRefs.map(
                              (ref) => {
                                const exists =
                                  form.items.some(
                                    (item) =>
                                      item.refId ===
                                      ref.cashflowId
                                  );

                                return (
                                  <div
                                    key={
                                      ref.cashflowId
                                    }
                                    className="p-5 hover:bg-gray-50"
                                  >
                                    <div className="flex items-center gap-5">
                                      <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm truncate">
                                          {ref.reference ||
                                            (activeTab ===
                                              "in"
                                              ? ref.from
                                              : ref.to) ||
                                            "—"}
                                        </p>

                                        <p className="text-xs text-gray-500 mt-1">
                                          {activeTab ===
                                            "in"
                                            ? ref.from
                                            : ref.to}
                                        </p>

                                        <p className="text-xs text-gray-500">
                                          {fmtDate(
                                            ref.date
                                          )}
                                        </p>

                                        <p className="font-bold text-sm mt-2">
                                          Rp{" "}
                                          {IDR(
                                            ref.amount
                                          )}
                                        </p>
                                      </div>

                                      <button
                                        className="btn btn-sm btn-primary"
                                        disabled={
                                          exists
                                        }
                                        onClick={() =>
                                          addFromCashflow(
                                            ref
                                          )
                                        }
                                      >
                                        {exists
                                          ? "✓"
                                          : "+ Tambah"}
                                      </button>
                                    </div>
                                  </div>
                                );
                              }
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </section>

                {/* ═════════════════════
                    3. ITEMS
                ═════════════════════ */}

                <section>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary text-primary-content font-bold">
                      3
                    </div>

                    <div>
                      <h3 className="font-bold text-gray-800">
                        Item Voucher
                      </h3>

                      <p className="text-xs text-gray-500">
                        Detail transaksi yang tercatat
                      </p>
                    </div>
                  </div>

                  <div className="border rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="table w-full">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="w-14 text-center">
                              No
                            </th>

                            <th className="min-w-[400px]">
                              Keterangan
                            </th>

                            <th className="min-w-[250px]">
                              Nama Customer
                            </th>

                            <th className="min-w-[220px] text-right">
                              Jumlah (Rp)
                            </th>

                            <th className="w-16" />
                          </tr>
                        </thead>

                        <tbody>
                          {form.items.length ===
                            0 ? (
                            <tr>
                              <td
                                colSpan={5}
                                className="py-12 text-center text-gray-400"
                              >
                                Belum ada item
                                <div className="text-xs mt-1">
                                  Pilih transaksi di
                                  atas atau tambah
                                  item manual
                                </div>
                              </td>
                            </tr>
                          ) : (
                            form.items.map(
                              (
                                item,
                                index
                              ) => (
                                <tr
                                  key={index}
                                >
                                  <td className="text-center text-gray-400">
                                    {index + 1}
                                  </td>

                                  <td>
                                    <input
                                      className="input input-bordered input-sm w-full"
                                      value={
                                        item.description
                                      }
                                      placeholder="Keterangan transaksi..."
                                      onChange={(
                                        event
                                      ) =>
                                        updateItem(
                                          index,
                                          "description",
                                          event
                                            .target
                                            .value
                                        )
                                      }
                                    />
                                  </td>

                                  <td>
                                    <input
                                      className="input input-bordered input-sm w-full"
                                      value={
                                        item.customerName
                                      }
                                      placeholder="Customer..."
                                      onChange={(
                                        event
                                      ) =>
                                        updateItem(
                                          index,
                                          "customerName",
                                          event
                                            .target
                                            .value
                                        )
                                      }
                                      list="voucher-cash-item-customers"
                                    />
                                    <datalist id="voucher-cash-item-customers">
                                      {customers.map((c: any) => (
                                        <option key={c._id} value={c.bussinessName || c.name} />
                                      ))}
                                    </datalist>
                                  </td>

                                  <td>
                                    <input
                                      type="number"
                                      className="input input-bordered input-sm w-full text-right"
                                      value={
                                        item.amount
                                      }
                                      onChange={(
                                        event
                                      ) =>
                                        updateItem(
                                          index,
                                          "amount",
                                          parseFloat(
                                            event
                                              .target
                                              .value
                                          ) ||
                                          0
                                        )
                                      }
                                    />
                                  </td>

                                  <td className="text-center">
                                    <button
                                      className="btn btn-sm btn-ghost text-error"
                                      onClick={() =>
                                        removeItem(
                                          index
                                        )
                                      }
                                    >
                                      ✕
                                    </button>
                                  </td>
                                </tr>
                              )
                            )
                          )}
                        </tbody>

                        <tfoot>
                          <tr className="bg-gray-50">
                            <td
                              colSpan={3}
                              className="text-right font-bold"
                            >
                              TOTAL
                            </td>

                            <td className="text-right font-bold text-lg">
                              Rp{" "}
                              {IDR(
                                grandTotal
                              )}
                            </td>

                            <td />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  <button
                    className="btn btn-sm btn-outline border-dashed w-full mt-3"
                    onClick={
                      addManualItem
                    }
                  >
                    + Tambah Item Manual
                  </button>
                </section>

                {/* ═════════════════════
                    4. SIGNATURES
                ═════════════════════ */}

                <section>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary text-primary-content font-bold">
                      4
                    </div>

                    <div>
                      <h3 className="font-bold text-gray-800">
                        Tanda Tangan
                      </h3>

                      <p className="text-xs text-gray-500">
                        Pihak yang bertanggung jawab
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                    {(
                      [
                        "dibukukanOleh",
                        "disetujuiOleh",
                        "dicekOleh",
                        "dibuatOleh",
                      ] as const
                    ).map((key) => {
                      const labels: Record<
                        string,
                        string
                      > = {
                        dibukukanOleh:
                          "Dibukukan Oleh",
                        disetujuiOleh:
                          "Disetujui Oleh",
                        dicekOleh:
                          "Diterima Oleh",
                        dibuatOleh:
                          "Dibuat Oleh",
                      };

                      return (
                        <div
                          key={key}
                          className="border rounded-xl p-5 bg-gray-50"
                        >
                          <p className="font-semibold text-sm text-gray-700 mb-4">
                            {labels[key]}
                          </p>

                          <div className="space-y-3">
                            <input
                              className="input input-bordered w-full"
                              placeholder="Nama..."
                              value={
                                form.signatures[
                                  key
                                ].name
                              }
                              onChange={(
                                event
                              ) =>
                                updateSignature(
                                  key,
                                  "name",
                                  event
                                    .target
                                    .value
                                )
                              }
                            />

                            <input
                              type="date"
                              className="input input-bordered w-full"
                              value={
                                form.signatures[
                                  key
                                ].date
                              }
                              onChange={(
                                event
                              ) =>
                                updateSignature(
                                  key,
                                  "date",
                                  event
                                    .target
                                    .value
                                )
                              }
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>
            </div>

            {/* ─────────────────────────
                Modal Footer
            ───────────────────────── */}

            <div className="shrink-0 border-t bg-gray-50 px-8 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">
                    Total Voucher
                  </p>

                  <p className="text-xl font-bold text-gray-800">
                    Rp {IDR(grandTotal)}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    className="btn btn-ghost"
                    onClick={closeModal}
                    disabled={saving}
                  >
                    Batal
                  </button>

                  <button
                    className="btn btn-primary min-w-44"
                    onClick={
                      handleSave
                    }
                    disabled={saving}
                  >
                    {saving && (
                      <span className="loading loading-spinner loading-sm" />
                    )}

                    {modalMode === "create"
                      ? "Simpan Voucher"
                      : "Perbarui Voucher"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
