"use client"

import { useEffect, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Cancel01Icon } from "@hugeicons/core-free-icons"
import Swal from "sweetalert2"
import ClausesNoteField, { syncClausesNoteCustomer } from "./ClausesNoteField"

type Article = { value: string; subArticles: string[] }
type ClausePoint = { label: string; articles: Article[] }

const defaultArticle = (): Article => ({ value: "", subArticles: [""] })
const defaultClausePoint = (): ClausePoint => ({
  label: "",
  articles: [defaultArticle()],
})

function toDateInputValue(val?: string | Date | null): string {
  if (!val) return ""
  const d = new Date(val)
  if (Number.isNaN(d.getTime())) return ""
  return d.toISOString().slice(0, 10)
}

function cloneClausePoints(points?: any[]): ClausePoint[] {
  if (!Array.isArray(points) || points.length === 0) {
    return [defaultClausePoint()]
  }
  return points.map((cp) => ({
    label: cp?.label || "",
    articles:
      Array.isArray(cp?.articles) && cp.articles.length > 0
        ? cp.articles.map((art: any) => ({
            value: art?.value || "",
            subArticles:
              Array.isArray(art?.subArticles) && art.subArticles.length > 0
                ? [...art.subArticles]
                : [""],
          }))
        : [defaultArticle()],
  }))
}

interface CopyContractModalProps {
  contract: any | null
  masterAccountId: string
  onClose: () => void
  onSuccess: () => void
}

export default function CopyContractModal({
  contract,
  masterAccountId,
  onClose,
  onSuccess,
}: CopyContractModalProps) {
  const [products, setProducts] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [fetchingOptions, setFetchingOptions] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [applicantName, setApplicantName] = useState("")
  const [customerId, setCustomerId] = useState("")
  const [productId, setProductId] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")

  // Rules
  const [rulesTitle, setRulesTitle] = useState("")
  const [rulesPoints, setRulesPoints] = useState<string[]>([""])

  // Clauses
  const [clausesNote, setClausesNote] = useState("")
  const [lastCustomerCompanyName, setLastCustomerCompanyName] = useState("")
  const [clausesTitle, setClausesTitle] = useState("")
  const [clausesPoints, setClausesPoints] = useState<ClausePoint[]>([
    defaultClausePoint(),
  ])

  // Billing
  const [billingValue, setBillingValue] = useState<number>(0)
  const [billingNote, setBillingNote] = useState("")

  // Populate form when source contract changes
  useEffect(() => {
    if (!contract) return

    setApplicantName(contract.applicantName || "")
    setCustomerId("")
    setProductId(contract.productId?._id || contract.productId || "")
    setFrom(toDateInputValue(contract.from))
    setTo(toDateInputValue(contract.to))

    setRulesTitle(contract.rules?.title || "")
    setRulesPoints(
      Array.isArray(contract.rules?.points) && contract.rules.points.length > 0
        ? [...contract.rules.points]
        : [""]
    )

    setClausesNote(contract.clauses?.note || "")
    setLastCustomerCompanyName(contract.customerId?.companyName || "")
    setClausesTitle(contract.clauses?.title || "")
    setClausesPoints(cloneClausePoints(contract.clauses?.points))

    setBillingValue(contract.billing?.value ?? 0)
    setBillingNote(contract.billing?.note || "")
  }, [contract])

  // Fetch products & customers when modal opens
  useEffect(() => {
    if (!contract || !masterAccountId) return
    let active = true

    const loadOptions = async () => {
      setFetchingOptions(true)
      try {
        const [prodRes, custRes] = await Promise.all([
          fetch(`/api/web/products?id=${masterAccountId}&type=all`),
          fetch(`/api/web/customers?id=${masterAccountId}`),
        ])
        const [prodData, custData] = await Promise.all([
          prodRes.json(),
          custRes.json(),
        ])
        if (!active) return
        if (!prodData.error) setProducts(prodData.result || [])
        if (!custData.error) setCustomers(custData.result || [])
      } catch {
        console.error("Failed to fetch customers or products")
      } finally {
        if (active) setFetchingOptions(false)
      }
    }

    loadOptions()
    return () => {
      active = false
    }
  }, [contract, masterAccountId])

  if (!contract) return null

  const sourceCustomerId = contract.customerId?._id || contract.customerId || ""
  const sourceCustomerLabel =
    contract.customerId?.name ||
    contract.customerId?.bussinessName ||
    contract.customerId?.companyName ||
    "-"

  const selectedCustomer = customers.find((c) => c._id === customerId)
  const lockedCompanyName = selectedCustomer?.companyName || ""

  const handleCustomerChange = (nextCustomerId: string) => {
    const nextCustomer = customers.find((c) => c._id === nextCustomerId)
    const nextCompanyName = nextCustomer?.companyName || ""
    setCustomerId(nextCustomerId)
    setClausesNote((prevNote) =>
      syncClausesNoteCustomer(
        prevNote,
        lastCustomerCompanyName,
        nextCompanyName
      )
    )
    setLastCustomerCompanyName(nextCompanyName)
  }

  // Rules helpers
  const addRulesPoint = () => setRulesPoints([...rulesPoints, ""])
  const updateRulesPoint = (i: number, val: string) => {
    const pts = [...rulesPoints]
    pts[i] = val
    setRulesPoints(pts)
  }
  const removeRulesPoint = (i: number) => {
    setRulesPoints(rulesPoints.filter((_, idx) => idx !== i))
  }

  // Clauses helpers
  const addClausePoint = () =>
    setClausesPoints([...clausesPoints, defaultClausePoint()])
  const removeClausePoint = (pi: number) =>
    setClausesPoints(clausesPoints.filter((_, i) => i !== pi))
  const updateClauseLabel = (pi: number, val: string) => {
    const pts = [...clausesPoints]
    pts[pi] = { ...pts[pi], label: val }
    setClausesPoints(pts)
  }

  const addArticle = (pi: number) => {
    const pts = [...clausesPoints]
    pts[pi].articles = [...pts[pi].articles, defaultArticle()]
    setClausesPoints(pts)
  }
  const removeArticle = (pi: number, ai: number) => {
    const pts = [...clausesPoints]
    pts[pi].articles = pts[pi].articles.filter((_, i) => i !== ai)
    setClausesPoints(pts)
  }
  const updateArticleValue = (pi: number, ai: number, val: string) => {
    const pts = [...clausesPoints]
    pts[pi].articles[ai].value = val
    setClausesPoints(pts)
  }

  const addSubArticle = (pi: number, ai: number) => {
    const pts = [...clausesPoints]
    pts[pi].articles[ai].subArticles = [
      ...pts[pi].articles[ai].subArticles,
      "",
    ]
    setClausesPoints(pts)
  }
  const removeSubArticle = (pi: number, ai: number, si: number) => {
    const pts = [...clausesPoints]
    pts[pi].articles[ai].subArticles = pts[pi].articles[
      ai
    ].subArticles.filter((_, i) => i !== si)
    setClausesPoints(pts)
  }
  const updateSubArticle = (
    pi: number,
    ai: number,
    si: number,
    val: string
  ) => {
    const pts = [...clausesPoints]
    pts[pi].articles[ai].subArticles[si] = val
    setClausesPoints(pts)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!customerId) {
      Swal.fire("Error", "Pilih customer tujuan untuk kontrak baru", "error")
      return
    }
    if (!applicantName.trim()) {
      Swal.fire("Error", "Nama pemohon harus diisi", "error")
      return
    }
    if (!productId) {
      Swal.fire("Error", "Pilih produk / layanan", "error")
      return
    }
    if (!from || !to) {
      Swal.fire("Error", "Periode kontrak harus diisi", "error")
      return
    }
    if (new Date(from) >= new Date(to)) {
      Swal.fire(
        "Error",
        "Tanggal akhir harus setelah tanggal mulai",
        "error"
      )
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        masterAccountId,
        applicantName: applicantName.trim(),
        customerId,
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

      const res = await fetch("/api/web/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (!data.error) {
        await Swal.fire(
          "Berhasil!",
          "Kontrak baru berhasil dibuat dari salinan.",
          "success"
        )
        onSuccess()
      } else {
        Swal.fire("Error", data.message, "error")
      }
    } catch {
      Swal.fire("Error", "Something went wrong", "error")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal modal-open z-50">
      <div className="modal-box flex max-h-[90vh] w-11/12 max-w-4xl flex-col p-0">
        {/* Header */}
        <div className="flex items-start justify-between border-b px-6 py-4">
          <div>
            <h3 className="text-xl font-bold">Salin Kontrak</h3>
            <p className="text-sm text-gray-500">
              Sumber:{" "}
              <span className="font-mono font-medium text-gray-700">
                {contract.contractNumber}
              </span>{" "}
              ({sourceCustomerLabel})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-square"
            aria-label="Tutup modal"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {fetchingOptions ? (
            <div className="py-12 text-center">
              <span className="loading loading-spinner loading-lg" />
            </div>
          ) : (
            <form
              id="copy-contract-form"
              onSubmit={handleSubmit}
              className="space-y-8"
            >
              {/* Informasi Dasar */}
              <section className="space-y-4 border-b pb-6">
                <h4 className="text-lg font-semibold">Informasi Dasar</h4>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="form-control w-full md:col-span-2">
                    <label className="label">
                      <span className="label-text">
                        Nama Pemohon <span className="text-error">*</span>
                      </span>
                    </label>
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
                    <label className="label">
                      <span className="label-text">
                        Customer Tujuan <span className="text-error">*</span>
                      </span>
                    </label>
                    <select
                      className="select select-bordered"
                      required
                      value={customerId}
                      onChange={(e) => handleCustomerChange(e.target.value)}
                    >
                      <option value="">-- Pilih Customer Tujuan --</option>
                      {customers.map((c) => {
                        const isSame = c._id === sourceCustomerId
                        const label = [c.name, c.bussinessName]
                          .filter(Boolean)
                          .join(" - ")
                        return (
                          <option key={c._id} value={c._id}>
                            {label || c.companyName}
                            {isSame ? " (Customer Sumber)" : ""}
                          </option>
                        )
                      })}
                    </select>
                  </div>

                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text">
                        Produk / Layanan <span className="text-error">*</span>
                      </span>
                    </label>
                    <select
                      className="select select-bordered"
                      required
                      value={productId}
                      onChange={(e) => setProductId(e.target.value)}
                    >
                      <option value="">-- Pilih Produk --</option>
                      {products.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.productName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text">
                        Tanggal Mulai <span className="text-error">*</span>
                      </span>
                    </label>
                    <input
                      type="date"
                      className="input input-bordered"
                      required
                      value={from}
                      onChange={(e) => setFrom(e.target.value)}
                    />
                  </div>

                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text">
                        Tanggal Berakhir <span className="text-error">*</span>
                      </span>
                    </label>
                    <input
                      type="date"
                      className="input input-bordered"
                      required
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                    />
                  </div>
                </div>
              </section>

              {/* Rules */}
              <section className="space-y-4 border-b pb-6">
                <h4 className="text-lg font-semibold">Rules (Ketentuan)</h4>
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text">
                      Judul Rules <span className="text-error">*</span>
                    </span>
                  </label>
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
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Poin Ketentuan</span>
                    <button
                      type="button"
                      onClick={addRulesPoint}
                      className="btn btn-xs btn-primary"
                    >
                      + Tambah Poin
                    </button>
                  </div>
                  {rulesPoints.map((pt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-6 shrink-0 text-sm text-gray-500">
                        {i + 1}.
                      </span>
                      <input
                        type="text"
                        className="input input-bordered input-sm w-full"
                        placeholder={`Poin ${i + 1}`}
                        value={pt}
                        onChange={(e) => updateRulesPoint(i, e.target.value)}
                      />
                      {rulesPoints.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRulesPoint(i)}
                          className="btn btn-error btn-xs shrink-0 text-white"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {/* Clauses */}
              <section className="space-y-4 pb-2">
                <h4 className="text-lg font-semibold">Clauses (Pasal-Pasal)</h4>
                <ClausesNoteField
                  value={clausesNote}
                  onChange={setClausesNote}
                  lockedCompanyName={lockedCompanyName}
                />
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text">
                      Judul Clauses <span className="text-error">*</span>
                    </span>
                  </label>
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
                    <div
                      key={pi}
                      className="space-y-4 rounded-lg border bg-gray-50 p-4"
                    >
                      <div className="flex items-center gap-2">
                        <span className="shrink-0 text-sm font-semibold">
                          Pasal {pi + 1}
                        </span>
                        <input
                          type="text"
                          className="input input-bordered input-sm w-full"
                          required
                          placeholder="Label pasal (mis: Lingkup Pekerjaan)"
                          value={cp.label}
                          onChange={(e) =>
                            updateClauseLabel(pi, e.target.value)
                          }
                        />
                        {clausesPoints.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeClausePoint(pi)}
                            className="btn btn-error btn-xs shrink-0 text-white"
                          >
                            ✕ Hapus Pasal
                          </button>
                        )}
                      </div>

                      <div className="ml-4 space-y-3">
                        {cp.articles.map((art, ai) => (
                          <div
                            key={ai}
                            className="space-y-2 border-l-2 border-blue-200 pl-3"
                          >
                            <div className="flex items-center gap-2">
                              <span className="shrink-0 text-xs text-gray-500">
                                Ayat {ai + 1}
                              </span>
                              <input
                                type="text"
                                className="input input-bordered input-xs w-full"
                                required
                                placeholder="Isi ayat..."
                                value={art.value}
                                onChange={(e) =>
                                  updateArticleValue(pi, ai, e.target.value)
                                }
                              />
                              {cp.articles.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeArticle(pi, ai)}
                                  className="btn btn-error btn-xs shrink-0 text-white"
                                >
                                  ✕
                                </button>
                              )}
                            </div>

                            <div className="ml-4 space-y-1">
                              {art.subArticles.map((sub, si) => (
                                <div
                                  key={si}
                                  className="flex items-center gap-2"
                                >
                                  <span className="shrink-0 text-xs text-gray-400">
                                    {String.fromCharCode(97 + si)}.
                                  </span>
                                  <input
                                    type="text"
                                    className="input input-bordered input-xs w-full"
                                    placeholder="Sub-ayat..."
                                    value={sub}
                                    onChange={(e) =>
                                      updateSubArticle(
                                        pi,
                                        ai,
                                        si,
                                        e.target.value
                                      )
                                    }
                                  />
                                  {art.subArticles.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        removeSubArticle(pi, ai, si)
                                      }
                                      className="btn btn-ghost btn-xs text-error"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              ))}
                              <button
                                type="button"
                                onClick={() => addSubArticle(pi, ai)}
                                className="btn btn-ghost btn-xs text-blue-500"
                              >
                                + Sub-Ayat
                              </button>
                            </div>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => addArticle(pi)}
                          className="btn btn-outline btn-xs"
                        >
                          + Tambah Ayat
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addClausePoint}
                    className="btn btn-outline btn-primary btn-sm"
                  >
                    + Tambah Pasal
                  </button>
                </div>
              </section>

              {/* Billing */}
              <section className="space-y-4 border-t pt-6">
                <h4 className="text-lg font-semibold">Billing (Tagihan)</h4>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text">
                        Nilai Tagihan (Rp) <span className="text-error">*</span>
                      </span>
                    </label>
                    <input
                      type="number"
                      className="input input-bordered"
                      required
                      min={0}
                      placeholder="0"
                      value={billingValue}
                      onChange={(e) =>
                        setBillingValue(parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text">
                        Catatan Billing (opsional)
                      </span>
                    </label>
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
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t bg-base-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="btn btn-ghost"
          >
            Batal
          </button>
          <button
            type="submit"
            form="copy-contract-form"
            disabled={submitting || fetchingOptions}
            className="btn btn-success text-white"
          >
            {submitting ? (
              <span className="loading loading-spinner" />
            ) : (
              "Simpan Kontrak Baru"
            )}
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  )
}

