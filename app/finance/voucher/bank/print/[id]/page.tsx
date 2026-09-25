"use client";

import { use, useEffect, useState } from "react";
import useAuth from "@/store/auth";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const IDR = (v: number) =>
  new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v ?? 0);

const fmtDateSlash = (d: string | Date) => {
  if (!d) return "";
  const dt = new Date(d);
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  const yyyy = dt.getFullYear();
  return `${mm} / ${dd} / ${yyyy}`;
};

const fmtDateLong = (d: string | Date) => {
  if (!d) return "";
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

function terbilang(n: number): string {
  if (!n || isNaN(n)) return "Nol Rupiah";
  const satuan = [
    "", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh",
    "Delapan", "Sembilan", "Sepuluh", "Sebelas", "Dua Belas", "Tiga Belas",
    "Empat Belas", "Lima Belas", "Enam Belas", "Tujuh Belas", "Delapan Belas",
    "Sembilan Belas",
  ];

  function conv(num: number): string {
    if (num === 0) return "";
    if (num < 20) return satuan[num];
    if (num < 100)
      return (
        satuan[Math.floor(num / 10) + 8] +
        " Puluh" +
        (num % 10 ? " " + satuan[num % 10] : "")
      );
    if (num < 1000) {
      const h = Math.floor(num / 100);
      return (
        (h === 1 ? "Seratus" : satuan[h] + " Ratus") +
        (num % 100 ? " " + conv(num % 100) : "")
      );
    }
    if (num < 1_000_000) {
      const t = Math.floor(num / 1000);
      return (
        (t === 1 ? "Seribu" : conv(t) + " Ribu") +
        (num % 1000 ? " " + conv(num % 1000) : "")
      );
    }
    if (num < 1_000_000_000) {
      const m = Math.floor(num / 1_000_000);
      return conv(m) + " Juta" + (num % 1_000_000 ? " " + conv(num % 1_000_000) : "");
    }
    const b = Math.floor(num / 1_000_000_000);
    return (
      conv(b) +
      " Miliar" +
      (num % 1_000_000_000 ? " " + conv(num % 1_000_000_000) : "")
    );
  }

  return conv(Math.round(n)) + " Rupiah";
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
export default function PrintVoucherBank({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const masterAccountId = useAuth((s) => s.masterAccountId);
  const hasHydrated = useAuth((s) => s._hasHydrated);

  const [voucher, setVoucher] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [bankAccount, setBankAccount] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasHydrated || !masterAccountId) return;
    (async () => {
      setLoading(true);
      try {
        const [vRes, cRes] = await Promise.all([
          fetch(`/api/web/voucher-bank/${id}`),
          fetch(`/api/web/companies?id=${masterAccountId}`),
        ]);
        const vData = await vRes.json();
        const cData = await cRes.json();
        if (!vData.error) {
          setVoucher(vData.result);
          // If bank masuk, fetch the company bank account
          if (vData.result?.companyBankAccountId) {
            try {
              const baRes = await fetch(`/api/web/bank-accounts?id=${masterAccountId}`);
              const baData = await baRes.json();
              const matched = (baData.result ?? []).find(
                (b: any) => b._id === vData.result.companyBankAccountId
              );
              setBankAccount(matched ?? null);
            } catch { /* silent */ }
          }
        }
        if (!cData.error && cData.result?.length > 0)
          setCompany(cData.result[0]);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, hasHydrated, masterAccountId]);

  if (!hasHydrated || loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "60vh",
          fontFamily: "Arial, sans-serif",
          fontSize: "14px",
          color: "#555",
        }}
      >
        Loading...
      </div>
    );
  }

  if (!voucher) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "60vh",
          fontFamily: "Arial, sans-serif",
          fontSize: "14px",
          color: "#e00",
        }}
      >
        Voucher tidak ditemukan.
      </div>
    );
  }

  const isIn = voucher.type === "in";
  const items: any[] = voucher.items ?? [];
  const total = items.reduce((s: number, i: any) => s + (Number(i.amount) || 0), 0);
  const sigs = voucher.signatures ?? {};

  const MIN_ROWS = 3;
  const displayItems: (any | null)[] = [...items];
  while (displayItems.length < MIN_ROWS) displayItems.push(null);

  const sigKeys = [
    { key: "dibukukanOleh", label: "DIBUKUKAN OLEH," },
    { key: "disetujuiOleh", label: "DISETUJUI OLEH," },
    { key: "dicekOleh", label: "DICEK OLEH," },
    { key: "dibuatOleh", label: "DIBUAT OLEH," },
  ] as const;

  const Checked = () => (
    <svg width="12" height="12" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0.5" y="0.5" width="12" height="12" fill="#374151" stroke="#374151" />
      <path d="M2.5 6.5L5.5 9.5L10.5 3.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  const Unchecked = () => (
    <svg width="12" height="12" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0.5" y="0.5" width="12" height="12" fill="white" stroke="#555" />
    </svg>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          background: #f3f4f6;
          font-family: 'Inter', Arial, sans-serif;
        }

        .voucher-root {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px;
          min-height: 100vh;
        }

        .voucher-wrapper-inner {
          width: 100%;
          max-width: 210mm;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .toolbar {
          display: flex;
          gap: 10px;
          margin-bottom: 15px;
          width: 100%;
          max-width: 210mm;
        }

        .voucher-page {
          width: 100%;
          max-width: 210mm;
          background: white;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          border-radius: 6px;
          padding: 12mm 14mm;
          display: flex;
          flex-direction: column;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          html, body {
            background: white !important;
            width: 100% !important;
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .voucher-root {
            padding: 0 !important;
            width: 100% !important;
            background: white !important;
            display: block !important;
          }
          .voucher-wrapper-inner {
            width: 100% !important;
            max-width: 100% !important;
            display: block !important;
          }
          .toolbar {
            display: none !important;
          }
          .voucher-page {
            box-shadow: none !important;
            border-radius: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
            page-break-after: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div className="voucher-root">
        <div className="voucher-wrapper-inner">
          {/* Toolbar */}
          <div className="toolbar">
            <button
              onClick={() => window.history.back()}
              style={{
                padding: "6px 14px",
                background: "white",
                border: "1px solid #d1d5db",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px",
                fontFamily: "inherit",
              }}
            >
              ← Kembali
            </button>
            <button
              onClick={() => window.print()}
              style={{
                padding: "6px 14px",
                background: "#2563eb",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px",
                fontFamily: "inherit",
                fontWeight: 600,
              }}
            >
              🖨️ Print / Save PDF
            </button>
          </div>

          {/* ══ VOUCHER PAGE ══ */}
          <div className="voucher-page">
            {/* ── HEADER ROW ── */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "6px",
              }}
            >
              <h1
                style={{
                  fontSize: "18px",
                  fontWeight: 800,
                  letterSpacing: "0.03em",
                  lineHeight: 1.1,
                }}
              >
                BUKTI VOUCHER BANK
              </h1>

              {/* Company */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {company?.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={company.logo}
                    alt="logo"
                    style={{ width: "26px", height: "26px", objectFit: "contain" }}
                  />
                ) : (
                  <div
                    style={{
                      width: "26px",
                      height: "26px",
                      background: "#1d4ed8",
                      borderRadius: "4px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontSize: "8px",
                      fontWeight: 700,
                    }}
                  >
                    LR
                  </div>
                )}
                <span style={{ fontWeight: 700, fontSize: "12px" }}>
                  {company?.name || "PT. Leryn Jaya Mas"}
                </span>
              </div>
            </div>

            {/* ── TYPE CHECKBOXES ── */}
            <div style={{ display: "flex", gap: "16px", marginBottom: "6px" }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "11px",
                  fontWeight: 600,
                }}
              >
                {!isIn ? <Checked /> : <Unchecked />}
                BANK KELUAR
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "11px",
                  fontWeight: 600,
                }}
              >
                {isIn ? <Checked /> : <Unchecked />}
                BANK MASUK
              </label>
            </div>

            {/* ── META INFO ── */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                borderTop: "1.5px solid #000",
                paddingTop: "6px",
                marginBottom: "4px",
                gap: "12px",
              }}
            >
              {/* Left column: contact name + bank fields */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                {/* Dibayar / Diterima */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ whiteSpace: "nowrap", fontWeight: 600, fontSize: "11px", minWidth: "80px" }}>
                    {isIn ? "Diterima Dari" : "Dibayar Kepada"}
                  </span>
                  <span style={{ color: "#555" }}>:</span>
                  <span
                    style={{
                      flex: 1,
                      border: "1px dashed #000",
                      borderRadius: "2px",
                      padding: "3px 8px",
                      minHeight: "22px",
                      fontSize: "11px",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {voucher.contactName}
                  </span>
                </div>

                {/* Bank field */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ whiteSpace: "nowrap", fontWeight: 600, fontSize: "11px", minWidth: "80px" }}>
                    Bank
                  </span>
                  <span style={{ color: "#555" }}>:</span>
                  <span
                    style={{
                      flex: 1,
                      border: "1px dashed #000",
                      borderRadius: "2px",
                      padding: "3px 8px",
                      minHeight: "22px",
                      fontSize: "11px",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {isIn
                      ? (bankAccount ? `${bankAccount.bank} – ${bankAccount.accountName}` : "-")
                      : (voucher.externalBankName || "-")}
                  </span>
                </div>

                {/* No. Rekening */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ whiteSpace: "nowrap", fontWeight: 600, fontSize: "11px", minWidth: "80px" }}>
                    No. Rekening
                  </span>
                  <span style={{ color: "#555" }}>:</span>
                  <span
                    style={{
                      flex: 1,
                      border: "1px dashed #000",
                      borderRadius: "2px",
                      padding: "3px 8px",
                      minHeight: "22px",
                      fontSize: "11px",
                      fontFamily: "monospace",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {isIn
                      ? (bankAccount?.accountNumber || "-")
                      : (voucher.externalAccountNumber || "-")}
                  </span>
                </div>
              </div>

              {/* Right column: No. Voucher + Tanggal */}
              <div style={{ flexShrink: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    marginBottom: "4px",
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: "11px", minWidth: "24px" }}>No.</span>
                  <span style={{ color: "#555" }}>:</span>
                  <span
                    style={{
                      border: "1px dashed #000",
                      borderRadius: "2px",
                      padding: "3px 8px",
                      minWidth: "140px",
                      minHeight: "22px",
                      fontFamily: "monospace",
                      fontSize: "11px",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {voucher.voucherNumber}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                  <span style={{ fontWeight: 600, fontSize: "11px", minWidth: "24px" }}>Tgl.</span>
                  <span style={{ color: "#555" }}>:</span>
                  <span
                    style={{
                      border: "1px dashed #000",
                      borderRadius: "2px",
                      padding: "3px 8px",
                      minWidth: "140px",
                      minHeight: "22px",
                      fontSize: "11px",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {fmtDateSlash(voucher.date)}
                  </span>
                </div>
                {/* Right side bank indicator (secondary) */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontWeight: 600, fontSize: "11px", minWidth: "24px" }}>Bank</span>
                  <span style={{ color: "#555" }}>:</span>
                  <span
                    style={{
                      border: "1px dashed #000",
                      borderRadius: "2px",
                      padding: "3px 8px",
                      minWidth: "140px",
                      minHeight: "22px",
                      fontSize: "11px",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {isIn
                      ? (bankAccount?.bank || "–")
                      : (voucher.externalBankName || "–")}
                  </span>
                </div>
              </div>
            </div>

            {/* ── ITEMS TABLE ── */}
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "11px",
                tableLayout: "fixed",
                marginBottom: "0",
                marginTop: "8px",
              }}
            >
              <colgroup>
                <col style={{ width: "40px" }} />
                <col />
                <col style={{ width: "150px" }} />
                <col style={{ width: "150px" }} />
              </colgroup>
              <thead>
                <tr>
                  {["No.", "Keterangan", "Nama Customer", "Jumlah"].map((h) => (
                    <th
                      key={h}
                      style={{
                        border: "1px solid #000",
                        padding: "5px 8px",
                        textAlign: "center",
                        fontWeight: 700,
                        background: "#fff",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayItems.map((item, idx) => {
                  const hasData = item !== null;
                  return (
                    <tr key={idx} style={{ height: "24px" }}>
                      <td
                        style={{
                          border: "1px solid #000",
                          padding: "4px 8px",
                          textAlign: "center",
                          verticalAlign: "middle",
                          color: "#374151",
                        }}
                      >
                        {hasData ? idx + 1 : ""}
                      </td>
                      <td
                        style={{
                          border: "1px solid #000",
                          padding: "4px 8px",
                          verticalAlign: "middle",
                          color: hasData && item.description ? "#111" : "#000",
                        }}
                      >
                        {hasData ? (item.description || "-") : ""}
                      </td>
                      <td
                        style={{
                          border: "1px solid #000",
                          padding: "4px 8px",
                          verticalAlign: "middle",
                          color: hasData && item.description ? "#111" : "#000",
                        }}
                      >
                        {item?.customerName ?? ""}
                      </td>
                      <td
                        style={{
                          border: "1px solid #000",
                          padding: "4px 8px",
                          textAlign: "right",
                          verticalAlign: "middle",
                        }}
                      >
                        {hasData ? (
                          <>
                            <span style={{ fontWeight: 600, marginRight: "4px" }}>Rp.</span>
                            {IDR(item.amount ?? 0)}
                          </>
                        ) : (
                          <>
                            <span style={{ fontWeight: 600, marginRight: "4px", color: "#888" }}>Rp.</span>
                            <span style={{ color: "#888" }}>0,00</span>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {/* TERBILANG row */}
                <tr>
                  <td
                    colSpan={3}
                    style={{
                      border: "1px solid #000",
                      padding: "6px 8px",
                      verticalAlign: "middle",
                    }}
                  >
                    <span style={{ fontWeight: 800, fontSize: "11px", marginRight: "8px" }}>
                      TERBILANG
                    </span>
                    <span style={{ fontStyle: "italic", color: "#4b5563", fontSize: "10.5px" }}>
                      {terbilang(total)}
                    </span>
                  </td>
                  <td
                    style={{
                      border: "1px solid #000",
                      padding: "6px 8px",
                      textAlign: "right",
                      fontWeight: 700,
                      fontSize: "11px",
                      whiteSpace: "nowrap",
                      verticalAlign: "middle",
                    }}
                  >
                    Rp. {IDR(total)}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* ── SIGNATURES TABLE ── */}
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "10.5px",
                marginTop: 0,
                borderTop: "none",
              }}
            >
              <tbody>
                <tr>
                  {sigKeys.map(({ key, label }) => {
                    const sig = sigs[key] ?? {};
                    return (
                      <td
                        key={key}
                        style={{
                          border: "1px solid #000",
                          borderTop: "none",
                          padding: "6px 6px 8px",
                          verticalAlign: "top",
                          width: "25%",
                          textAlign: "center",
                        }}
                      >
                        <p
                          style={{
                            fontWeight: 700,
                            fontSize: "10.5px",
                            marginBottom: "28px",
                            textAlign: "center",
                          }}
                        >
                          {label}
                        </p>
                        <div
                          style={{
                            borderBottom: "1px solid #374151",
                            width: "80%",
                            margin: "0 auto 4px",
                          }}
                        />
                        <p
                          style={{
                            fontSize: "10px",
                            textAlign: "left",
                            marginBottom: "2px",
                          }}
                        >
                          <span style={{ fontWeight: 500 }}>Nama: </span>
                          <span
                            style={{
                              borderBottom: "1px solid #000",
                              display: "inline-block",
                              minWidth: "60px",
                              paddingLeft: "2px",
                            }}
                          >
                            {sig.name || ""}
                          </span>
                        </p>
                        <p style={{ fontSize: "10px", textAlign: "left" }}>
                          <span style={{ fontWeight: 500 }}>Tgl.: </span>
                          <span
                            style={{
                              borderBottom: "1px solid #000",
                              display: "inline-block",
                              minWidth: "60px",
                              paddingLeft: "2px",
                            }}
                          >
                            {sig.date ? fmtDateLong(sig.date) : ""}
                          </span>
                        </p>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
