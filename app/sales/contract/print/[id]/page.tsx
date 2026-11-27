"use client"

import { use, useEffect, useLayoutEffect, useRef, useState } from "react"
import Link from "next/link"
import useAuth from "@/store/auth"

type Article = {
  value: string
  subArticles?: string[]
}

type ClausePoint = {
  label: string
  articles: Article[]
}

function formatMonthYear(dateValue?: string | Date | null): string {
  if (!dateValue) return "-"
  const d = new Date(dateValue)
  if (Number.isNaN(d.getTime())) return "-"
  return d.toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  })
}

function formatFullDate(dateValue?: string | Date | null): string {
  if (!dateValue) return "-"
  const d = new Date(dateValue)
  if (Number.isNaN(d.getTime())) return "-"
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

function formatRupiah(value?: number | null): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "-"
  }
  return `Rp. ${Number(value).toLocaleString("id-ID")},-`
}

function ContractHeader({
  company,
  contractNumber,
}: {
  company: any
  contractNumber?: string
}) {
  return (
    <header className="w-full mb-4 shrink-0">
      <div className="flex items-center gap-4 pb-2 border-b-[2.5px] border-[#4a90c2]">
        {/* Logo */}
        <div className="shrink-0">
          {company?.logo ? (
            <img
              src={company.logo}
              alt={company?.name || "Company Logo"}
              className="w-20 h-16 object-contain"
            />
          ) : (
            <div className="w-20 h-16 bg-gray-100 border border-gray-300 rounded flex items-center justify-center text-gray-400 text-xs">
              Logo
            </div>
          )}
        </div>

        {/* Company Identity */}
        <div className="flex-1 text-center leading-snug">
          <h1 className="text-[26px] font-extrabold text-[#2f6f4e] tracking-tight leading-none mb-1">
            {company?.name || "Nama Perusahaan"}
          </h1>
          {company?.address && (
            <p className="text-[10.5px] text-gray-700 font-medium leading-tight">
              Head Office : {company.address}
            </p>
          )}
          {(company?.phone || company?.email) && (
            <p className="text-[10.5px] text-gray-700 font-medium leading-tight mt-0.5">
              {company?.phone ? `Head Office (Hunting) : ${company.phone}` : ""}
              {company?.phone && company?.email ? " | " : ""}
              {company?.email ? `Email : ${company.email}` : ""}
            </p>
          )}
        </div>

        {/* Right spacer to keep company title centered */}
        <div className="w-20 shrink-0 hidden sm:block" />
      </div>

      {/* Contract Number */}
      <div className="flex justify-end mt-1">
        <p className="text-[10.5px] font-semibold text-gray-800">
          No : {contractNumber || "-"}
        </p>
      </div>
    </header>
  )
}

function ContractFooter({
  company,
  year,
}: {
  company: any
  year: number
}) {
  return (
    <footer className="w-full mt-auto pt-3 shrink-0">
      <div className="border-t-[2.5px] border-[#4a90c2] pt-2 relative">
        <div className="text-center text-[9.5px] text-gray-700 leading-tight px-14">
          <p>
            Client Confidential. This contract shall not be distributed or shown
            to outside parties and personnel.
          </p>
          <p className="font-semibold mt-0.5">
            Copyright {company?.name || "Perusahaan"} {year}
          </p>
        </div>

        {/* Paraf */}
        <div className="absolute right-0 bottom-0 flex items-end gap-1.5 text-[9.5px] text-gray-700">
          <span>paraf</span>
          <span className="inline-block w-10 border-b border-gray-500 mb-0.5" />
        </div>
      </div>
    </footer>
  )
}

function Watermark({ company }: { company: any }) {
  if (!company?.logo) return null

  return (
    <div
      className="absolute inset-0 pointer-events-none z-0 opacity-[0.06] bg-no-repeat bg-center"
      style={{
        backgroundImage: `url(${company.logo})`,
        backgroundSize: "65%",
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
        "page mx-auto bg-white relative overflow-hidden shadow-lg print:shadow-none mb-8 print:mb-0",
        pageBreak ? "print:break-before-page" : "",
      ].join(" ")}
    >
      <div className="page-content">
        <Watermark company={company} />
        <div className="relative z-10 flex flex-col h-full">{children}</div>
      </div>
    </div>
  )
}

function ClausePointBlock({
  point,
  clauseIndex,
}: {
  point: ClausePoint
  clauseIndex: number
}) {
  return (
    <div className="mb-3.5 text-[11.5px] leading-relaxed text-gray-900">
      <h3 className="font-bold uppercase text-[12px] mb-1">
        Pasal {clauseIndex + 1} — {point.label}
      </h3>
      <ol className="list-decimal pl-5 space-y-1 text-justify">
        {point.articles?.map((art, ai) => {
          const validSubs = (art.subArticles || []).filter(
            (s) => s && s.trim() !== ""
          )
          return (
            <li key={ai} className="pl-1">
              <span>{art.value}</span>
              {validSubs.length > 0 && (
                <ol
                  type="a"
                  className="list-[lower-alpha] pl-5 mt-1 space-y-0.5 text-justify"
                >
                  {validSubs.map((sub, si) => (
                    <li key={si} className="pl-1">
                      {sub}
                    </li>
                  ))}
                </ol>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

export default function PrintContract({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  const masterAccountId = useAuth((state) => state.masterAccountId)
  const activeUserName = useAuth((state) => state.name)
  const hasHydrated = useAuth((state) => state._hasHydrated)

  const [contract, setContract] = useState<any>(null)
  const [company, setCompany] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Paginated clause indices: each sub-array holds indices into contract.clauses.points
  const [clausePages, setClausePages] = useState<number[][]>([])

  // Measurement refs for automatic A4 clause pagination
  const measurePageRef = useRef<HTMLDivElement>(null)
  const measureHeaderRef = useRef<HTMLDivElement>(null)
  const measureFooterRef = useRef<HTMLDivElement>(null)
  const measureIntroRef = useRef<HTMLDivElement>(null)
  const measureClauseRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    if (!hasHydrated || !masterAccountId) return
    fetchData()
  }, [id, hasHydrated, masterAccountId])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/web/contracts/${id}`)
      const data = await res.json()
      if (!data.error) {
        setContract(data.result)
      }

      if (masterAccountId) {
        const compRes = await fetch(`/api/web/companies?id=${masterAccountId}`)
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

  // Measure rendered clause blocks and split across A4 pages so preview & print match 1:1
  useLayoutEffect(() => {
    if (!contract) return

    const points: ClausePoint[] = contract.clauses?.points || []
    if (points.length === 0) {
      setClausePages([[]])
      return
    }

    const pageEl = measurePageRef.current
    const headerEl = measureHeaderRef.current
    const footerEl = measureFooterRef.current
    if (!pageEl || !headerEl || !footerEl) {
      setClausePages([points.map((_, i) => i)])
      return
    }

    const totalContentHeight = pageEl.clientHeight
    const headerHeight = headerEl.offsetHeight
    const footerHeight = footerEl.offsetHeight
    const introHeight = measureIntroRef.current?.offsetHeight || 0
    // Leave a small safety margin so content never touches footer
    const maxBodyHeight = Math.max(
      200,
      totalContentHeight - headerHeight - footerHeight - 16
    )

    const pages: number[][] = []
    let currentPage: number[] = []
    let currentHeight = introHeight

    points.forEach((_, idx) => {
      const el = measureClauseRefs.current[idx]
      const itemHeight = el ? el.offsetHeight + 14 : 100

      if (
        currentPage.length > 0 &&
        currentHeight + itemHeight > maxBodyHeight
      ) {
        pages.push(currentPage)
        currentPage = [idx]
        currentHeight = itemHeight
      } else {
        currentPage.push(idx)
        currentHeight += itemHeight
      }
    })

    if (currentPage.length > 0) {
      pages.push(currentPage)
    }

    setClausePages(pages)
  }, [contract, company])

  if (!hasHydrated || loading) {
    return <div className="p-8 text-center">Loading...</div>
  }

  if (!contract) {
    return (
      <div className="p-8 text-center text-red-500">Contract not found</div>
    )
  }

  const productName = contract.productId?.productName || ""
  const coverTitle = productName
    ? `KONTRAK ${productName.toUpperCase()}`
    : "KONTRAK"

  const creatorCompanyName = company?.name || "Perusahaan Pembuat"
  const secondPartyName = contract.customerId?.companyName || "-"
  const outletName = contract.customerId?.bussinessName || "-"
  const applicantName = contract.applicantName
  const startMonthYear = formatMonthYear(contract.from)
  const startFullDate = formatFullDate(contract.from)
  const endFullDate = formatFullDate(contract.to)
  const contractYear = contract.from
    ? new Date(contract.from).getFullYear()
    : new Date().getFullYear()

  const billingAmountText =
    contract.billing?.value !== undefined && contract.billing?.value !== null
      ? `${formatRupiah(contract.billing.value)}${contract.billing?.note?.trim()
        ? ` ( ${contract.billing.note.trim()} )`
        : ""
      }`
      : "-"

  const clausesPoints: ClausePoint[] = contract.clauses?.points || []
  const renderedClausePages =
    clausePages.length > 0 ? clausePages : [clausesPoints.map((_, i) => i)]
  const totalPages = 3 + renderedClausePages.length

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
          padding: 12mm 14mm;
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
            padding: 12mm 14mm;
          }
        }
      `}</style>

      {/* Hidden A4 Measurement Container for Exact Clause Pagination */}
      <div
        aria-hidden="true"
        className="fixed -left-[9999px] top-0 pointer-events-none opacity-0 font-sans"
      >
        <div className="page">
          <div ref={measurePageRef} className="page-content">
            <div ref={measureHeaderRef}>
              <ContractHeader
                company={company}
                contractNumber={contract.contractNumber}
              />
            </div>

            <div ref={measureIntroRef}>
              {contract.clauses?.title && (
                <h2 className="text-[14px] font-bold underline uppercase text-center mb-2">
                  {contract.clauses.title}
                </h2>
              )}
              {contract.clauses?.note && (
                <p className="text-[11.5px] text-justify leading-relaxed mb-3">
                  {contract.clauses.note}
                </p>
              )}
            </div>

            {clausesPoints.map((cp, idx) => (
              <div
                key={idx}
                ref={(el) => {
                  measureClauseRefs.current[idx] = el
                }}
              >
                <ClausePointBlock point={cp} clauseIndex={idx} />
              </div>
            ))}

            <div ref={measureFooterRef}>
              <ContractFooter company={company} year={contractYear} />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-100 min-h-screen text-black p-4 md:p-8 print:p-0 print:bg-white font-sans">
        {/* PRINT ACTIONS BAR */}
        <div className="max-w-[210mm] mx-auto flex justify-between items-center p-3 mb-6 bg-white rounded-lg shadow print:hidden">
          <Link href="/sales/contract" className="btn btn-sm btn-outline">
            ← Kembali
          </Link>

          <div className="text-xs text-gray-500 font-medium hidden sm:block">
            Print Preview • {totalPages} Halaman (A4)
          </div>

          <button
            type="button"
            onClick={() => {
              document.title = `Kontrak ${contract.contractNumber || ""} - ${secondPartyName}`
              window.print()
            }}
            className="btn btn-sm btn-primary"
          >
            Print / Save PDF
          </button>
        </div>

        {/* PAGE 1 — COVER */}
        <A4Page company={company}>
          <ContractHeader
            company={company}
            contractNumber={contract.contractNumber}
          />

          <div className="flex-1 flex flex-col items-center justify-between py-10 text-center">
            <h2 className="text-base font-bold underline uppercase tracking-wide text-gray-900">
              {coverTitle}
            </h2>

            <div className="flex flex-col items-center justify-center space-y-10 my-auto">
              <p className="text-base font-bold underline text-gray-900">
                {creatorCompanyName}
              </p>

              <p className="text-sm font-medium text-gray-800">dengan</p>

              <p className="text-base font-bold underline text-gray-900">
                {secondPartyName}
              </p>

              <p className="text-base font-bold text-gray-900 pt-2">
                {startMonthYear}
              </p>
            </div>

            <p className="text-xs font-bold tracking-wider uppercase text-gray-900">
              CLIENT CONFIDENTIAL
            </p>
          </div>

          <ContractFooter company={company} year={contractYear} />
        </A4Page>

        {/* PAGE 2 — RULES & ACKNOWLEDGMENT */}
        <A4Page company={company} pageBreak>
          <ContractHeader
            company={company}
            contractNumber={contract.contractNumber}
          />

          <div className="flex-1 flex flex-col justify-between py-2">
            <div>
              <h2 className="text-[13px] font-bold underline uppercase mb-3 text-gray-900">
                {contract.rules?.title || "SYARAT DAN KETENTUAN"}
              </h2>

              <ol className="list-decimal pl-5 space-y-2 text-[12px] leading-relaxed text-justify text-gray-900">
                {(contract.rules?.points || []).map(
                  (point: string, idx: number) => (
                    <li key={idx} className="pl-1">
                      {point}
                    </li>
                  )
                )}
              </ol>
            </div>

            {/* Bottom Acknowledgment Section */}
            <div className="mt-8 mb-4 text-[12px] text-gray-900">
              <p className="underline mb-4">
                Syarat dan ketentuan diatas sudah dimengerti dan Diketahui oleh:
              </p>

              <div className="flex justify-end pr-6">
                <table className="text-[12px] border-collapse">
                  <tbody>
                    <tr>
                      <td className="py-1 pr-6 font-medium">Nama</td>
                      <td className="py-1 pr-2">:</td>
                      <td className="py-1 font-medium">{secondPartyName}</td>
                    </tr>
                    <tr>
                      <td className="py-1 pr-6 font-medium">Outlet</td>
                      <td className="py-1 pr-2">:</td>
                      <td className="py-1 font-medium">{outletName}</td>
                    </tr>
                    <tr>
                      <td className="py-1 pr-6 font-medium">Tanggal</td>
                      <td className="py-1 pr-2">:</td>
                      <td className="py-1 font-medium">{startFullDate}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <ContractFooter company={company} year={contractYear} />
        </A4Page>

        {/* PAGE 3+ — CLAUSES */}
        {renderedClausePages.map((pointIndices, pageIdx) => (
          <A4Page key={pageIdx} company={company} pageBreak>
            <ContractHeader
              company={company}
              contractNumber={contract.contractNumber}
            />

            <div className="flex-1 py-1">
              {pageIdx === 0 && (
                <div className="mb-3">
                  {contract.clauses?.title && (
                    <h2 className="text-[14px] font-bold underline uppercase text-center mb-2 text-gray-900">
                      {contract.clauses.title}
                    </h2>
                  )}
                  {contract.clauses?.note && (
                    <p className="text-[11.5px] text-justify leading-relaxed text-gray-900">
                      {contract.clauses.note}
                    </p>
                  )}
                </div>
              )}

              {pointIndices.map((clauseIdx) => {
                const cp = clausesPoints[clauseIdx]
                if (!cp) return null
                return (
                  <ClausePointBlock
                    key={clauseIdx}
                    point={cp}
                    clauseIndex={clauseIdx}
                  />
                )
              })}
            </div>

            <ContractFooter company={company} year={contractYear} />
          </A4Page>
        ))}

        {/* FINAL PAGE — DATA PEMOHON & BILLING AMOUNT */}
        <A4Page company={company} pageBreak>
          <ContractHeader
            company={company}
            contractNumber={contract.contractNumber}
          />

          <div className="flex-1 py-2 text-[12px] text-gray-900">
            {/* Segment 1: Header & Data Pemohon */}
            <h2 className="text-[13px] font-bold underline text-center mb-4">
              {outletName}
            </h2>

            <table className="w-full text-[12px] border-collapse mb-6">
              <tbody>
                <tr>
                  <td className="py-1 pr-4 w-44 align-top">Nama</td>
                  <td className="py-1 pr-3 w-4 align-top">:</td>
                  <td className="py-1 align-top">{applicantName}</td>
                </tr>
                <tr>
                  <td className="py-1 pr-4 w-44 align-top">Perusahaan</td>
                  <td className="py-1 pr-3 w-4 align-top">:</td>
                  <td className="py-1 align-top">{secondPartyName}</td>
                </tr>
                <tr>
                  <td className="py-1 pr-4 w-44 align-top">Tanggal</td>
                  <td className="py-1 pr-3 w-4 align-top">:</td>
                  <td className="py-1 align-top">{startFullDate}</td>
                </tr>
              </tbody>
            </table>

            <h3 className="text-[13px] font-bold underline text-center mb-4">
              Data Pemohon
            </h3>

            <table className="w-full text-[12px] border-collapse mb-8">
              <tbody>
                <tr>
                  <td className="py-1 pr-4 w-44 align-top">Nama Perusahaan</td>
                  <td className="py-1 pr-3 w-4 align-top">:</td>
                  <td className="py-1 align-top">{secondPartyName}</td>
                </tr>
                <tr>
                  <td className="py-1 pr-4 w-44 align-top">Alamat</td>
                  <td className="py-1 pr-3 w-4 align-top">:</td>
                  <td className="py-1 align-top">
                    {contract.customerId?.address || "-"}
                  </td>
                </tr>
                <tr>
                  <td className="py-1 pr-4 w-44 align-top">Kelurahan</td>
                  <td className="py-1 pr-3 w-4 align-top">:</td>
                  <td className="py-1 align-top">
                    {contract.customerId?.village || "-"}
                  </td>
                </tr>
                <tr>
                  <td className="py-1 pr-4 w-44 align-top">Kecamatan</td>
                  <td className="py-1 pr-3 w-4 align-top">:</td>
                  <td className="py-1 align-top">
                    {contract.customerId?.district || "-"}
                  </td>
                </tr>
                <tr>
                  <td className="py-1 pr-4 w-44 align-top">Kota</td>
                  <td className="py-1 pr-3 w-4 align-top">:</td>
                  <td className="py-1 align-top">
                    {contract.customerId?.city || "-"}
                  </td>
                </tr>
                <tr>
                  <td className="py-1 pr-4 w-44 align-top">Provinsi</td>
                  <td className="py-1 pr-3 w-4 align-top">:</td>
                  <td className="py-1 align-top">
                    {contract.customerId?.province || "-"}
                  </td>
                </tr>
                <tr>
                  <td className="py-1 pr-4 w-44 align-top">No. Telp.</td>
                  <td className="py-1 pr-3 w-4 align-top">:</td>
                  <td className="py-1 align-top">
                    {contract.customerId?.mobile || "-"}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Segment 2: Billing Amount */}
            <h3 className="text-[13px] font-bold underline mb-3">
              Billing Amount
            </h3>

            <table className="w-full text-[12px] border-collapse">
              <tbody>
                <tr>
                  <td className="py-1 pr-4 w-56 align-top">
                    Nilai kontrak / bulan / outlet
                  </td>
                  <td className="py-1 pr-3 w-4 align-top">:</td>
                  <td className="py-1 align-top">{billingAmountText}</td>
                </tr>
                <tr>
                  <td className="py-1 pr-4 w-56 align-top">
                    Nama outlet yang berlangganan
                  </td>
                  <td className="py-1 pr-3 w-4 align-top">:</td>
                  <td className="py-1 align-top">{outletName}</td>
                </tr>
                <tr>
                  <td className="py-1 pr-4 w-56 align-top">Durasi kontrak</td>
                  <td className="py-1 pr-3 w-4 align-top">:</td>
                  <td className="py-1 align-top">
                    {startFullDate} – {endFullDate}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Segment 3: Signature */}
            <div className="grid grid-cols-2 gap-16 mt-12 text-[12px] text-gray-900">
              <div>
                <p className="font-semibold">Hormat kami,</p>
                <div className="h-24" />
                <p className="font-bold underline">{activeUserName || "-"}</p>
                <p className="font-bold">{creatorCompanyName}</p>
              </div>

              <div>
                <p className="font-semibold">&nbsp;</p>
                <div className="h-24" />
                <p className="font-bold underline">{applicantName}</p>
                <p className="font-bold">{secondPartyName}</p>
              </div>
            </div>
          </div>

          <ContractFooter company={company} year={contractYear} />
        </A4Page>
      </div>
    </>
  )
}

