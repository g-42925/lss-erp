"use client"
import { useEffect, useState, Suspense } from 'react'
import useAuth from "@/store/auth"
import Link from "next/link";
import { useRouter } from 'next/navigation'
import Swal from "sweetalert2";

export default function CreateQuotation() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CreateQuotationContent />
    </Suspense>
  )
}

function CreateQuotationContent() {
  const router = useRouter()
  const loggedIn = useAuth((state) => state.loggedIn)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const hasHydrated = useAuth((s) => s._hasHydrated)

  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Form State
  const [customCustomer, setCustomCustomer] = useState({ name: '', address: '' })
  const [productId, setProductId] = useState<string>("")
  const [specifications, setSpecifications] = useState([{ label: '', value: '' }])
  const [priceOptions, setPriceOptions] = useState([{ qty: 1, frequency: 'Month', price: 0 }])
  const [programs, setPrograms] = useState<string[]>([''])
  const [note, setNote] = useState<string>("")
  const [introduction, setIntroduction] = useState<string>("")
  const [disclaimers, setDisclaimers] = useState<string[]>([''])

  useEffect(() => {
    if (loggedIn && hasHydrated && masterAccountId) {
      fetchData()
    }
  }, [loggedIn, hasHydrated, masterAccountId])

  const fetchData = async () => {
    try {
      // Fetch products (services)
      const prodRes = await fetch(`/api/web/products?id=${masterAccountId}&type=all`)
      const prodData = await prodRes.json()
      if (!prodData.error) {
        setProducts(prodData.result || [])
      }
    } catch (e) {
      console.error("Error fetching data", e)
    }
  }

  const addSpecification = () => setSpecifications([...specifications, { label: '', value: '' }])
  const updateSpecification = (index: number, field: 'label' | 'value', val: string) => {
    const newSpecs = [...specifications]
    newSpecs[index][field] = val
    setSpecifications(newSpecs)
  }
  const removeSpecification = (index: number) => {
    const newSpecs = [...specifications]
    newSpecs.splice(index, 1)
    setSpecifications(newSpecs)
  }

  const addPriceOption = () => setPriceOptions([...priceOptions, { qty: 1, frequency: 'Month', price: 0 }])
  const updatePriceOption = (index: number, field: 'qty' | 'frequency' | 'price', val: any) => {
    const newOpts = [...priceOptions]
    newOpts[index][field] = val as never
    setPriceOptions(newOpts)
  }
  const removePriceOption = (index: number) => {
    const newOpts = [...priceOptions]
    newOpts.splice(index, 1)
    setPriceOptions(newOpts)
  }

  const addProgram = () => setPrograms([...programs, ''])
  const updateProgram = (index: number, val: string) => {
    const newProg = [...programs]
    newProg[index] = val
    setPrograms(newProg)
  }
  const removeProgram = (index: number) => {
    const newProg = [...programs]
    newProg.splice(index, 1)
    setPrograms(newProg)
  }

  const addDisclaimer = () => setDisclaimers([...disclaimers, ''])
  const updateDisclaimer = (index: number, val: string) => {
    const newDisc = [...disclaimers]
    newDisc[index] = val
    setDisclaimers(newDisc)
  }
  const removeDisclaimer = (index: number) => {
    const newDisc = [...disclaimers]
    newDisc.splice(index, 1)
    setDisclaimers(newDisc)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!productId) {
      Swal.fire('Error', 'Please select a service type', 'error')
      return
    }

    setLoading(true)
    try {
      const payload = {
        masterAccountId,
        customCustomer: customCustomer,
        productId,
        specifications: specifications.filter(s => s.label || s.value),
        priceOptions,
        programs: programs.filter(p => p.trim() !== ''),
        note,
        introduction,
        disclaimers: disclaimers.filter(d => d.trim() !== ''),
      }

      const res = await fetch(`/api/web/quotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (!data.error) {
        Swal.fire('Success', 'Quotation created successfully', 'success').then(() => {
          router.push('/sales/quotation')
        })
      } else {
        Swal.fire('Error', data.message, 'error')
      }
    } catch (e) {
      Swal.fire('Error', 'Something went wrong', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!hasHydrated) return <div className="p-8 text-center"><span className="loading loading-spinner"></span></div>

  return (
    <div className="p-8 max-w-4xl mx-auto pb-32">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Create Quotation</h1>
        <Link href="/sales/quotation" className="btn btn-outline">Back to List</Link>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-lg space-y-6">

        {/* Customer Section */}
        <div className="space-y-4 border-b pb-6">
          <h2 className="text-xl font-semibold">Customer Details</h2>
          <div className="grid grid-cols-1 gap-4">
            <div className="form-control w-full">
              <label className="label"><span className="label-text">Customer Name</span></label>
              <input type="text" className="input input-bordered w-full" required value={customCustomer.name} onChange={e => setCustomCustomer({ ...customCustomer, name: e.target.value })} />
            </div>
          </div>
        </div>

        {/* Service Type */}
        <div className="form-control w-full border-b pb-6">
          <h2 className="text-xl font-semibold mb-2">Service Type</h2>
          <div className="flex flex-row gap-3">
            <label className="label"><span className="label-text">Jenis Layanan</span></label>
            <select className="select select-bordered" required value={productId} onChange={(e) => setProductId(e.target.value)}>
              <option value="">-- Select Service --</option>
              {products.map(p => (
                <option key={p._id} value={p._id}>{p.productName}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Program Kerja */}
        <div className="space-y-4 border-b pb-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Program Kerja</h2>
            <button type="button" onClick={addProgram} className="btn btn-sm btn-primary">Add Program</button>
          </div>
          {programs.map((prog, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input type="text" placeholder={`Program ${i + 1}`} className="input input-bordered w-full" value={prog} onChange={e => updateProgram(i, e.target.value)} />
              <button type="button" onClick={() => removeProgram(i)} className="btn btn-error btn-square btn-sm text-white">X</button>
            </div>
          ))}
        </div>

        {/* Specifications */}
        <div className="space-y-4 border-b pb-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Specifications</h2>
            <button type="button" onClick={addSpecification} className="btn btn-sm btn-primary">Add Spec</button>
          </div>
          {specifications.map((spec, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input type="text" placeholder="Label" className="input input-bordered flex-1" value={spec.label} onChange={e => updateSpecification(i, 'label', e.target.value)} />
              <input type="text" placeholder="Value" className="input input-bordered flex-1" value={spec.value} onChange={e => updateSpecification(i, 'value', e.target.value)} />
              <button type="button" onClick={() => removeSpecification(i)} className="btn btn-error btn-square btn-sm text-white">X</button>
            </div>
          ))}
        </div>

        {/* Price Options */}
        <div className="space-y-4 border-b pb-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Price Options</h2>
            <button type="button" onClick={addPriceOption} className="btn btn-sm btn-primary">Add Price Option</button>
          </div>
          {priceOptions.map((opt, i) => (
            <div key={i} className="flex gap-2 items-center flex-wrap md:flex-nowrap">
              <input type="number" placeholder="Qty" className="input input-bordered w-24" value={opt.qty} onChange={e => updatePriceOption(i, 'qty', parseInt(e.target.value) || 0)} />
              <select className="select select-bordered flex-1" value={opt.frequency} onChange={e => updatePriceOption(i, 'frequency', e.target.value)}>
                <option value="Once">Once</option>
                <option value="Week">Week</option>
                <option value="Month">Month</option>
                <option value="Year">Year</option>
              </select>
              <input type="number" placeholder="Price" className="input input-bordered flex-1" value={opt.price} onChange={e => updatePriceOption(i, 'price', parseFloat(e.target.value) || 0)} />
              <button type="button" onClick={() => removePriceOption(i)} className="btn btn-error btn-square btn-sm text-white">X</button>
            </div>
          ))}
        </div>

        {/* Note */}
        <div className="form-control w-full border-b pb-6">
          <h2 className="text-xl font-semibold mb-2">Note (NB)</h2>
          <textarea className="textarea textarea-bordered h-24" placeholder="Enter note..." value={note} onChange={e => setNote(e.target.value)}></textarea>
        </div>

        {/* Introduction */}
        <div className="form-control w-full border-b pb-6">
          <h2 className="text-xl font-semibold mb-2">Paragraf Pembuka (setelah &quot;Dengan hormat,&quot;)</h2>
          <textarea className="textarea textarea-bordered h-32" placeholder="Isi paragraf pengenalan perusahaan..." value={introduction} onChange={e => setIntroduction(e.target.value)}></textarea>
        </div>

        {/* Disclaimers */}
        <div className="space-y-4 pb-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Disclaimers</h2>
            <button type="button" onClick={addDisclaimer} className="btn btn-sm btn-primary">Add Disclaimer</button>
          </div>
          {disclaimers.map((disc, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input type="text" placeholder={`Disclaimer ${i + 1}`} className="input input-bordered w-full" value={disc} onChange={e => updateDisclaimer(i, e.target.value)} />
              <button type="button" onClick={() => removeDisclaimer(i)} className="btn btn-error btn-square btn-sm text-white">X</button>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <Link href="/sales/quotation" className="btn btn-ghost">Cancel</Link>
          <button type="submit" disabled={loading} className="btn btn-success text-white">
            {loading ? <span className="loading loading-spinner"></span> : 'Save Quotation'}
          </button>
        </div>
      </form>
    </div>
  )
}
