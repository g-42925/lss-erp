"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import useAuth from "@/store/auth"

function LetterheadHeader({ company }: { company: any }) {
  return (
    <div className="w-full mb-5">
      <div className="flex items-center border-b-[6px] border-yellow-400 pb-2">
        {company?.logo ? (
          <img
            src={company.logo}
            alt="Company Logo"
            className="w-16 h-16 object-contain"
          />
        ) : (
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 text-xs">
            Logo
          </div>
        )}

        <div className="ml-3">
          <h1 className="text-2xl font-extrabold text-teal-700 leading-tight">
            {company?.name || "Nama Perusahaan"}
          </h1>
        </div>
      </div>
    </div>
  )
}

function LetterheadFooter({ company }: { company: any }) {
  return (
    <div className="w-full mt-auto">
      <div className="h-3 bg-yellow-400 mb-1" />
      <div className="h-1.5 bg-red-600 w-3/4 mb-1" />

      <div className="bg-teal-300 px-3 py-2 flex items-center gap-4 text-[10px] leading-tight font-semibold">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className="text-lg">🏠</span>

          <div className="min-w-0">
            <p className="font-bold">Kantor Pusat :</p>
            <p className="truncate">{company?.address || "-"}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 min-w-[130px]">
          <span className="text-lg">☎️</span>

          <div>
            <p className="font-bold">Kontak :</p>
            <p>{company?.phone || "-"}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 min-w-[130px]">
          <span className="text-lg">🌐</span>

          <div>
            <p className="font-bold">Website :</p>
            <p>{company?.site || "-"}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function Watermark({ company }: { company: any }) {
  if (!company?.logo) return null

  return (
    <div
      className="absolute inset-0 pointer-events-none z-0 opacity-10 bg-no-repeat bg-center"
      style={{
        backgroundImage: `url(${company.logo})`,
        backgroundSize: "70%",
      }}
    />
  )
}

function A4Page({
  children,
  company,
  pageBreak = false,
}: {
  children: React.ReactNode
  company: any
  pageBreak?: boolean
}) {
  return (
    <div
      className={[
        "page mx-auto bg-white relative overflow-hidden",
        pageBreak ? "print:break-before-page" : "",
      ].join(" ")}
    >
      <div className="page-content">
        <Watermark company={company} />

        <div className="relative z-10 flex flex-col h-full">
          {children}
        </div>
      </div>
    </div>
  )
}

export default function PrintQuotation({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  const masterAccountId = useAuth((state) => state.masterAccountId)
  const hasHydrated = useAuth((state) => state._hasHydrated)

  const [quotation, setQuotation] = useState<any>(null)
  const [company, setCompany] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!hasHydrated || !masterAccountId) return

    fetchData()
  }, [id, hasHydrated, masterAccountId])

  const fetchData = async () => {
    setLoading(true)

    try {
      const res = await fetch(`/api/web/quotations/${id}`)
      const data = await res.json()

      if (!data.error) {
        setQuotation(data.result)
      }

      if (masterAccountId) {
        const compRes = await fetch(
          `/api/web/companies?id=${masterAccountId}`
        )

        const compData = await compRes.json()

        if (
          !compData.error &&
          compData.result &&
          compData.result.length > 0
        ) {
          setCompany(compData.result[0])
        }
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  if (!hasHydrated || loading) {
    return (
      <div className="p-8 text-center">
        Loading...
      </div>
    )
  }

  if (!quotation) {
    return (
      <div className="p-8 text-center text-red-500">
        Quotation not found
      </div>
    )
  }

  const customerName = quotation.customerId
    ? quotation.customerId.name || quotation.customerId.bussinessName
    : quotation.customCustomer?.name

  const productName =
    quotation.productId?.productName || "PEST CONTROL"

  const date = quotation.date

  const frequencyLabels: Record<string, string> = {
    Once: "Sekali",
    Week: "Per Minggu",
    Month: "Per Bulan",
    Year: "Per Tahun",
  }

  return (
    <>
      <style jsx global>{`
        @page {
          size: A4;
          margin: 0;
        }

        html,
        body {
          margin: 0;
          padding: 0;
        }

        .page {
          width: 210mm;
          height: 297mm;
          background: white;
        }

        .page-content {
          box-sizing: border-box;
          width: 210mm;
          height: 297mm;
          padding: 12mm;
          display: flex;
          flex-direction: column;
        }

        @media print {
          html,
          body {
            width: 210mm;
            margin: 0;
            padding: 0;
            background: white;
          }

          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .page {
            width: 210mm;
            height: 297mm;
            min-height: 297mm;
            max-height: 297mm;
            margin: 0;
            padding: 0;
            box-shadow: none !important;
            overflow: hidden;
          }

          .page-content {
            width: 210mm;
            height: 297mm;
            padding: 12mm;
          }

          table {
            page-break-inside: avoid;
          }

          tr,
          td,
          th {
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div className="bg-gray-100 min-h-screen text-black p-8 print:p-0 print:bg-white font-sans">

        {/* =========================================================
            PRINT ACTIONS
        ========================================================= */}

        <div className="flex justify-between items-center p-4 mb-4 bg-gray-200 print:hidden">
          <Link
            href="/sales/quotation"
            className="btn btn-sm btn-outline"
          >
            Back
          </Link>

          <button
            onClick={() => window.print()}
            className="btn btn-sm btn-primary"
          >
            Print PDF
          </button>
        </div>

        {/* =========================================================
            PAGE 1 — PENAWARAN
        ========================================================= */}

        <A4Page company={company}>

          <LetterheadHeader company={company} />

          <div className="flex-1">

            {/* Quotation Number + Title */}

            <div className="mb-4">

              <div className="inline-block border-2 border-gray-400 px-3 py-1 font-bold bg-yellow-100 text-sm mb-3">
                NO : {quotation.quotationNumber}
              </div>

              <h2 className="text-xl font-black underline uppercase tracking-wide text-center">
                PENAWARAN {productName}
              </h2>

            </div>

            {/* Main Content */}

            <div className="text-sm leading-relaxed text-gray-800">

              <p>
                <span className="inline-block w-24">
                  Perihal
                </span>
                :{" "}
                <b>
                  Penawaran Pekerjaan {productName}
                </b>
              </p>

              <p>
                <span className="inline-block w-24">
                  Tanggal
                </span>
                :{" "}
                <b>
                  {date
                    ? date.split("T")[0].split("-").reverse().join("/")
                    : "-"}
                </b>
              </p>

              <p className="mt-2">
                Dengan hormat,
              </p>

              <p className="text-justify mt-2">
                {quotation.introduction || (
                  <>
                    <b>
                      {company?.name || "Perusahaan Kami"}
                    </b>{" "}
                    adalah perusahaan jasa terpadu yang telah dipercaya.
                    Kami hadir untuk memberikan solusi dan pelayanan yang
                    profesional namun tetap dengan harga yang kompetitif
                    dan ekonomis.
                  </>
                )}
              </p>

              <p className="mt-2">
                Dengan ini kami mengajukan penawaran pekerjaan :
              </p>

              {/* Specifications */}

              {quotation.specifications?.length > 0 && (
                <table className="w-full text-left mt-1">
                  <tbody>
                    {quotation.specifications.map(
                      (spec: any, idx: number) => (
                        <tr key={idx}>
                          <td className="align-top py-0.5 w-5 text-center">
                            •
                          </td>

                          <td className="align-top py-0.5 font-semibold">
                            {spec.label}
                          </td>

                          <td className="align-top py-0.5 w-5 text-center">
                            :
                          </td>

                          <td className="align-top py-0.5">
                            {spec.value}
                          </td>
                        </tr>
                      )
                    )}

                    <tr>
                      <td className="align-top py-0.5 text-center">
                        •
                      </td>

                      <td className="align-top py-0.5 font-semibold">
                        Pilihan Harga yang kami tawarkan
                      </td>

                      <td className="align-top py-0.5 text-center">
                        :
                      </td>

                      <td />
                    </tr>
                  </tbody>
                </table>
              )}

              {/* Price Options */}

              {quotation.priceOptions?.length > 0 && (
                <table className="w-full text-left border-collapse mt-1 text-xs">
                  <thead>
                    <tr className="bg-teal-700 text-white">
                      <th className="border border-gray-300 py-1 px-2 text-center w-10">
                        No
                      </th>

                      <th className="border border-gray-300 py-1 px-2">
                        Produk
                      </th>

                      <th className="border border-gray-300 py-1 px-2 text-center w-14">
                        Jml
                      </th>

                      <th className="border border-gray-300 py-1 px-2 text-center w-24">
                        Frekuensi
                      </th>

                      <th className="border border-gray-300 py-1 px-2 text-right w-32">
                        Harga
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {quotation.priceOptions.map(
                      (opt: any, idx: number) => (
                        <tr key={idx}>
                          <td className="border border-gray-300 py-1 px-2 text-center">
                            {idx + 1}
                          </td>

                          <td className="border border-gray-300 py-1 px-2">
                            {productName}
                          </td>

                          <td className="border border-gray-300 py-1 px-2 text-center">
                            {opt.qty}
                          </td>

                          <td className="border border-gray-300 py-1 px-2 text-center">
                            {frequencyLabels[opt.frequency] ||
                              opt.frequency}
                          </td>

                          <td className="border border-gray-300 py-1 px-2 text-right whitespace-nowrap">
                            Rp {opt.price.toLocaleString("id-ID")},-
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              )}

              {/* Note */}

              {quotation.note && (
                <p className="italic font-semibold text-xs mt-2">
                  NB : {quotation.note}
                </p>
              )}

              {/* Disclaimers */}

              {quotation.disclaimers?.length > 0 && (
                <div className="mt-2">
                  <ol className="list-decimal pl-5 space-y-0.5 text-justify">
                    {quotation.disclaimers.map(
                      (disc: string, idx: number) => (
                        <li key={idx}>
                          {disc}
                        </li>
                      )
                    )}
                  </ol>
                </div>
              )}

              {/* Closing */}

              <p className="mt-3 text-justify">
                Demikian surat penawaran ini kami buat, jika ada hal-hal
                yang perlu direvisi atau diperjelas dalam penawaran ini,
                silakan menghubungi pihak kami. Kami selalu siap untuk
                mempresentasikan metode-metode pekerjaan agar sesuai
                dengan yang diharapkan. Atas perhatian dan kerja sama
                yang baik kami ucapkan terima kasih.
              </p>

            </div>

            {/* =====================================================
                SIGNATURES
            ===================================================== */}

            <div className="mt-6 flex justify-between px-8 text-sm">

              <div className="text-center">

                <p className="mb-14">
                  Hormat kami,
                </p>

                <div className="border-b border-black w-44 mb-1" />

                <p className="font-bold">
                  {company?.name || "Nama Perusahaan"}
                </p>

              </div>

              <div className="text-center">

                <p className="mb-14">
                  Dibuat Oleh,
                </p>

                <div className="border-b border-black w-44 mb-1" />

                <p className="font-bold">
                  Sales Support
                </p>

              </div>

            </div>

          </div>

          {/* =======================================================
              FOOTER
          ======================================================= */}

          <LetterheadFooter company={company} />

        </A4Page>

        {/* =========================================================
            PAGE 2 — PROGRAM KERJA
        ========================================================= */}

        {quotation.programs?.length > 0 && (
          <A4Page
            company={company}
            pageBreak
          >

            <LetterheadHeader company={company} />

            <div className="flex-1">

              <h2 className="text-xl font-bold underline mb-4 uppercase">
                PROGRAM KERJA {productName}
              </h2>

              <ul className="list-disc pl-6 space-y-1.5 text-sm text-justify leading-relaxed">
                {quotation.programs.map(
                  (prog: string, idx: number) => (
                    <li key={idx}>
                      {prog}
                    </li>
                  )
                )}
              </ul>

            </div>

            <LetterheadFooter company={company} />

          </A4Page>
        )}

      </div>
    </>
  )
}