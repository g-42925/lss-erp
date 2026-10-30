/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import useAuth from "@/store/auth"
import { formatDateLong } from "@/lib/utils"

const IDR = (n: number) =>
  `Rp ${Number(n || 0).toLocaleString("id-ID")}`

const TAX_LABEL: Record<string, string> = {
  ppn: "PPN 11%",
  ppn12: "PPN 12%",
  none: "—",
}

export default function PrintGoodsQuotation() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <span className="loading loading-spinner loading-lg" />
        </div>
      }
    >
      <PrintContent />
    </Suspense>
  )
}

function PrintContent() {
  const params = useSearchParams()
  const id = params.get("id")
  const masterAccountId = useAuth((s) => s.masterAccountId)
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const companyName = useAuth((s) => s.companyName)

  const [quotation, setQuotation] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!hasHydrated || !id) return
    fetch(`/api/web/goods-quotation/${id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.error) setError(json.message)
        else setQuotation(json.result)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id, hasHydrated])

  useEffect(() => {
    if (quotation) {
      setTimeout(() => window.print(), 600)
    }
  }, [quotation])

  if (!hasHydrated || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  if (error || !quotation) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-600">
        {error || "Quotation tidak ditemukan."}
      </div>
    )
  }

  const custName =
    quotation.customerId?.bussinessName ||
    quotation.customerId?.name ||
    quotation.customCustomer?.name ||
    "—"
  const custAddress =
    quotation.customerId?.address ||
    quotation.customCustomer?.address ||
    ""
  const custPhone =
    quotation.customCustomer?.phone || ""
  const custEmail =
    quotation.customCustomer?.email || ""

  const items = quotation.items ?? []
  const grandTotal = quotation.grandTotal ?? 0
  const subtotal = quotation.subtotal ?? 0
  const totalDiscount = quotation.totalDiscount ?? 0
  const totalTax = quotation.totalTax ?? 0

  return (
    <>
      <style>{`
        @page { size: A4; margin: 18mm 20mm; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
        body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #1e293b; background: white; }
      `}</style>

      {/* Print button — hidden on print */}
      <div className="no-print fixed top-4 right-4 flex gap-2 z-50">
        <button
          onClick={() => window.print()}
          className="bg-teal-700 hover:bg-teal-800 text-white font-semibold px-5 py-2 rounded-xl shadow-lg text-sm transition-all"
        >
          🖨 Cetak
        </button>
        <button
          onClick={() => window.close()}
          className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold px-4 py-2 rounded-xl text-sm transition-all"
        >
          ✕ Tutup
        </button>
      </div>

      <div className="max-w-[794px] mx-auto bg-white p-8">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-8 pb-6 border-b-2 border-teal-600">
          <div>
            <h1 className="text-2xl font-black text-teal-700 tracking-tight uppercase">
              {companyName || "Perusahaan"}
            </h1>
            <p className="text-slate-400 text-xs mt-1">Sales Quotation — Barang</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black text-slate-800">QUOTATION</p>
            <p className="text-sm font-mono font-bold text-teal-600 mt-1">
              {quotation.quotationNumber}
            </p>
          </div>
        </div>

        {/* ── Meta info ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          {/* Customer */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
              Kepada:
            </p>
            <p className="font-bold text-slate-800 text-base">{custName}</p>
            {custAddress && (
              <p className="text-slate-500 text-sm mt-0.5 whitespace-pre-line">
                {custAddress}
              </p>
            )}
            {custPhone && (
              <p className="text-slate-500 text-sm">📞 {custPhone}</p>
            )}
            {custEmail && (
              <p className="text-slate-500 text-sm">✉ {custEmail}</p>
            )}
          </div>

          {/* Dates & info */}
          <div className="text-right">
            <div className="inline-block text-left">
              <table className="text-sm">
                <tbody>
                  <tr>
                    <td className="text-slate-400 pr-4 py-0.5">Tanggal</td>
                    <td className="font-semibold text-slate-800">
                      {formatDateLong(quotation.date)}
                    </td>
                  </tr>
                  {quotation.validUntil && (
                    <tr>
                      <td className="text-slate-400 pr-4 py-0.5">
                        Berlaku Hingga
                      </td>
                      <td className="font-semibold text-slate-800">
                        {formatDateLong(quotation.validUntil)}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td className="text-slate-400 pr-4 py-0.5">Status</td>
                    <td>
                      <span className="font-bold uppercase text-teal-700 text-xs">
                        {quotation.status}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Items table ─────────────────────────────────────────────────── */}
        <table className="w-full border-collapse mb-6 text-sm">
          <thead>
            <tr className="bg-teal-700 text-white">
              <th className="text-left px-4 py-2.5 rounded-tl-lg font-semibold">
                #
              </th>
              <th className="text-left px-4 py-2.5 font-semibold">
                Nama Barang
              </th>
              <th className="text-center px-4 py-2.5 font-semibold">Qty</th>
              <th className="text-center px-4 py-2.5 font-semibold">Sat.</th>
              <th className="text-right px-4 py-2.5 font-semibold">
                Harga Satuan
              </th>
              <th className="text-right px-4 py-2.5 font-semibold">Diskon</th>
              <th className="text-center px-4 py-2.5 font-semibold">Pajak</th>
              <th className="text-right px-4 py-2.5 rounded-tr-lg font-semibold">
                Sub Total
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((it: any, i: number) => {
              let discStr = "—"
              if (it.discountType === "percent" && it.discountValue > 0)
                discStr = `${it.discountValue}%`
              else if (it.discountType === "fixed" && it.discountValue > 0)
                discStr = IDR(it.discountValue)

              return (
                <tr
                  key={i}
                  className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}
                >
                  <td className="px-4 py-2.5 text-slate-400 text-xs">
                    {i + 1}
                  </td>
                  <td className="px-4 py-2.5">
                    <p className="font-semibold text-slate-800">
                      {it.productName}
                    </p>
                    {it.variantName && it.variantName !== it.productName && (
                      <p className="text-slate-400 text-xs">{it.variantName}</p>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center text-slate-700">
                    {it.qty}
                  </td>
                  <td className="px-4 py-2.5 text-center text-slate-500 text-xs">
                    {it.unit || "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-700">
                    {IDR(it.unitPrice)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-rose-600 text-xs">
                    {discStr}
                  </td>
                  <td className="px-4 py-2.5 text-center text-slate-500 text-xs">
                    {TAX_LABEL[it.applicableTax] ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold text-slate-800">
                    {IDR(it.subTotal)}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={7} className="px-4 py-2 text-right text-slate-500 text-sm">
                Subtotal
              </td>
              <td className="px-4 py-2 text-right font-semibold text-slate-700">
                {IDR(subtotal)}
              </td>
            </tr>
            {totalDiscount > 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-1 text-right text-rose-500 text-sm"
                >
                  Diskon
                </td>
                <td className="px-4 py-1 text-right text-rose-500 font-semibold">
                  − {IDR(totalDiscount)}
                </td>
              </tr>
            )}
            {totalTax > 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-1 text-right text-blue-500 text-sm"
                >
                  Pajak
                </td>
                <td className="px-4 py-1 text-right text-blue-500 font-semibold">
                  + {IDR(totalTax)}
                </td>
              </tr>
            )}
            <tr className="border-t-2 border-teal-600">
              <td
                colSpan={7}
                className="px-4 py-3 text-right font-black text-slate-800 text-base"
              >
                Grand Total
              </td>
              <td className="px-4 py-3 text-right font-black text-teal-700 text-lg">
                {IDR(grandTotal)}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* ── Note & Terms ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-6 mb-10">
          {quotation.note && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
              <p className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-1">
                Catatan
              </p>
              <p className="text-slate-700 text-sm whitespace-pre-line">
                {quotation.note}
              </p>
            </div>
          )}
          {quotation.termsConditions && (
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
                Syarat &amp; Ketentuan
              </p>
              <p className="text-slate-600 text-sm whitespace-pre-line">
                {quotation.termsConditions}
              </p>
            </div>
          )}
        </div>

        {/* ── Signature area ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-8 mt-8 pt-6 border-t border-slate-200">
          <div className="text-center">
            <p className="text-xs text-slate-400 mb-16">Hormat kami,</p>
            <p className="font-semibold text-slate-700 text-sm border-t border-slate-300 pt-1 inline-block px-8">
              {companyName || "Perusahaan"}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-400 mb-16">Disetujui oleh,</p>
            <p className="font-semibold text-slate-700 text-sm border-t border-slate-300 pt-1 inline-block px-8">
              {custName}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-slate-100 text-center text-xs text-slate-300">
          Dokumen ini dicetak dari sistem LSS ERP • {quotation.quotationNumber}
        </div>
      </div>
    </>
  )
}
