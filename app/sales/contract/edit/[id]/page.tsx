"use client"
import { useEffect, useState, Suspense } from "react"
import useAuth from "@/store/auth"
import Link from "next/link"
import { useRouter, useParams } from "next/navigation"
import Swal from "sweetalert2"
import ClausesNoteField, { syncClausesNoteCustomer } from "../../ClausesNoteField"

type Article = { value: string; subArticles: string[] }
type ClausePoint = { label: string; articles: Article[] }

const defaultArticle = (): Article => ({ value: "", subArticles: [""] })
const defaultClausePoint = (): ClausePoint => ({ label: "", articles: [defaultArticle()] })

function toDateInput(val: any): string {
  if (!val) return ""
  const d = new Date(val)
  return d.toISOString().split("T")[0]
}

export default function EditContract() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EditContractContent />
    </Suspense>
  )
}

function EditContractContent() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string

  const loggedIn = useAuth((s) => s.loggedIn)
  const masterAccountId = useAuth((s) => s.masterAccountId)
  const hasHydrated = useAuth((s) => s._hasHydrated)

  const [products, setProducts] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [pageLoading, setPageLoading] = useState(true)
  const [loading, setLoading] = useState(false)

  // Form state
  const [applicantName, setApplicantName] = useState("")
  const [customerId, setCustomerId] = useState("")
  const [productId, setProductId] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [rulesTitle, setRulesTitle] = useState("")
  const [rulesPoints, setRulesPoints] = useState<string[]>([""])
  const [clausesNote, setClausesNote] = useState("")
  const [clausesTitle, setClausesTitle] = useState("")
  const [clausesPoints, setClausesPoints] = useState<ClausePoint[]>([defaultClausePoint()])
  const [billingValue, setBillingValue] = useState<number>(0)
  const [billingNote, setBillingNote] = useState("")

  useEffect(() => {
    if (loggedIn && hasHydrated && masterAccountId && id) {
      Promise.all([
        fetch(`/api/web/products?id=${masterAccountId}&type=all`).then((r) => r.json()),
        fetch(`/api/web/customers?id=${masterAccountId}`).then((r) => r.json()),
        fetch(`/api/web/contracts/${id}`).then((r) => r.json()),
      ]).then(([prodData, custData, contractData]) => {
        if (!prodData.error) setProducts(prodData.result || [])
        if (!custData.error) setCustomers(custData.result || [])

        if (!contractData.error && contractData.result) {
          const c = contractData.result
          const loadedCustomerId = c.customerId?._id || c.customerId || ""
          const loadedCustomerList = !custData.error ? custData.result || [] : []
          const loadedCompanyName =
            c.customerId?.companyName ||
            loadedCustomerList.find((cust: any) => cust._id === loadedCustomerId)?.companyName ||
            ""

          setApplicantName(c.applicantName || "")
          setCustomerId(loadedCustomerId)
          setProductId(c.productId?._id || c.productId || "")
          setFrom(toDateInput(c.from))
          setTo(toDateInput(c.to))
          setRulesTitle(c.rules?.title || "")
          setRulesPoints(c.rules?.points?.length ? c.rules.points : [""])
          setClausesNote(
            syncClausesNoteCustomer(c.clauses?.note || "", "", loadedCompanyName)
          )
          setClausesTitle(c.clauses?.title || "")
          setClausesPoints(
            c.clauses?.points?.length
              ? c.clauses.points.map((cp: any) => ({
                label: cp.label || "",
                articles: cp.articles?.length
                  ? cp.articles.map((a: any) => ({
                    value: a.value || "",
                    subArticles: a.subArticles?.length ? a.subArticles : [""],
                  }))
                  : [defaultArticle()],
              }))
              : [defaultClausePoint()]
          )
          setBillingValue(c.billing?.value ?? 0)
          setBillingNote(c.billing?.note || "")
        } else {
          Swal.fire("Error", "Kontrak tidak ditemukan", "error").then(() => router.push("/sales/contract"))
        }
      }).catch(() => {
        Swal.fire("Error", "Gagal memuat data", "error")
      }).finally(() => setPageLoading(false))
    }
  }, [loggedIn, hasHydrated, masterAccountId, id])

  const selectedCustomer = customers.find((c) => c._id === customerId)
  const lockedCompanyName = selectedCustomer?.companyName || ""

  const handleCustomerChange = (nextCustomerId: string) => {
    const prevCustomer = customers.find((c) => c._id === customerId)
    const nextCustomer = customers.find((c) => c._id === nextCustomerId)
    setCustomerId(nextCustomerId)
    setClausesNote((prevNote) =>
      syncClausesNoteCustomer(
        prevNote,
        prevCustomer?.companyName || "",
        nextCustomer?.companyName || ""
      )
    )
  }

  // ── Rules helpers
  const addRulesPoint = () => setRulesPoints([...rulesPoints, ""])
  const updateRulesPoint = (i: number, val: string) => {
    const pts = [...rulesPoints]; pts[i] = val; setRulesPoints(pts)
  }
  const removeRulesPoint = (i: number) => setRulesPoints(rulesPoints.filter((_, idx) => idx !== i))

  // ── Clauses helpers
  const addClausePoint = () => setClausesPoints([...clausesPoints, defaultClausePoint()])
  const removeClausePoint = (pi: number) => setClausesPoints(clausesPoints.filter((_, i) => i !== pi))
  const updateClauseLabel = (pi: number, val: string) => {
    const pts = [...clausesPoints]; pts[pi] = { ...pts[pi], label: val }; setClausesPoints(pts)
  }
  const addArticle = (pi: number) => {
    const pts = [...clausesPoints]; pts[pi].articles = [...pts[pi].articles, defaultArticle()]; setClausesPoints(pts)
  }
  const removeArticle = (pi: number, ai: number) => {
    const pts = [...clausesPoints]; pts[pi].articles = pts[pi].articles.filter((_, i) => i !== ai); setClausesPoints(pts)
  }
  const updateArticleValue = (pi: number, ai: number, val: string) => {
    const pts = [...clausesPoints]; pts[pi].articles[ai].value = val; setClausesPoints(pts)
  }
  const addSubArticle = (pi: number, ai: number) => {
    const pts = [...clausesPoints]; pts[pi].articles[ai].subArticles = [...pts[pi].articles[ai].subArticles, ""]; setClausesPoints(pts)
  }
  const removeSubArticle = (pi: number, ai: number, si: number) => {
    const pts = [...clausesPoints]; pts[pi].articles[ai].subArticles = pts[pi].articles[ai].subArticles.filter((_, i) => i !== si); setClausesPoints(pts)
  }
  const updateSubArticle = (pi: number, ai: number, si: number, val: string) => {
    const pts = [...clausesPoints]; pts[pi].articles[ai].subArticles[si] = val; setClausesPoints(pts)
  }

  // ── Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!applicantName.trim()) { Swal.fire("Error", "Nama pemohon harus diisi", "error"); return }
    if (!productId) { Swal.fire("Error", "Pilih produk / layanan", "error"); return }
    if (!from || !to) { Swal.fire("Error", "Periode kontrak harus diisi", "error"); return }
    if (new Date(from) >= new Date(to)) { Swal.fire("Error", "Tanggal akhir harus setelah tanggal mulai", "error"); return }

    setLoading(true)
    try {
      const payload = {
        applicantName: applicantName.trim(),
        customerId: customerId || undefined,
        productId,
        from,
        to,
        rules: {
          title: rulesTitle,
          points: rulesPoints.filter((p) => p.trim() !== ""),
        },
        clauses: {
          note: clausesNote,
          title: clausesTitle,
          points: clausesPoints.map((cp) => ({
            label: cp.label,
            articles: cp.articles.map((a) => ({
              value: a.value,
              subArticles: a.subArticles.filter((s) => s.trim() !== ""),
            })),
          })),
        },
        billing: {
          value: billingValue,
          note: billingNote,
        },
      }

      const res = await fetch(`/api/web/contracts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (!data.error) {
        await Swal.fire("Berhasil!", "Kontrak berhasil diperbarui.", "success")
        router.push("/sales/contract")
      } else {
        Swal.fire("Error", data.message, "error")
      }
    } catch {
      Swal.fire("Error", "Something went wrong", "error")
    } finally {
      setLoading(false)
    }
  }

  if (!hasHydrated || pageLoading) {
    return <div className="p-8 text-center"><span className="loading loading-spinner loading-lg" /></div>
  }

  return (
    <div className="p-8 max-w-4xl mx-auto pb-32">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Edit Kontrak</h1>
        <Link href="/sales/contract" className="btn btn-outline">Kembali</Link>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-lg space-y-8">

        {/* ── Informasi Dasar ── */}
        <section className="space-y-4 border-b pb-6">
          <h2 className="text-xl font-semibold">Informasi Dasar</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control w-full md:col-span-2">
              <label className="label"><span className="label-text">Nama Pemohon <span className="text-error">*</span></span></label>
              <input
                type="text"
                className="input input-bordered"
                required
                placeholder="Nama lengkap pemohon kontrak"
                value={applicantName}
                onChange={(e) => setApplicantName(e.target.value)}
              />
            </div>

            <div className="form-control w-full">
              <label className="label"><span className="label-text">Customer (opsional)</span></label>
              <select className="select select-bordered" value={customerId} onChange={(e) => handleCustomerChange(e.target.value)}>
                <option value="">-- Tanpa Customer --</option>
                {customers.map((c) => (
                  <option key={c._id} value={c._id}>{c.name || c.bussinessName}</option>
                ))}
              </select>
            </div>

            <div className="form-control w-full">
              <label className="label"><span className="label-text">Produk / Layanan <span className="text-error">*</span></span></label>
              <select className="select select-bordered" required value={productId} onChange={(e) => setProductId(e.target.value)}>
                <option value="">-- Pilih Produk --</option>
                {products.map((p) => (
                  <option key={p._id} value={p._id}>{p.productName}</option>
                ))}
              </select>
            </div>

            <div className="form-control w-full">
              <label className="label"><span className="label-text">Tanggal Mulai <span className="text-error">*</span></span></label>
              <input type="date" className="input input-bordered" required value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>

            <div className="form-control w-full">
              <label className="label"><span className="label-text">Tanggal Berakhir <span className="text-error">*</span></span></label>
              <input type="date" className="input input-bordered" required value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
        </section>

        {/* ── Rules ── */}
        <section className="space-y-4 border-b pb-6">
          <h2 className="text-xl font-semibold">Rules (Ketentuan)</h2>
          <div className="form-control w-full">
            <label className="label"><span className="label-text">Judul Rules <span className="text-error">*</span></span></label>
            <input
              type="text"
              className="input input-bordered"
              required
              placeholder="Contoh: Ketentuan Umum"
              value={rulesTitle}
              onChange={(e) => setRulesTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-medium text-sm">Poin Ketentuan</span>
              <button type="button" onClick={addRulesPoint} className="btn btn-xs btn-primary">+ Tambah Poin</button>
            </div>
            {rulesPoints.map((pt, i) => (
              <div key={i} className="flex gap-2 items-center">
                <span className="text-sm text-gray-500 w-6 shrink-0">{i + 1}.</span>
                <input
                  type="text"
                  className="input input-bordered input-sm w-full"
                  placeholder={`Poin ${i + 1}`}
                  value={pt}
                  onChange={(e) => updateRulesPoint(i, e.target.value)}
                />
                {rulesPoints.length > 1 && (
                  <button type="button" onClick={() => removeRulesPoint(i)} className="btn btn-error btn-xs text-white shrink-0">✕</button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── Clauses ── */}
        <section className="space-y-4 pb-6">
          <h2 className="text-xl font-semibold">Clauses (Pasal-Pasal)</h2>
          <ClausesNoteField
            value={clausesNote}
            onChange={setClausesNote}
            lockedCompanyName={lockedCompanyName}
          />
          <div className="form-control w-full">
            <label className="label"><span className="label-text">Judul Clauses <span className="text-error">*</span></span></label>
            <input
              type="text"
              className="input input-bordered"
              required
              placeholder="Contoh: Pasal-Pasal Perjanjian"
              value={clausesTitle}
              onChange={(e) => setClausesTitle(e.target.value)}
            />
          </div>
          <div className="space-y-6">
            {clausesPoints.map((cp, pi) => (
              <div key={pi} className="border rounded-lg p-4 space-y-4 bg-gray-50">
                <div className="flex gap-2 items-center">
                  <span className="font-semibold text-sm shrink-0">Pasal {pi + 1}</span>
                  <input
                    type="text"
                    className="input input-bordered input-sm w-full"
                    required
                    placeholder="Label pasal"
                    value={cp.label}
                    onChange={(e) => updateClauseLabel(pi, e.target.value)}
                  />
                  {clausesPoints.length > 1 && (
                    <button type="button" onClick={() => removeClausePoint(pi)} className="btn btn-error btn-xs text-white shrink-0">✕ Hapus Pasal</button>
                  )}
                </div>

                <div className="ml-4 space-y-3">
                  {cp.articles.map((art, ai) => (
                    <div key={ai} className="border-l-2 border-blue-200 pl-3 space-y-2">
                      <div className="flex gap-2 items-center">
                        <span className="text-xs text-gray-500 shrink-0">Ayat {ai + 1}</span>
                        <input
                          type="text"
                          className="input input-bordered input-xs w-full"
                          required
                          placeholder="Isi ayat..."
                          value={art.value}
                          onChange={(e) => updateArticleValue(pi, ai, e.target.value)}
                        />
                        {cp.articles.length > 1 && (
                          <button type="button" onClick={() => removeArticle(pi, ai)} className="btn btn-error btn-xs text-white shrink-0">✕</button>
                        )}
                      </div>
                      <div className="ml-4 space-y-1">
                        {art.subArticles.map((sub, si) => (
                          <div key={si} className="flex gap-2 items-center">
                            <span className="text-xs text-gray-400 shrink-0">{String.fromCharCode(97 + si)}.</span>
                            <input
                              type="text"
                              className="input input-bordered input-xs w-full"
                              placeholder="Sub-ayat..."
                              value={sub}
                              onChange={(e) => updateSubArticle(pi, ai, si, e.target.value)}
                            />
                            {art.subArticles.length > 1 && (
                              <button type="button" onClick={() => removeSubArticle(pi, ai, si)} className="btn btn-ghost btn-xs text-error">✕</button>
                            )}
                          </div>
                        ))}
                        <button type="button" onClick={() => addSubArticle(pi, ai)} className="btn btn-ghost btn-xs text-blue-500">+ Sub-Ayat</button>
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={() => addArticle(pi)} className="btn btn-outline btn-xs">+ Tambah Ayat</button>
                </div>
              </div>
            ))}
            <button type="button" onClick={addClausePoint} className="btn btn-sm btn-outline btn-primary">+ Tambah Pasal</button>
          </div>
        </section>

        {/* ── Billing ── */}
        <section className="space-y-4 border-t pt-6 pb-6">
          <h2 className="text-xl font-semibold">Billing (Tagihan)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control w-full">
              <label className="label"><span className="label-text">Nilai Tagihan (Rp) <span className="text-error">*</span></span></label>
              <input
                type="number"
                className="input input-bordered"
                required
                min={0}
                placeholder="0"
                value={billingValue}
                onChange={(e) => setBillingValue(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="form-control w-full">
              <label className="label"><span className="label-text">Catatan Billing (opsional)</span></label>
              <input
                type="text"
                className="input input-bordered"
                placeholder="Contoh: Dibayar per bulan"
                value={billingNote}
                onChange={(e) => setBillingNote(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* ── Actions ── */}
        <div className="flex justify-end gap-2 pt-2">
          <Link href="/sales/contract" className="btn btn-ghost">Batal</Link>
          <button type="submit" disabled={loading} className="btn btn-success text-white">
            {loading ? <span className="loading loading-spinner" /> : "Update Kontrak"}
          </button>
        </div>
      </form>
    </div>
  )
}

