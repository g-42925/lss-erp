/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps */
"use client"

import useAuth from "@/store/auth"
import useFetch from "@/hooks/useFetch";
import { useForm } from "react-hook-form"
import { useRef, useState, useEffect } from "react"
import { useRouter } from 'next/navigation'
import { NumericFormat } from "react-number-format";
import { usePermission } from "@/hooks/usePermission"




type FilterType = 'barang' | 'jasa' | 'vendor'

export default function Debt() {
  const loggedIn = useAuth((state) => state.loggedIn)
  const isSuperAdmin = useAuth((state) => state.isSuperAdmin)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const userId = useAuth((state) => state.userId)
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const { canCreate, canEdit, canDelete } = usePermission()

  const payRef = useRef<HTMLDialogElement>(null)
  const logsRef = useRef<HTMLDialogElement>(null)
  const editLogRef = useRef<HTMLDialogElement>(null)
  const createInvoiceRef = useRef<HTMLDialogElement>(null)
  const listInvoiceRef = useRef<HTMLDialogElement>(null)
  const relatedInvoicesRef = useRef<HTMLDialogElement>(null)
  const selectInvoicesRef = useRef<HTMLDialogElement>(null)

  const [filterType, setFilterType] = useState<FilterType>('barang')
  const [statusFilter, setStatusFilter] = useState<'unpaid' | 'paid'>('unpaid')
  const [monthFilter, setMonthFilter] = useState<string>("")
  const [vendorFilter, setVendorFilter] = useState<string>("")
  const [vendors, setVendors] = useState<any[]>([])
  const [debts, setDebts] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [editingLog, setEditingLog] = useState<any>(null)
  const [editApprovalCode, setEditApprovalCode] = useState("")
  const [editAmount, setEditAmount] = useState<number | string>(0)
  const [editDate, setEditDate] = useState("")
  const [editPaymentMethod, setEditPaymentMethod] = useState("")
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [paySubmitting, setPaySubmitting] = useState(false)
  const [bulkPaySubmitting, setBulkPaySubmitting] = useState(false)
  const [selectedDebt, setSelectedDebt] = useState<any>(null)
  const [selectedLogDebt, setSelectedLogDebt] = useState<any>(null)
  const [payFormData, setPayFormData] = useState({
    payAmount: 0 as number | string,
    paymentMethod: 'Cash',
    bankAccountId: '',
    payDate: new Date().toISOString().split('T')[0],
    description: '',
  })
  const [availableBalance, setAvailableBalance] = useState<number | null>(null)
  const [balanceLoading, setBalanceLoading] = useState(false)

  const [createInvoiceSubmitting, setCreateInvoiceSubmitting] = useState(false)
  const [createInvoiceData, setCreateInvoiceData] = useState({
    id: '',
    invoiceNumber: '',
    vendorId: '',
    nominal: '' as number | string,
    tanggal: new Date().toISOString().split('T')[0],
    keterangan: ''
  })
  const [manualInvoices, setManualInvoices] = useState<any[]>([])
  const [manualInvoicesLoading, setManualInvoicesLoading] = useState(false)
  const [candidateInvoices, setCandidateInvoices] = useState<any[]>([])
  const [selectedCandidateInvoices, setSelectedCandidateInvoices] = useState<string[]>([])
  const [candidateInvoicesLoading, setCandidateInvoicesLoading] = useState(false)
  const [assigningInvoice, setAssigningInvoice] = useState<any>(null)
  const [assigningSubmitting, setAssigningSubmitting] = useState(false)

  const router = useRouter()

  const bankAccountFn = useFetch<any[], any>({
    url: `/api/web/bank-accounts?id=${masterAccountId}`,
    method: 'GET'
  })

  const putFn = useFetch<any, any>({
    url: '/api/web/purchases',
    method: 'PUT'
  })

  const getFn = useFetch<any[], any>({
    url: '',
    method: 'GET'
  })

  const getVendorsFn = useFetch<any[], any>({
    url: '',
    method: 'GET'
  })

  function fetchDebts(type: FilterType = filterType, stat: string = statusFilter, mon: string = monthFilter, ven: string = vendorFilter) {
    let url = `/api/web/debt?id=${masterAccountId}&filterType=${type}&status=${stat}`
    if (mon) url += `&month=${mon}`
    if (ven) url += `&vendorId=${ven}`
    getFn.fn(url, "{}", (result) => {
      setDebts(result ?? [])
    })
  }

  function handleFilterChange(type: FilterType) {
    setFilterType(type)
    setDebts([])
    fetchDebts(type, statusFilter, monthFilter, vendorFilter)
  }

  function handleStatusChange(stat: 'unpaid' | 'paid') {
    setStatusFilter(stat)
    setDebts([])
    fetchDebts(filterType, stat, monthFilter, vendorFilter)
  }

  function handleMonthChange(mon: string) {
    setMonthFilter(mon)
    setDebts([])
    fetchDebts(filterType, statusFilter, mon, vendorFilter)
  }

  function handleVendorChange(ven: string) {
    setVendorFilter(ven)
    setDebts([])
    fetchDebts(filterType, statusFilter, monthFilter, ven)
  }

  // ─── Open Pay Modal ──────────────────────────────────────────────────────────
  function openPay(debt: any) {
    setSelectedDebt(debt)
    setPayFormData({
      payAmount: "",
      paymentMethod: 'Cash',
      bankAccountId: '',
      payDate: new Date().toISOString().split('T')[0],
      description: '',
    })
    setAvailableBalance(null)
    fetchAvailableBalance('Cash', '')
    payRef.current?.showModal()
  }

  // ─── Fetch saldo tersedia dari API ───────────────────────────────────────────
  async function fetchAvailableBalance(method: string, bankAccountId: string) {
    if (!masterAccountId) return
    setBalanceLoading(true)
    try {
      const params = new URLSearchParams({ id: masterAccountId, paymentMethod: method })
      if (bankAccountId) params.set('bankAccountId', bankAccountId)
      const res = await fetch(`/api/web/finance/balance?${params}`)
      const json = await res.json()
      if (!json.error) setAvailableBalance(json.result ?? 0)
      else setAvailableBalance(null)
    } catch {
      setAvailableBalance(null)
    } finally {
      setBalanceLoading(false)
    }
  }

  function openCreateInvoice() {
    setCreateInvoiceData({
      id: '',
      invoiceNumber: '',
      vendorId: '',
      nominal: '',
      tanggal: new Date().toISOString().split('T')[0],
      keterangan: ''
    })
    createInvoiceRef.current?.showModal()
  }

  async function fetchManualInvoices() {
    setManualInvoicesLoading(true)
    try {
      const res = await fetch(`/api/web/debt/invoice?id=${masterAccountId}`)
      const data = await res.json()
      setManualInvoices(data.result || [])
    } catch (e) {
      console.error(e)
    } finally {
      setManualInvoicesLoading(false)
    }
  }

  function openListInvoice() {
    listInvoiceRef.current?.showModal()
    fetchManualInvoices()
  }

  function viewRelatedInvoices(debt: any) {
    setSelectedDebt(debt)
    relatedInvoicesRef.current?.showModal()
  }

  function openEditInvoice(inv: any) {
    setCreateInvoiceData({
      id: inv._id,
      invoiceNumber: inv.invoiceNumber || '',
      vendorId: inv.vendorId,
      nominal: inv.debt,
      tanggal: new Date(inv.date).toISOString().split('T')[0],
      keterangan: inv.description || ''
    })
    createInvoiceRef.current?.showModal()
  }

  async function deleteManualInvoice(id: string) {
    if (!confirm('Yakin ingin menghapus invoice ini?')) return
    try {
      const res = await fetch(`/api/web/debt/invoice?id=${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.error) return alert(json.message)
      fetchManualInvoices()
    } catch (e: any) {
      alert(e.message)
    }
  }

  async function openSelectPurchases(inv: any) {
    setAssigningInvoice(inv)
    setSelectedCandidateInvoices([])
    setCandidateInvoices([])
    selectInvoicesRef.current?.showModal()

    setCandidateInvoicesLoading(true)
    try {
      const res = await fetch(`/api/web/debt/invoice/assign?vendorId=${inv.vendorId}&masterAccountId=${masterAccountId}`)
      const data = await res.json()
      setCandidateInvoices(data.result || [])
    } catch (e) {
      console.error(e)
    } finally {
      setCandidateInvoicesLoading(false)
    }
  }

  function toggleCandidateInvoice(id: string) {
    setSelectedCandidateInvoices(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  async function submitAssignInvoices() {
    if (selectedCandidateInvoices.length === 0) return alert("Pilih minimal 1 invoice")
    if (!assigningInvoice) return

    setAssigningSubmitting(true)
    try {
      const res = await fetch('/api/web/debt/invoice/assign', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceIds: selectedCandidateInvoices,
          vendorInvoiceNumber: assigningInvoice.invoiceNumber
        })
      })
      const json = await res.json()
      if (json.error) return alert(json.message)

      alert("Invoice berhasil diasosiasikan")
      selectInvoicesRef.current?.close()
      fetchManualInvoices()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setAssigningSubmitting(false)
    }
  }

  async function submitCreateInvoice() {
    const { id, invoiceNumber, vendorId, nominal, tanggal, keterangan } = createInvoiceData
    if (!vendorId) return alert("Pilih vendor terlebih dahulu")
    if (!nominal || Number(nominal) <= 0) return alert("Nominal harus lebih dari 0")
    if (!tanggal) return alert("Pilih tanggal")

    setCreateInvoiceSubmitting(true)
    try {
      const isEdit = !!id
      const res = await fetch('/api/web/debt/invoice', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          invoiceNumber,
          vendorId,
          nominal: Number(nominal),
          tanggal,
          keterangan,
          masterAccountId
        })
      })
      const json = await res.json()
      if (json.error) return alert(json.message)

      alert(isEdit ? "Invoice berhasil diupdate!" : "Invoice berhasil dibuat!")
      if (isEdit) fetchManualInvoices()
      createInvoiceRef.current?.close()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setCreateInvoiceSubmitting(false)
    }
  }

  // ─── Pay: barang or jasa (via Purchase) ─────────────────────────────────────
  async function payPurchase() {
    if (!selectedDebt) return
    const { payAmount, paymentMethod, payDate, description } = payFormData
    const newPayAmt = Number(payAmount)
    if (newPayAmt <= 0) return alert("Amount harus lebih dari 0")

    const remaining = selectedDebt.finalPrice - selectedDebt.payAmount
    if (newPayAmt > remaining) return alert("Jumlah bayar melebihi sisa hutang")

    if (availableBalance !== null && newPayAmt > availableBalance) {
      return alert(`Jumlah bayar melebihi saldo tersedia (Rp ${availableBalance.toLocaleString('id-ID')})`)
    }

    const payload = JSON.stringify({
      _id: selectedDebt._id,
      type: "payment",
      newPayAmt,
      payAmount: selectedDebt.payAmount + newPayAmt,
      status: '___approved',
      reference: description || null,
      purchaseType: selectedDebt.purchaseType,
      paymentMethod,
      date: payDate ? new Date(payDate).toISOString() : new Date().toISOString(),
      userId,
      to: selectedDebt.supplier?.bussinessName || selectedDebt.vendor?.name || ''
    })


    setPaySubmitting(true)
    try {
      const res = await fetch('/api/web/purchases', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: payload
      })
      const json = await res.json()
      if (json.error) return alert(json.message)

      fetchDebts()
      payRef.current?.close()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setPaySubmitting(false)
    }
  }

  // ─── Pay: vendor (via Invoice) ────────────────────────────────────────────────
  async function payVendorDebt() {
    if (!selectedDebt) return
    const { payAmount, paymentMethod, bankAccountId, payDate, description } = payFormData
    const newPayAmt = Number(payAmount)
    if (newPayAmt <= 0) return alert("Amount harus lebih dari 0")

    const rem = (selectedDebt.totalVendorAmount ?? selectedDebt.debt ?? 0) - (selectedDebt.vendorPaid ?? 0)
    if (newPayAmt > rem) return alert("Jumlah bayar melebihi sisa hutang vendor")

    if (availableBalance !== null && newPayAmt > availableBalance) {
      return alert(`Jumlah bayar melebihi saldo tersedia (Rp ${availableBalance.toLocaleString('id-ID')})`)
    }

    setPaySubmitting(true)
    try {
      const res = await fetch('/api/web/debt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: selectedDebt._id,
          payAmount: newPayAmt,
          paymentMethod,
          bankAccountId: paymentMethod === 'Cash' ? null : bankAccountId,
          payDate,
          userId,
          masterAccountId,
          description,
        })
      })
      const json = await res.json()
      if (json.error) return alert(json.message)

      // Re-fetch dari server untuk menghindari bug double update di local state
      fetchDebts()
      payRef.current?.close()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setPaySubmitting(false)
    }
  }

  async function markAsPaid(debt: any) {
    if (!confirm('Yakin ingin menandai hutang ini sebagai lunas? (Pembayaran menggunakan Cash)')) return;
    const rem = remaining(debt);
    if (rem <= 0) return alert('Hutang sudah lunas');

    if (filterType === 'vendor') {
      try {
        const res = await fetch('/api/web/debt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            invoiceId: debt._id,
            payAmount: rem,
            paymentMethod: 'Cash',
            bankAccountId: null,
            payDate: new Date().toISOString().split('T')[0],
            userId,
            masterAccountId
          })
        })
        const json = await res.json()
        if (json.error) return alert(json.message)
        fetchDebts()
      } catch (e: any) {
        alert(e.message)
      }
    } else {
      // Implementasi untuk barang/jasa jika diperlukan
      alert('Tandai lunas untuk barang/jasa belum diimplementasikan backend');
    }
  }

  async function handlePay() {
    if (filterType === 'vendor') {
      await payVendorDebt()
    }
    else {
      await payPurchase()
    }
  }

  async function markAllAsPaid() {
    if (!vendorFilter || !monthFilter) return;
    const unpaidDebts = debts.filter(d => remaining(d) > 0);
    if (unpaidDebts.length === 0) return alert("Tidak ada hutang yang belum lunas pada kriteria ini.");

    if (!confirm(`Yakin ingin melunasi ${unpaidDebts.length} tagihan secara bersamaan? (Pembayaran otomatis menggunakan Cash pada tanggal hari ini)`)) return;

    setBulkPaySubmitting(true);
    let successCount = 0;
    try {
      for (const debt of unpaidDebts) {
        const rem = remaining(debt);
        if (filterType === 'vendor') {
          const res = await fetch('/api/web/debt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              invoiceId: debt._id,
              payAmount: rem,
              paymentMethod: 'Cash',
              bankAccountId: null,
              payDate: new Date().toISOString().split('T')[0],
              userId,
              masterAccountId
            })
          });
          const json = await res.json();
          if (!json.error) successCount++;
        } else {
          // For barang and jasa, via /api/web/purchases
          const payload = JSON.stringify({
            _id: debt._id,
            type: "payment",
            newPayAmt: rem,
            payAmount: (debt.payAmount ?? 0) + rem,
            status: '___approved',
            reference: null,
            purchaseType: debt.purchaseType,
            paymentMethod: 'Cash',
            date: new Date().toISOString(),
            userId,
            to: debt.supplier?.bussinessName || debt.vendor?.name || ''
          });
          const res = await fetch('/api/web/purchases', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: payload
          });
          const json = await res.json();
          if (!json.error) successCount++;
        }
      }
      alert(`Berhasil melunasi ${successCount} dari ${unpaidDebts.length} tagihan.`);
      fetchDebts();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBulkPaySubmitting(false);
    }
  }

  async function viewLogs(debt: any) {
    setSelectedLogDebt(debt)
    setLogs([])
    logsRef.current?.showModal()
    setLogsLoading(true)
    try {
      const res = await fetch(`/api/web/log/purchase?purchaseId=${debt._id}`)
      const data = await res.json()
      if (data.noResult || data.error) {
        setLogs([])
      } else {
        setLogs(data.result || [])
      }
    } catch (e) {
      setLogs([])
    } finally {
      setLogsLoading(false)
    }
  }

  function openEditLog(log: any) {
    setEditingLog(log)
    setEditAmount(Math.abs(log.amount))
    setEditDate(log.date ? new Date(log.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0])
    setEditPaymentMethod(log.paymentMethod || "Cash")
    setEditApprovalCode("")
    editLogRef.current?.showModal()
  }

  async function submitEditLog() {
    if (!editingLog) return
    if (!editApprovalCode) return alert("Kode approval wajib diisi")
    if (Number(editAmount) <= 0) return alert("Amount harus lebih dari 0")
    setEditSubmitting(true)
    try {
      // Vendor logs diedit via /api/web/debt PUT, purchase logs via /api/web/log/purchase PUT
      const apiUrl = filterType === 'vendor' ? '/api/web/debt' : '/api/web/log/purchase'
      const res = await fetch(apiUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logId: editingLog._id,
          approvalCode: editApprovalCode,
          userId,
          newAmount: Number(editAmount),
          newDate: editDate,
          newPaymentMethod: editPaymentMethod,
        }),
      })
      const response = await res.json()
      if (response.error) {
        alert(response.message || 'something went wrong')
      } else {
        editLogRef.current?.close()
        // Refresh logs jika modal logs masih terbuka
        if (selectedLogDebt) {
          viewLogs(selectedLogDebt)
        }
        fetchDebts()
      }
    } catch (e: any) {
      alert(e.message)
    } finally {
      setEditSubmitting(false)
    }
  }

  async function deleteLog(log: any) {
    const approvalCode = prompt("Masukkan kode approval supervisor untuk menghapus pembayaran ini:")
    if (!approvalCode) return

    if (!confirm(`Yakin ingin menghapus pembayaran ${log.paymentNumber} sebesar ${Math.abs(log.amount).toLocaleString('id-ID')}?`)) return

    try {
      const apiUrl = filterType === 'vendor'
        ? `/api/web/debt?logId=${log._id}&approvalCode=${encodeURIComponent(approvalCode)}`
        : `/api/web/log/purchase?logId=${log._id}&approvalCode=${encodeURIComponent(approvalCode)}`
      const res = await fetch(apiUrl, { method: 'DELETE' })
      const json = await res.json()
      if (json.error) return alert(json.message || 'Gagal menghapus')

      // Refresh logs & debts
      if (selectedLogDebt) viewLogs(selectedLogDebt)
      fetchDebts()
    } catch (e: any) {
      alert(e.message)
    }
  }

  function recalculateDebt(invoice: any, debt: number) {
    return debt / invoice.qty * (invoice.qty - invoice.missing)
  }

  function calculateTotalVendorAmount(invoices: any) {
    if (!Array.isArray(invoices)) return 0;
    const debts = invoices.map((invoice: any) => {
      return (invoice.debt || 0) / (invoice.qty || 1) * ((invoice.qty || 0) - (invoice.missing || 0))
    })

    return debts.reduce((sum: number, n: number) => sum + n, 0)
  }

  useEffect(() => {
    if (hasHydrated) {
      const bankUrl = `/api/web/bank-accounts?id=${masterAccountId}`
      bankAccountFn.fn(bankUrl, "{}", () => { })
      getVendorsFn.fn(`/api/web/vendor?id=${masterAccountId}`, "{}", setVendors)
      fetchDebts('barang', 'unpaid', '', '')

    }
  }, [masterAccountId, hasHydrated])

  if (!hasHydrated) return null
  if (!loggedIn) router.push('/login')
  if (!isSuperAdmin) router.push('/dashboard')

  const remaining = (debt: any) => {
    // Untuk vendor: gunakan `remaining` yang sudah dihitung API, atau hitung dari totalVendorAmount
    if (filterType === 'vendor') {
      if (debt.remaining !== undefined) return debt.remaining
      return (debt.totalVendorAmount ?? debt.debt ?? 0) - (debt.vendorPaid ?? 0)
    }
    return (debt.finalPrice ?? 0) - (debt.payAmount ?? 0)
  }

  const filterTabs: { key: FilterType; label: string }[] = [
    { key: 'barang', label: '📦 Hutang Barang' },
    { key: 'jasa', label: '🔧 Hutang Jasa' },
    { key: 'vendor', label: '🤝 Hutang Vendor' },
  ]

  return (
    <>
      <div className="h-full p-3 md:p-6 flex flex-col gap-3 text-black">
        <div className="flex justify-between items-center gap-2">
          <span className="page-title">Debts</span>
          <div className="flex gap-2">
            {filterType === 'vendor' && (
              <button className="btn btn-sm btn-outline btn-primary bg-white" onClick={openListInvoice}>
                List Invoice Manual
              </button>
            )}
            {filterType === 'vendor' && canCreate('/finance/debt') && (
              <button className="btn btn-sm btn-primary" onClick={openCreateInvoice}>
                + Buat Invoice Vendor
              </button>
            )}
          </div>
        </div>
        <div className="relative bg-white h-full border-t-4 border-blue-900 flex flex-col p-6 gap-6">

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex flex-row gap-2 flex-wrap">
              {filterTabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => handleFilterChange(tab.key)}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${filterType === tab.key
                    ? 'bg-blue-900 text-white border-blue-900'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-blue-900'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 items-center md:justify-end">
              {
                (filterType === 'vendor' || filterType === 'jasa') && (
                  <select
                    className="select select-sm select-bordered w-auto max-w-[180px]"
                    value={vendorFilter}
                    onChange={(e) => handleVendorChange(e.target.value)}
                  >
                    <option value="">-- Semua Vendor --</option>
                    {vendors?.map((v: any) => (
                      <option key={v._id} value={v._id}>{v.name}</option>
                    ))}
                  </select>
                )
              }
            </div>
          </div>

          {/* Summary and Description */}
          {
            filterType !== 'vendor' && (
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50 p-4 rounded-lg border">
                <p className="text-sm text-gray-500 flex-1">
                  {filterType === 'barang' && 'Hutang yang timbul dari purchase produk/barang yang belum lunas.'}
                  {filterType === 'jasa' && 'Hutang yang timbul dari purchase jasa (renovasi, kelistrikan, dll) yang belum lunas.'}
                </p>
              </div>
            )
          }

          {/* Table */}
          {
            getFn.loading
              ?
              <div className="flex-1 flex flex-col justify-center items-center">
                <span className="loading loading-spinner loading-xl"></span>
              </div>
              :
              getFn.error
                ?
                <div>
                  <p>{getFn.message}</p>
                </div>
                :
                debts.length === 0
                  ?
                  <div className="flex-1 flex flex-col justify-center items-center text-gray-400 gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-12">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    <span className="text-sm">Tidak ada hutang</span>
                  </div>
                  :
                  <div className="overflow-x-auto w-full">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Tanggal</th>
                          {filterType === 'barang' && <th>Produk</th>}
                          {filterType === 'jasa' && <th>Deskripsi</th>}
                          {filterType === 'vendor' && <th>No. Invoice</th>}
                          <th>
                            {filterType === 'barang' ? 'Supplier/Vendor' : 'Vendor'}
                          </th>
                          {filterType === 'vendor' && <th>Tagihan</th>}
                          {filterType === 'vendor' && <th>Total Hutang</th>}
                          {filterType != 'vendor' && <th>Total</th>}
                          <th>Sudah Dibayar</th>
                          <th>Sisa</th>
                          <th>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {debts.map((d, index) => (
                          <tr key={index}>
                            <td>{new Date(d.date).toLocaleDateString('id-ID')}</td>
                            {filterType === 'barang' && <td>{d.product?.productName || d.invItem?.name || d.description || '-'}</td>}
                            {filterType === 'jasa' && <td>{d.description ?? '-'}</td>}
                            {filterType === 'vendor' && <td>{d.invoiceNumber}</td>}
                            <td>
                              {filterType === 'vendor'
                                ? (d.vendor?.name || '-')
                                : (d.supplier?.bussinessName || d.vendor?.name || d.customSupplier || '-')}
                            </td>
                            <td>
                              {(filterType === 'vendor'
                                ? (d.originalDebt ?? d.debt)
                                : d.finalPrice)?.toLocaleString('id-ID')}
                              {d.vendor?.populatedTaxes && d.vendor.populatedTaxes.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {d.vendor.populatedTaxes.map((t: any) => (
                                    <span key={t._id} className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${t.isPPh ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-600 border-green-200'}`} title={t.name}>
                                      {t.name} {t.isPPh ? '-' : '+'}{t.value}%
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                            {filterType === 'vendor' && (
                              <td>
                                <button
                                  className={`underline font-semibold hover:text-blue-800 ${d.debt !== d.totalVendorAmount ? 'text-orange-600' : 'text-blue-600'}`}
                                  onClick={() => viewRelatedInvoices(d)}
                                  title="Lihat Invoice Terkait"
                                >
                                  {d.totalVendorAmount?.toLocaleString('id-ID')}
                                </button>

                              </td>
                            )}
                            <td>
                            {(filterType === 'vendor'
                                ? (d.vendorPaid ?? 0)
                                : d.payAmount)?.toLocaleString('id-ID')}
                            </td>
                            <td className="font-semibold text-red-700">
                              {remaining(d)?.toLocaleString('id-ID')}
                            </td>
                            <td>
                              <div className="flex flex-row gap-1">
                                {remaining(d) > 0 && canCreate('/finance/debt') && (
                                  <button
                                    className="btn btn-xs btn-primary"
                                    onClick={() => openPay(d)}
                                  >
                                    Bayar
                                  </button>
                                )}
                                <button
                                  className="btn btn-xs btn-outline"
                                  onClick={() => viewLogs(d)}
                                  title="Lihat & Edit Riwayat Pembayaran"
                                >
                                  Riwayat
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
          }
        </div>

        {/* ─── Pay Modal ─── */}
        <dialog id="pay_modal" ref={payRef} className="modal text-black">
          <div className="modal-box w-11/12 max-w-3xl">
            <h3 className="font-bold text-lg mb-4 pb-3 border-b">
              {filterType === 'vendor' ? 'Bayar Hutang Vendor' : 'Tambah Pembayaran'}
            </h3>
            <div className="flex flex-col gap-4">
              {selectedDebt && (
                <div className="bg-blue-50/50 border border-blue-200 rounded-lg p-5 mb-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-gray-500 text-xs font-medium uppercase tracking-wider">
                        {filterType === 'vendor' ? 'No. Invoice' : 'Produk / Deskripsi'}
                      </span>
                      <span className="font-semibold text-gray-800 text-base">
                        {filterType === 'barang' ? (selectedDebt.product?.productName || selectedDebt.invItem?.name || selectedDebt.description || '-') : 
                         filterType === 'jasa' ? (selectedDebt.description || '-') : 
                         (selectedDebt.invoiceNumber || '-')}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-gray-500 text-xs font-medium uppercase tracking-wider">Vendor / Supplier</span>
                      <span className="font-semibold text-gray-800 text-base">
                        {filterType === 'vendor' ? (selectedDebt.vendor?.name || '-') : (selectedDebt.supplier?.bussinessName || selectedDebt.vendor?.name || selectedDebt.customSupplier || '-')}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-blue-200 flex flex-col gap-1">
                    <span className="text-gray-500 text-xs font-medium uppercase tracking-wider">Sisa Hutang</span>
                    <span className="text-red-600 font-bold text-2xl">Rp {remaining(selectedDebt)?.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Tanggal Pembayaran</legend>
                <input
                  className="input w-full"
                  type="date"
                  value={payFormData.payDate}
                  onChange={e => setPayFormData(p => ({ ...p, payDate: e.target.value }))}
                  required
                />
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Jumlah Bayar</legend>
                <NumericFormat
                  thousandSeparator="."
                  decimalSeparator=","
                  decimalScale={2}
                  fixedDecimalScale
                  allowNegative={false}
                  value={payFormData.payAmount}
                  onValueChange={(values) => {
                    // if empty string, floatValue is un defined
                    setPayFormData(p => ({ ...p, payAmount: values.floatValue ?? "" }))
                  }}
                  className="input w-full"
                  placeholder="Contoh: 150000"
                />
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Metode Pembayaran</legend>
                <select
                  className="select w-full"
                  value={payFormData.paymentMethod}
                  onChange={e => {
                    const val = e.target.value
                    // Cari bankAccountId yang sesuai
                    const matchedBank = bankAccountFn.result?.find((b: any) => `transfer from ${b.bank}` === val)
                    const newBankAccountId = matchedBank?._id || ''
                    setPayFormData(p => ({
                      ...p,
                      paymentMethod: val,
                      bankAccountId: newBankAccountId,
                    }))
                    fetchAvailableBalance(val, newBankAccountId)
                  }}
                >
                  <option value="Cash">Cash</option>
                  {bankAccountFn.result?.map((bank: any) => (
                    <option key={bank._id} value={`transfer from ${bank.bank}`}>
                      {bank.bank} ({bank.accountName})
                    </option>
                  ))}
                </select>
                {/* Tampilan sisa saldo */}
                <div className="mt-2">
                  {balanceLoading ? (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <span className="loading loading-spinner loading-xs"></span> Memuat saldo...
                    </span>
                  ) : availableBalance !== null ? (
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border ${
                      availableBalance <= 0
                        ? 'bg-red-50 border-red-200 text-red-700'
                        : Number(payFormData.payAmount) > availableBalance
                          ? 'bg-orange-50 border-orange-200 text-orange-700'
                          : 'bg-green-50 border-green-200 text-green-700'
                    }`}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="size-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
                      </svg>
                      <span>Saldo tersedia: <strong>Rp {availableBalance.toLocaleString('id-ID')}</strong></span>
                    </div>
                  ) : null}
                </div>
              </fieldset>

              </div>

              <fieldset className="fieldset mt-2">
                <legend className="fieldset-legend">Keterangan Tambahan</legend>
                <input
                  className="input w-full"
                  type="text"
                  placeholder="Deskripsi atau catatan pembayaran"
                  value={payFormData.description}
                  onChange={e => setPayFormData(p => ({ ...p, description: e.target.value }))}
                />
              </fieldset>

              <div className="modal-action">
                <button type="button" className="btn" onClick={() => payRef.current?.close()}>Batal</button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={paySubmitting || (availableBalance !== null && Number(payFormData.payAmount) > availableBalance)}
                  title={availableBalance !== null && Number(payFormData.payAmount) > availableBalance ? `Saldo tidak mencukupi. Tersedia: Rp ${availableBalance.toLocaleString('id-ID')}` : ''}
                  onClick={handlePay}
                >
                  {paySubmitting ? <span className="loading loading-spinner loading-sm"></span> : 'Simpan Pembayaran'}
                </button>
              </div>
            </div>
          </div>
        </dialog>

        {/* ─── Logs Modal ─── */}
        <dialog id="logs_modal" ref={logsRef} className="modal text-black">
          <div className="modal-box max-w-4xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Payment Logs</h3>
              <button className="btn btn-sm btn-circle" onClick={() => logsRef.current?.close()}>✕</button>
            </div>
            {logsLoading ? (
              <div className="flex flex-col justify-center items-center p-6"><span className="loading loading-spinner"></span></div>
            ) : logs.length === 0 ? (
              <p>Belum ada log pembayaran.</p>
            ) : (
              <div className="overflow-x-auto w-full">
                <table className="table text-sm">
                  <thead>
                    <tr>
                      <th>Tanggal</th>
                      <th>No.</th>
                      <th>Amount</th>
                      <th>Metode</th>
                      <th>Diinput Oleh</th>
                      <th>Diedit Pada</th>
                      <th>Diedit Oleh</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((L, i) => (
                      <tr key={i}>
                        <td>{new Date(L.date).toLocaleDateString('id-ID')}</td>
                        <td>{L.paymentNumber}</td>
                        <td>{Math.abs(L.amount).toLocaleString('id-ID')}</td>
                        <td>{L.paymentMethod || '-'}</td>
                        <td>{L.createdBy?.name || '-'}</td>
                        <td>{L.editedAt ? new Date(L.editedAt).toLocaleString('id-ID') : '-'}</td>
                        <td>{L.editedBy?.name || '-'}</td>
                        <td className="flex flex-row gap-1">
                          <button className="btn btn-xs btn-warning" onClick={() => openEditLog(L)}>Edit</button>
                          <button className="btn btn-xs btn-error" onClick={() => deleteLog(L)}>Hapus</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </dialog>

        {/* ─── Edit Log Modal ─── */}
        <dialog id="edit_log_modal" ref={editLogRef} className="modal text-black">
          <div className="modal-box w-11/12 max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Edit Payment Log</h3>
              <button className="btn btn-sm btn-circle" onClick={() => editLogRef.current?.close()}>✕</button>
            </div>
            {editingLog && (
              <div className="flex flex-col gap-3">
                <div className="bg-yellow-50 border border-yellow-300 rounded-md p-3 text-sm text-yellow-800">
                  ⚠️ Perubahan ini memerlukan kode approval dari supervisor.
                </div>

                <fieldset className="fieldset">
                  <legend className="fieldset-legend">No. Pembayaran</legend>
                  <input className="input w-full bg-gray-100" value={editingLog.paymentNumber} type="text" readOnly />
                </fieldset>

                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Tanggal Pembayaran</legend>
                  <input
                    className="input w-full"
                    type="date"
                    value={editDate}
                    onChange={e => setEditDate(e.target.value)}
                    required
                  />
                </fieldset>

                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Amount</legend>
                  <input
                    className="input w-full"
                    type="number"
                    value={editAmount}
                    onChange={e => setEditAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    required
                  />
                </fieldset>

                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Metode Pembayaran</legend>
                  <select
                    className="select w-full"
                    value={editPaymentMethod}
                    onChange={e => setEditPaymentMethod(e.target.value)}
                  >
                    <option value="Cash">Cash</option>
                    {bankAccountFn.result?.map((bank: any) => (
                      <option key={bank._id} value={`transfer from ${bank.bank}`}>
                        transfer from {bank.bank} ({bank.accountName})
                      </option>
                    ))}
                  </select>
                </fieldset>

                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Kode Approval Supervisor</legend>
                  <input
                    className="input w-full"
                    type="password"
                    placeholder="Masukkan kode approval"
                    value={editApprovalCode}
                    onChange={e => setEditApprovalCode(e.target.value)}
                    required
                  />
                </fieldset>

                <div className="modal-action">
                  <button type="button" className="btn" onClick={() => editLogRef.current?.close()}>Batal</button>
                  <button type="button" className="btn btn-warning" disabled={editSubmitting} onClick={submitEditLog}>
                    {editSubmitting ? <span className="loading loading-spinner loading-sm"></span> : 'Simpan Perubahan'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </dialog>

        {/* ─── Create Invoice Vendor Modal ─── */}
        <dialog id="create_invoice_modal" ref={createInvoiceRef} className="modal text-black">
          <div className="modal-box w-11/12 max-w-2xl">
            <h3 className="font-bold text-lg mb-4">{createInvoiceData.id ? 'Edit' : 'Buat'} Invoice Vendor Manual</h3>
            <div className="flex flex-col gap-3">
              <fieldset className="fieldset">
                <legend className="fieldset-legend">No. Invoice</legend>
                <input
                  className="input w-full"
                  type="text"
                  placeholder="Kosongkan untuk generate otomatis"
                  value={createInvoiceData.invoiceNumber}
                  onChange={e => setCreateInvoiceData(p => ({ ...p, invoiceNumber: e.target.value }))}
                />
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Vendor</legend>
                <select
                  className="select w-full"
                  value={createInvoiceData.vendorId}
                  onChange={e => setCreateInvoiceData(p => ({ ...p, vendorId: e.target.value }))}
                >
                  <option value="">-- Pilih Vendor --</option>
                  {vendors?.map((v: any) => (
                    <option key={v._id} value={v._id}>{v.name}</option>
                  ))}
                </select>
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Tanggal Invoice</legend>
                <input
                  className="input w-full"
                  type="date"
                  value={createInvoiceData.tanggal}
                  onChange={e => setCreateInvoiceData(p => ({ ...p, tanggal: e.target.value }))}
                  required
                />
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Nominal</legend>
                <NumericFormat
                  thousandSeparator="."
                  decimalSeparator=","
                  decimalScale={2}
                  fixedDecimalScale
                  allowNegative={false}
                  value={createInvoiceData.nominal}
                  onValueChange={(values) => {
                    setCreateInvoiceData(p => ({ ...p, nominal: values.floatValue ?? "" }))
                  }}
                  className="input w-full"
                  placeholder="Contoh: 150000"
                />
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Keterangan</legend>
                <input
                  className="input w-full"
                  type="text"
                  placeholder="Masukkan keterangan invoice"
                  value={createInvoiceData.keterangan}
                  onChange={e => setCreateInvoiceData(p => ({ ...p, keterangan: e.target.value }))}
                />
              </fieldset>

              <div className="modal-action">
                <button type="button" className="btn" onClick={() => createInvoiceRef.current?.close()}>Batal</button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={createInvoiceSubmitting}
                  onClick={submitCreateInvoice}
                >
                  {createInvoiceSubmitting ? <span className="loading loading-spinner loading-sm"></span> : (createInvoiceData.id ? 'Simpan Perubahan' : 'Buat Invoice')}
                </button>
              </div>
            </div>
          </div>
        </dialog>

        {/* ─── List Invoice Manual Modal ─── */}
        <dialog id="list_invoice_modal" ref={listInvoiceRef} className="modal text-black">
          <div className="modal-box !w-[75vw] !max-w-[75vw]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Daftar Invoice Vendor Manual</h3>
              <button className="btn btn-sm btn-circle" onClick={() => listInvoiceRef.current?.close()}>✕</button>
            </div>
            {manualInvoicesLoading ? (
              <div className="flex flex-col justify-center items-center p-6"><span className="loading loading-spinner"></span></div>
            ) : manualInvoices.length === 0 ? (
              <p>Belum ada invoice manual.</p>
            ) : (
              <div className="overflow-x-auto w-full">
                <table className="table text-sm">
                  <thead>
                    <tr>
                      <th>Tanggal</th>
                      <th>No. Invoice</th>
                      <th>Vendor</th>
                      <th>Nominal</th>
                      <th>Keterangan</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {manualInvoices.map((inv, i) => (
                      <tr key={i}>
                        <td>{new Date(inv.date).toLocaleDateString('id-ID')}</td>
                        <td>{inv.invoiceNumber}</td>
                        <td>{inv.vendor?.name || '-'}</td>
                        <td>{inv.debt?.toLocaleString('id-ID')}</td>
                        <td>{inv.description || '-'}</td>
                        <td className="flex flex-row gap-1">
                          <button className="btn btn-xs btn-warning" onClick={() => openEditInvoice(inv)}>Edit</button>
                          <button className="btn btn-xs btn-error" onClick={() => deleteManualInvoice(inv._id)}>Hapus</button>
                          <button className="btn btn-xs btn-primary" onClick={() => openSelectPurchases(inv)}>Pilih Invoice Terkait</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </dialog >

        {/* ─── Related Invoices Modal ─── */}
        < dialog id="related_invoices_modal" ref={relatedInvoicesRef} className="modal text-black" >
          <div className="modal-box w-11/12 max-w-4xl">
            <h3 className="font-bold text-lg mb-4">Rincian Hutang Invoice Terkait</h3>
            {selectedDebt && (
              <div className="flex flex-col gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-sm flex justify-between items-center">
                  <div>
                    <div className="text-gray-500 mb-1">Invoice Manual</div>
                    <div className="font-bold text-lg">{selectedDebt.invoiceNumber}</div>
                    <div className="text-gray-600">{selectedDebt.vendor?.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-gray-500 mb-1">Nominal Tagihan</div>
                    <div className="font-bold text-xl text-blue-800">
                      Rp {selectedDebt.debt?.toLocaleString('id-ID')}
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto border rounded-lg">
                  <table className="table table-zebra w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th>Tanggal</th>
                        <th>No. Invoice</th>
                        <th>Keterangan</th>
                        <th className="text-right">Hutang (Debt)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDebt.relatedInvoices?.length > 0 ? (
                        selectedDebt.relatedInvoices.map((inv: any, idx: number) => (
                          <tr key={idx}>
                            <td>{new Date(inv.date).toLocaleDateString('id-ID')}</td>
                            <td className="font-medium">{inv.invoiceNumber}</td>
                            <td>{inv.description || '-'}</td>
                            <td className="text-right font-semibold">
                              {recalculateDebt(inv, inv.debt)?.toLocaleString('id-ID')}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="text-center py-8 text-gray-500">
                            Tidak ada invoice terkait yang ditemukan.
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot className="bg-gray-50 font-bold">
                      <tr>
                        <td colSpan={3} className="text-right py-3">Total Hutang Akumulatif:</td>
                        <td className="text-right text-red-600 text-base py-3">
                          Rp {Number(calculateTotalVendorAmount(selectedDebt.relatedInvoices)).toLocaleString('id-ID')}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {selectedDebt.debt !== calculateTotalVendorAmount(selectedDebt.relatedInvoices) && (
                  <div className="alert alert-warning text-sm shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    <span><strong>Perhatian:</strong> Terdapat selisih antara nominal tagihan dan total hutang akumulatif!</span>
                  </div>
                )}
              </div>
            )}
            <div className="modal-action">
              <button className="btn" onClick={() => relatedInvoicesRef.current?.close()}>Tutup</button>
            </div>
          </div>
        </dialog >

        {/* ─── Select Invoices to Assign Modal ─── */}
        < dialog id="select_invoices_modal" ref={selectInvoicesRef} className="modal text-black" >
          <div className="modal-box !w-[95vw] !max-w-[95vw] h-[90vh] flex flex-col">
            <h3 className="font-bold text-lg mb-2">Pilih Invoice Terkait</h3>
            {assigningInvoice && (
              <p className="mb-4 text-sm text-gray-600">
                Pilih invoice yang akan diasosiasikan dengan invoice manual <b>{assigningInvoice.invoiceNumber}</b>.
              </p>
            )}
            {candidateInvoicesLoading ? (
              <div className="flex flex-col justify-center items-center p-6"><span className="loading loading-spinner"></span></div>
            ) : candidateInvoices.length === 0 ? (
              <p className="py-4 text-gray-500">Tidak ada invoice yang bisa dipilih untuk vendor ini.</p>
            ) : (
              <div className="overflow-x-auto border rounded-lg flex-1 min-h-0">
                <table className="table table-zebra w-full text-xs">
                  <thead className="bg-gray-100 sticky top-0 z-10">
                    <tr>
                      <th className="w-10 text-center">
                        <input
                          type="checkbox"
                          className="checkbox checkbox-sm"
                          checked={selectedCandidateInvoices.length === candidateInvoices.length && candidateInvoices.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCandidateInvoices(candidateInvoices.map((c: any) => c._id))
                            } else {
                              setSelectedCandidateInvoices([])
                            }
                          }}
                        />
                      </th>
                      <th>Tanggal</th>
                      <th>No. Invoice</th>
                      <th>No. Sales Order</th>
                      <th>Customer</th>
                      <th>Produk</th>
                      <th className="text-right">Nilai</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidateInvoices.map((inv: any, idx: number) => (
                      <tr key={idx} className="hover cursor-pointer" onClick={() => toggleCandidateInvoice(inv._id)}>
                        <td className="text-center" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="checkbox checkbox-sm"
                            checked={selectedCandidateInvoices.includes(inv._id)}
                            onChange={() => toggleCandidateInvoice(inv._id)}
                          />
                        </td>
                        <td className="whitespace-nowrap">{new Date(inv.date).toLocaleDateString('id-ID')}</td>
                        <td className="font-medium whitespace-nowrap">{inv.invoiceNumber}</td>
                        <td className="whitespace-nowrap">{inv.serviceOrder?.salesOrderNumber || inv.salesOrderNumber || '-'}</td>
                        <td>
                          <div className="font-medium">
                            {inv.customer?.name || inv.serviceOrder?.customCustomer?.name || '-'}
                          </div>
                          {inv.customer?.bussinessName && (
                            <div className="text-gray-500">{inv.customer.bussinessName}</div>
                          )}
                        </td>
                        <td>{inv.product?.productName || '-'}</td>
                        <td className="text-right font-semibold whitespace-nowrap">
                          {(inv.serviceOrder?.vendorPrice ?? inv.debt ?? 0).toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {selectedCandidateInvoices.length > 0 && (
              <div className="mt-3 text-xs text-gray-500">
                {selectedCandidateInvoices.length} invoice dipilih
              </div>
            )}
            <div className="modal-action">
              <button className="btn" onClick={() => selectInvoicesRef.current?.close()}>Batal</button>
              <button
                className="btn btn-primary"
                disabled={assigningSubmitting || candidateInvoicesLoading || selectedCandidateInvoices.length === 0}
                onClick={submitAssignInvoices}
              >
                {assigningSubmitting
                  ? <span className="loading loading-spinner loading-sm"></span>
                  : ('Simpan Asosiasi' + (selectedCandidateInvoices.length > 0 ? ` (${selectedCandidateInvoices.length})` : ''))}
              </button>
            </div>
          </div>
        </dialog >

      </div >
    </>
  )
}