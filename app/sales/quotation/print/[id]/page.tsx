"use client"
import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import useAuth from "@/store/auth"

function LetterheadHeader({ company }: { company: any }) {
  return (
    <div className="relative z-10 w-full mb-8">
      <div className="flex justify-between items-center border-b-[8px] border-yellow-400 pb-2">
        <div className="flex items-center gap-4">
          {company?.logo ? (
            <img src={company.logo} alt="Company Logo" className="w-20 h-20 object-contain" />
          ) : (
            <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center text-gray-500">Logo</div>
          )}
          <div>
            <h1 className="text-3xl font-extrabold text-teal-700 m-0 leading-tight">{company?.name || 'Nama Perusahaan'}</h1>
          </div>
        </div>
      </div>
    </div>
  )
}

function LetterheadFooter({ company }: { company: any }) {
  return (
    <div className="w-full relative z-10 mt-auto">
      <div className="h-4 bg-yellow-400 w-full mb-1"></div>
      <div className="h-2 bg-red-600 w-3/4 mb-1"></div>
      <div className="bg-teal-300 p-4 flex flex-wrap gap-4 text-xs font-semibold">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <span className="text-2xl">🏠</span>
          <div>
            <p className="font-bold">Kantor Pusat :</p>
            <p>{company?.address || '-'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 min-w-[150px]">
          <span className="text-2xl">☎️</span>
          <div>
            <p className="font-bold">Kontak :</p>
            <p>{company?.phone || '-'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 min-w-[150px]">
          <span className="text-2xl">🌐</span>
          <div>
            <p className="font-bold">Website :</p>
            <p>{company?.site || '-'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PrintQuotation({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const hasHydrated = useAuth((state) => state._hasHydrated)

  const [quotation, setQuotation] = useState<any>(null)
  const [company, setCompany] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (hasHydrated && masterAccountId) {
      fetchData()
    }
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
        const compRes = await fetch(`/api/web/companies?id=${masterAccountId}`)
        const compData = await compRes.json()
        if (!compData.error && compData.result && compData.result.length > 0) {
          setCompany(compData.result[0])
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (!hasHydrated || loading) return <div className="p-8 text-center">Loading...</div>
  if (!quotation) return <div className="p-8 text-center text-red-500">Quotation not found</div>

  const customerName = quotation.customerId ? (quotation.customerId.name || quotation.customerId.bussinessName) : quotation.customCustomer?.name
  const productName = quotation.productId?.productName || 'PEST CONTROL'

  return (
    <div className="bg-gray-100 min-h-screen text-black print:p-0 p-8 font-sans">
      <div className="max-w-[210mm] mx-auto bg-white shadow-lg print:shadow-none print:w-[210mm] min-h-[297mm] flex flex-col relative overflow-hidden">

        {/* Header Actions (Hidden on Print) */}
        <div className="flex justify-between items-center p-4 print:hidden bg-gray-200 sticky top-0 z-50">
          <Link href="/sales/quotation" className="btn btn-sm btn-outline">Back</Link>
          <button onClick={() => window.print()} className="btn btn-sm btn-primary">Print PDF</button>
        </div>

        {/* --- PAGE 1: PENAWARAN --- */}
        <div className="flex-1 relative z-10 flex flex-col p-10 pb-20">

          {/* Watermark Background */}
          {company?.logo && (
            <div
              className="absolute inset-0 pointer-events-none z-0 opacity-10 bg-no-repeat bg-center"
              style={{ backgroundImage: `url(${company.logo})`, backgroundSize: '70%' }}
            />
          )}

          {/* Header Layout */}
          <LetterheadHeader company={company} />

          <div className="relative z-10">
            <div className="mb-8">
              <div className="inline-block border-2 border-gray-400 px-4 py-1 font-bold bg-yellow-100 mb-6 shadow-sm">
                NO : {quotation.quotationNumber}
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-black underline uppercase tracking-wide">PENAWARAN {productName}</h2>
              </div>
            </div>

            <div className="text-md space-y-4 leading-relaxed text-gray-800">
              <p>
                <span className="inline-block w-24">Perihal</span>: <b>Penawaran Pekerjaan {productName}</b>
              </p>

              <p>Dengan hormat,</p>

              <p className="text-justify">
                {quotation.introduction || (
                  <><b>{company?.name || 'Perusahaan Kami'}</b> adalah perusahaan jasa terpadu yang telah dipercaya. Kami hadir untuk memberikan solusi dan pelayanan yang profesional namun tetap dengan harga yang kompetitif dan ekonomis.</>
                )}
              </p>

              <p>Dengan ini kami mengajukan penawaran pekerjaan :</p>

              <table className="w-full text-left">
                <tbody>
                  <tr>
                  </tr>
                  {quotation.specifications && quotation.specifications.map((spec: any, idx: number) => (
                    <tr key={idx}>
                      <td className="align-top py-1 text-center">•</td>
                      <td className="align-top py-1 font-semibold">{spec.label}</td>
                      <td className="align-top py-1 text-center">:</td>
                      <td className="align-top py-1">{spec.value}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="align-top py-1 text-center">•</td>
                    <td className="align-top py-1 font-semibold">Pilihan Harga yang kami tawarkan</td>
                    <td className="align-top py-1 text-center">:</td>
                    <td className="align-top py-1"></td>
                  </tr>
                </tbody>
              </table>

              {/* Price Options Table */}
              {quotation.priceOptions && quotation.priceOptions.length > 0 && (
                <table className="w-full text-left border-collapse mt-2 mb-2 text-sm">
                  <thead>
                    <tr className="bg-teal-700 text-white">
                      <th className="border border-gray-300 py-2 px-3 text-center">No</th>
                      <th className="border border-gray-300 py-2 px-3">Produk</th>
                      <th className="border border-gray-300 py-2 px-3 text-center">Jml</th>
                      <th className="border border-gray-300 py-2 px-3 text-center">Frekuensi</th>
                      <th className="border border-gray-300 py-2 px-3 text-right">Harga</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotation.priceOptions.map((opt: any, idx: number) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="border border-gray-300 py-2 px-3 text-center">{idx + 1}</td>
                        <td className="border border-gray-300 py-2 px-3">{productName}</td>
                        <td className="border border-gray-300 py-2 px-3 text-center">{opt.qty}</td>
                        <td className="border border-gray-300 py-2 px-3 text-center">{{ Once: 'Sekali', Week: 'Per Minggu', Month: 'Per Bulan', Year: 'Per Tahun' }[opt.frequency as string] || opt.frequency}</td>
                        <td className="border border-gray-300 py-2 px-3 text-right">Rp {opt.price.toLocaleString('id-ID')},-</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <table className="w-full text-left">
                <tbody>
                </tbody>
              </table>

              {quotation.note && (
                <p className="italic font-semibold text-sm mt-4">
                  NB : {quotation.note}
                </p>
              )}

              {quotation.disclaimers && quotation.disclaimers.length > 0 && (
                <div className="mt-4">
                  <ol className="list-decimal pl-6 mt-1 space-y-1 text-justify">
                    {quotation.disclaimers.map((disc: string, idx: number) => (
                      <li key={idx}>{disc}</li>
                    ))}
                  </ol>
                </div>
              )}

              <p className="mt-6 text-justify">
                Demikian surat penawaran ini kami buat, jika ada hal-hal yang perlu direvisi atau diperjelas dalam penawaran ini, silakan menghubungi pihak kami. Kami selalu siap untuk mempresentasikan metode-metode pekerjaan agar sesuai dengan yang diharapkan. Atas perhatian dan kerja sama yang baik kami ucapkan terima kasih.
              </p>
            </div>

            {/* Signatures */}
            <div className="mt-16 flex justify-between px-10">
              <div className="text-center">
                <p className="mb-24">Hormat kami,</p>
                <div className="border-b border-black w-48 mb-1"></div>
                <p className="font-bold">{company?.name || 'Nama Perusahaan'}</p>
              </div>
              <div className="text-center">
                <p className="mb-24">Dibuat Oleh,</p>
                <div className="border-b border-black w-48 mb-1"></div>
                <p className="font-bold">Sales Support</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Area - Pin to bottom of page 1 */}
        <LetterheadFooter company={company} />
      </div>

      {/* --- PAGE 2: PROGRAM KERJA (only if there are programs) --- */}
      {quotation.programs && quotation.programs.length > 0 && (
        <div className="max-w-[210mm] mx-auto bg-white shadow-lg print:shadow-none print:w-[210mm] min-h-[297mm] flex flex-col relative overflow-hidden mt-8 print:mt-0 print:break-before-page">

          <div className="flex-1 relative z-10 flex flex-col p-10 pb-20">
            {/* Watermark Background */}
            {company?.logo && (
              <div
                className="absolute inset-0 pointer-events-none z-0 opacity-10 bg-no-repeat bg-center"
                style={{ backgroundImage: `url(${company.logo})`, backgroundSize: '70%' }}
              />
            )}

            {/* Header Layout (Simplified for page 2) */}
            <LetterheadHeader company={company} />

            <div className="relative z-10">
              <h2 className="text-xl font-bold underline mb-6 uppercase">PROGRAM KERJA {productName}</h2>
              <ul className="list-disc pl-8 space-y-3 text-gray-800 text-justify leading-relaxed">
                {quotation.programs.map((prog: string, idx: number) => (
                  <li key={idx}>{prog}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Footer Area Page 2 */}
          <LetterheadFooter company={company} />
        </div>
      )}

    </div>
  )
}
