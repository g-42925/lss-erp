"use client";

import { NumericFormat } from "react-number-format";
import React, { useState, useEffect, useRef, useCallback } from "react";
import useAuth from "@/store/auth";
import useFetch from "@/hooks/useFetch";
import PrintableVoucher from "./PrintableCashVoucher";

type ItemRow = {
  id: string;
  keterangan: string;
  customer: string;
  jumlah: number;
};

type ImportModalState = {
  open: boolean;
  file: File | null;
  dragging: boolean;
  loading: boolean;
  result: { created: number; skipped: string[]; errors: string[]; linked: string[] } | null;
  error: string | null;
};

function terbilang(angka: number): string {
  angka = Math.abs(angka);
  const bilangan = [
    '', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'
  ];

  let result = '';
  if (angka < 12) {
    result = bilangan[angka];
  } else if (angka < 20) {
    result = terbilang(angka - 10) + ' Belas';
  } else if (angka < 100) {
    result = terbilang(Math.floor(angka / 10)) + ' Puluh ' + terbilang(angka % 10);
  } else if (angka < 200) {
    result = 'Seratus ' + terbilang(angka - 100);
  } else if (angka < 1000) {
    result = terbilang(Math.floor(angka / 100)) + ' Ratus ' + terbilang(angka % 100);
  } else if (angka < 2000) {
    result = 'Seribu ' + terbilang(angka - 1000);
  } else if (angka < 1000000) {
    result = terbilang(Math.floor(angka / 1000)) + ' Ribu ' + terbilang(angka % 1000);
  } else if (angka < 1000000000) {
    result = terbilang(Math.floor(angka / 1000000)) + ' Juta ' + terbilang(angka % 1000000);
  } else if (angka < 1000000000000) {
    result = terbilang(Math.floor(angka / 1000000000)) + ' Miliar ' + terbilang(angka % 1000000000);
  }
  return result.trim().replace(/\s+/g, ' ');
}


export default function CashVoucherTab() {
  const today = new Date();

  const masterAccountId = useAuth((state) => state.masterAccountId);
  const hasHydrated = useAuth((s) => s._hasHydrated);

  const [customers, setCustomers] = useState<any[]>([]);
  const [company, setCompany] = useState<any>(null);
  const [mode, setMode] = useState("view");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedVouchers, setSelectedVouchers] = useState<any[]>([]);

  // Sequence modal state
  const [sequenceModal, setSequenceModal] = useState<{ open: boolean; voucher: any | null; newSeq: string }>({
    open: false,
    voucher: null,
    newSeq: "",
  });

  // Drag & drop state for swapping voucher sequences
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // Import Excel modal state
  const [importModal, setImportModal] = useState<ImportModalState>({
    open: false,
    file: null,
    dragging: false,
    loading: false,
    result: null,
    error: null,
  });
  const importFileRef = useRef<HTMLInputElement>(null);

  // Toast state
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isMasuk, setIsMasuk] = useState(false);
  const [isKeluar, setIsKeluar] = useState(true);


  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  };

  const getAllVouchersFn = useFetch<any[], any>({
    url: `/api/web/cash-voucher?id=${masterAccountId}`,
    method: "GET",
  });

  const getCompanyFn = useFetch<any, any>({
    url: '',
    method: "GET",
  });

  const getCustomersFn = useFetch<any[], any>({
    url: '',
    method: "GET",
  });

  const saveFn = useFetch<any, any>({
    url: '/api/web/cash-voucher',
    method: "POST",
    onError: (msg) => showToast("error", msg),
  });

  const updateFn = useFetch<any, any>({
    url: '/api/web/cash-voucher',
    method: "PUT",
    onError: (msg) => showToast("error", msg),
  });

  const patchSequenceFn = useFetch<any, any>({
    url: '/api/web/cash-voucher',
    method: "PATCH",
    onError: (msg) => showToast("error", msg),
  });

  const swapSequenceFn = useFetch<any, any>({
    url: '/api/web/cash-voucher',
    method: "PATCH",
    onError: (msg) => showToast("error", msg),
  });

  const deleteAllFn = useFetch<any, any>({
    url: '/api/web/cash-voucher',
    method: "DELETE",
    onError: (msg) => showToast("error", msg),
  });

  useEffect(() => {
    if (hasHydrated && masterAccountId) {


      getCompanyFn.fn(`/api/web/companies?id=${masterAccountId}`, "{}", (result: any) => {
        if (result && result.length > 0) {
          setCompany(result[0]);
        }
      });
      getCustomersFn.fn(`/api/web/customers?id=${masterAccountId}`, "{}", (result) => {
        setCustomers(result);
      });
      getAllVouchersFn.fn(`/api/web/cash-voucher?id=${masterAccountId}`, "{}", (result) => {
        const nextSeq = String((result?.length || 0) + 1).padStart(3, '0');
        setVoucherNo((prev) => {
          if (!prev) return prev;
          const parts = prev.split('/');
          if (/^\d+$/.test(parts[parts.length - 1])) parts.pop();
          return parts.join('/') + '/' + nextSeq;
        });
      });
    }
  }, [hasHydrated, masterAccountId]);



  const [dibayarDiterima, setDibayarDiterima] = useState("");
  const [tanggal, setTanggal] = useState(new Date().toISOString().split("T")[0]);

  const [rows, setRows] = useState<ItemRow[]>([
    { id: "1", keterangan: "", customer: "", jumlah: 0 },
    { id: "2", keterangan: "", customer: "", jumlah: 0 },
    { id: "3", keterangan: "", customer: "", jumlah: 0 },
  ]);

  const handlePrint = () => {
    window.print();
  };

  const handleRowChange = (index: number, field: keyof ItemRow, value: string | number) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [field]: value };
    setRows(newRows);
  };

  const total = rows.reduce((acc, row) => acc + (Number(row.jumlah) || 0), 0);

  const [terbilangValue, setTerbilangValue] = useState("");
  const [voucherNo, setVoucherNo] = useState(() => {
    const now = new Date();
    const romanMonth = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][now.getMonth()];
    const year = now.getFullYear().toString().slice(-2);
    return `KK-KAS/${romanMonth}/${year}`;
  });
  const [month, setMonth] = useState('');

  useEffect(() => {
    setVoucherNo((prev) => {
      if (!prev) return prev;
      let newPrev = prev;
      if (newPrev.startsWith("KK-") && isMasuk) newPrev = newPrev.replace("KK-", "KM-");
      if (newPrev.startsWith("KM-") && isKeluar) newPrev = newPrev.replace("KM-", "KK-");
      return newPrev;
    });
  }, [isMasuk, isKeluar]);

  useEffect(() => {
    if (total > 0) {
      setTerbilangValue(terbilang(total) + " Rupiah");
    } else {
      setTerbilangValue("");
    }
  }, [total]);

  const handleSave = () => {
    if (!masterAccountId) {
      showToast("error", "masterAccountId tidak ditemukan. Silakan login ulang.");
      return;
    }
    if (!voucherNo.trim()) {
      showToast("error", "Nomor voucher wajib diisi.");
      return;
    }
    if (total <= 0) {
      showToast("error", "Total jumlah harus lebih dari 0.");
      return;
    }

    const payload = {
      masterAccountId,
      voucherNumber: voucherNo,
      voucherType: isMasuk ? "masuk" : "keluar",
      dibayarDiterima,
      date: tanggal || new Date().toISOString(),
      items: rows
        .filter((r) => r.keterangan || r.customer || r.jumlah)
        .map((r) => ({
          keterangan: r.keterangan,
          customer: r.customer,
          jumlah: Number(r.jumlah) || 0,
        })),
      total,
      terbilang: terbilangValue,
      ...(editingId ? { _id: editingId } : {})
    };

    const actionFn = editingId ? updateFn : saveFn;

    actionFn.fn(
      '/api/web/cash-voucher',
      JSON.stringify(payload),
      () => {
        showToast("success", `Voucher ${voucherNo} berhasil ${editingId ? 'diupdate' : 'disimpan'}!`);
        // Refresh list after save
        getAllVouchersFn.fn(`/api/web/cash-voucher?id=${masterAccountId}`, "{}", () => { });
      }
    );
  };

  // ---- Excel Import Handler ----
  const handleImportFile = useCallback((f: File | null) => {
    if (!f) return;
    const ext = f.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls') {
      setImportModal((prev) => ({ ...prev, error: 'Hanya file .xlsx atau .xls yang didukung', file: null }));
      return;
    }
    setImportModal((prev) => ({ ...prev, file: f, error: null, result: null }));
  }, []);

  const handleImportSubmit = async () => {
    if (!importModal.file || !masterAccountId) return;
    setImportModal((prev) => ({ ...prev, loading: true, error: null, result: null }));
    try {
      const fd = new FormData();
      fd.append('file', importModal.file);
      fd.append('masterAccountId', masterAccountId);
      const res = await fetch('/api/web/cash-voucher/import', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.error && !data.result) {
        setImportModal((prev) => ({ ...prev, loading: false, error: data.message }));
      } else {
        setImportModal((prev) => ({ ...prev, loading: false, result: data.result, file: null }));
        showToast('success', data.message);
        getAllVouchersFn.fn(`/api/web/cash-voucher?id=${masterAccountId}`, '{}', () => { });
      }
    } catch (e: any) {
      setImportModal((prev) => ({ ...prev, loading: false, error: e.message || 'Terjadi kesalahan' }));
    }
  };

  const handleImportDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setImportModal((prev) => ({ ...prev, dragging: false }));
    const f = e.dataTransfer.files?.[0] ?? null;
    handleImportFile(f);
  }, [handleImportFile]);

  const handleDeleteAll = () => {
    if (!masterAccountId) return;
    if (!confirm("Apakah Anda yakin ingin menghapus semua voucher? Aksi ini tidak dapat dibatalkan.")) return;
    
    deleteAllFn.fn(
      `/api/web/cash-voucher?id=${masterAccountId}`,
      "{}",
      () => {
        showToast("success", "Semua voucher berhasil dihapus");
        getAllVouchersFn.fn(`/api/web/cash-voucher?id=${masterAccountId}`, "{}", () => { });
        setSelectedVouchers([]);
      }
    );
  };

  const handleNewVoucher = () => {
    setEditingId(null);
    const now = new Date();
    const romanMonth = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][now.getMonth()];
    const year = now.getFullYear().toString().slice(-2);
    setVoucherNo(`KK-KAS/${romanMonth}/${year}`);
    setIsMasuk(false);
    setIsKeluar(true);
    setDibayarDiterima("");
    setTanggal(new Date().toISOString().split("T")[0]);
    setTerbilangValue("");
    setRows([
      { id: "1", keterangan: "", customer: "", jumlah: 0 },
      { id: "2", keterangan: "", customer: "", jumlah: 0 },
      { id: "3", keterangan: "", customer: "", jumlah: 0 },
    ]);

    // Regenerate voucher number sequence
    getAllVouchersFn.fn(`/api/web/cash-voucher?id=${masterAccountId}`, "{}", (result) => {
      const nextSeq = String((result?.length || 0) + 1).padStart(3, '0');
      const now = new Date();
      const romanMonth = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][now.getMonth()];
      const year = now.getFullYear().toString().slice(-2);
      setVoucherNo(`KK-KAS/${romanMonth}/${year}/${nextSeq}`);
    });

    setMode("create");
  };

  const handleSelectVoucher = (voucher: any) => {
    setEditingId(voucher._id);
    setVoucherNo(fixBySequence(voucher.voucherNumber, voucher.sequence));
    setIsMasuk(voucher.voucherType === "masuk");
    setIsKeluar(voucher.voucherType === "keluar");
    setDibayarDiterima(voucher.dibayarDiterima || "");
    setTanggal(voucher.date ? new Date(voucher.date).toISOString().split("T")[0] : "");
    setTerbilangValue(voucher.terbilang || "");

    let newRows = [...(voucher.items || [])];
    while (newRows.length < 3) {
      newRows.push({ id: Math.random().toString(), keterangan: "", customer: "", jumlah: 0 });
    }
    setRows(newRows);

    setMode("create");
  };

  function fixBySequence(voucher: string, sequence: number) {
    const [type, month, year, number] = voucher.split('/');
    return `${type}/${month}/${year}/${String(sequence).padStart(3, "0")}`

  }

  return mode === 'print-multiple' ? (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          body {
            -webkit-print-color-adjust: exact;
          }
        }
      `}} />
      <div className="p-4 md:p-6 min-h-screen print:min-h-0 print:p-0 bg-base-200 print:bg-white">
        <div className="flex justify-between items-center mb-6 print:hidden">
          <div>
            <h1 className="text-2xl font-bold text-base-content">Print Voucher Kas</h1>
            <p className="text-base-content/70">Print {selectedVouchers.length} voucher terpilih</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setMode("listing")}
              className="btn btn-outline"
            >
              Kembali
            </button>
            <button onClick={handlePrint} className="btn btn-primary">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Semua
            </button>
          </div>
        </div>
        <div className="flex flex-col items-center print:block print:w-full print:m-0 print:p-0">
          <style dangerouslySetInnerHTML={{
            __html: `
            @media print {
              @page {
                size: A4 portrait;
                margin: 0;
              }
              body {
                margin: 0;
                padding: 0;
                background-color: white;
              }
              .voucher-print-wrapper {
                width: 100%;
                margin: 0;
                padding: 0;
              }
              /* Setiap pasangan 2 voucher dalam satu halaman A4 */
              .voucher-pair {
                box-sizing: border-box;
                width: 100%;
                height: 297mm;
                display: flex;
                flex-direction: column;
                page-break-after: always;
                break-after: page;
                overflow: hidden;
              }
              .voucher-pair:last-child {
                page-break-after: auto;
                break-after: auto;
              }
              /* Setiap voucher mengisi setengah halaman */
              .voucher-print-page {
                box-sizing: border-box;
                width: 100% !important;
                height: 148mm !important;
                max-width: none !important;
                margin: 0 !important;
                padding: 6mm 10mm !important;
                box-shadow: none !important;
                border: none !important;
                flex: 0 0 148mm;
                overflow: hidden;
              }
              /* Garis pemisah di antara 2 voucher dalam satu halaman */
              .voucher-divider {
                width: 100%;
                height: 1mm;
                border-top: 1px dashed #999;
                flex: 0 0 1mm;
              }
            }
          `}} />
          <div className="voucher-print-wrapper">
            {(() => {
              const pairs: any[][] = [];
              for (let i = 0; i < selectedVouchers.length; i += 2) {
                pairs.push(selectedVouchers.slice(i, i + 2));
              }
              return pairs.map((pair, pairIdx) => (
                <div
                  key={pairIdx}
                  className="voucher-pair mb-8 print:mb-0"
                  style={{ display: 'flex', flexDirection: 'column' }}
                >
                  <PrintableVoucher
                    key={pair[0]._id || pair[0].voucherNumber}
                    voucher={pair[0]}
                    company={company}
                  />
                  {pair[1] && (
                    <>
                      <div className="voucher-divider border-t border-dashed border-gray-400 my-4 print:my-0" />
                      <PrintableVoucher
                        key={pair[1]._id || pair[1].voucherNumber}
                        voucher={pair[1]}
                        company={company}
                      />
                    </>
                  )}
                </div>
              ));
            })()}
          </div>
        </div>
      </div>
    </>
  ) : mode === 'create' ? (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          body {
            -webkit-print-color-adjust: exact;
          }
        }
      `}} />

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 alert ${toast.type === "success" ? "alert-success" : "alert-error"
          } shadow-lg max-w-sm animate-in fade-in slide-in-from-top-2 print:hidden`}>
          <span>{toast.message}</span>
        </div>
      )}

      <div className="pb-6 print:p-0">
        <div className="flex justify-between items-center mb-6 print:hidden bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 leading-tight">{editingId ? "Edit" : "Buat"} Cash Voucher</h2>
              <p className="text-slate-500 text-xs">Isi form di bawah untuk mencetak voucher</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setMode("listing")}
              className="btn btn-outline"
            >
              Lihat Daftar
            </button>
            <button
              onClick={handleSave}
              disabled={saveFn.loading}
              className="btn btn-success"
            >
              {saveFn.loading ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
              )}
              Simpan Voucher
            </button>
            <button onClick={handlePrint} className="btn btn-primary">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Voucher
            </button>
          </div>
        </div>

        <div className="flex justify-center print:block print:w-full print:m-0 print:p-0">
          <div className="bg-white text-black w-full max-w-5xl p-4 md:p-8 shadow-xl print:shadow-none print:w-full print:max-w-none print:p-0 border border-gray-300 print:border-none">
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-4">
              <div>
                <h2 className="text-2xl font-bold tracking-wider mb-4">BUKTI VOUCHER CASH</h2>
                <div className="flex space-x-6 text-sm font-semibold">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isKeluar}
                      onChange={() => {
                        setIsKeluar(true);
                        setIsMasuk(false);
                      }}
                      className="checkbox checkbox-sm rounded-none border-2 border-black print:w-5 print:h-5 print:border-black"
                    />
                    <span>KAS KELUAR</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isMasuk}
                      onChange={() => {
                        setIsMasuk(true);
                        setIsKeluar(false);
                      }}
                      className="checkbox checkbox-sm rounded-none border-2 border-black print:w-5 print:h-5 print:border-black"
                    />
                    <span>KAS MASUK</span>
                  </label>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center justify-end space-x-2 mb-2">
                  {company && company.logo ? (
                    <img src={company.logo} alt="Logo" className="w-10 h-10 object-contain" />
                  ) : (
                    <div className="w-10 h-10 bg-blue-500 text-white font-bold flex items-center justify-center rounded-sm">
                      LR
                    </div>
                  )}
                  <h3 className="font-bold text-lg">{company?.name || "PT. LERYN JAYA MAS"}</h3>
                </div>
              </div>
            </div>

            {/* Details Section */}
            <div className="grid grid-cols-2 gap-4 md:gap-8 mb-4 text-sm font-medium">
              <div className="space-y-3">
                <div className="grid grid-cols-[130px_10px_1fr] items-center">
                  {isMasuk ? <span>Dibayar Oleh</span> : <span>Diterima Oleh</span>}
                  <span>:</span>
                  <input
                    type="text"
                    value={dibayarDiterima}
                    onChange={(e) => setDibayarDiterima(e.target.value)}
                    placeholder="Nama penerima / pembayar..."
                    className="input input-sm border-b border-dashed border-gray-400 bg-transparent rounded-none focus:outline-none focus:border-black px-1 print:border-none print:p-0 w-full text-black font-medium"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-[80px_10px_1fr] items-center">
                  <span>No.</span>
                  <span>:</span>
                  <input
                    type="text"
                    value={voucherNo}
                    onChange={(e) => setVoucherNo(e.target.value)}
                    placeholder="KK-KAS/V/26"
                    className="input input-sm border-b border-dashed border-gray-400 bg-transparent rounded-none focus:outline-none focus:border-black px-1 print:border-none print:p-0 w-full text-black"
                  />
                </div>
                <div className="grid grid-cols-[80px_10px_1fr] items-center">
                  <span>Tgl.</span>
                  <span>:</span>
                  <input
                    type="date"
                    value={tanggal}
                    onChange={(e) => setTanggal(e.target.value)}
                    className="input input-sm border-b border-dashed border-gray-400 bg-transparent rounded-none focus:outline-none focus:border-black px-1 print:border-none print:p-0 w-full text-black"
                  />
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="border-2 border-black mb-4">
              <table className="w-full text-sm">
                <thead className="border-b-2 border-black text-center font-bold">
                  <tr>
                    <th className="border-r-2 border-black py-2 w-[5%]">No.</th>
                    <th className="border-r-2 border-black py-2 w-[40%]">Keterangan</th>
                    <th className="border-r-2 border-black py-2 w-[30%]">Nama Customer</th>
                    <th className="py-2 w-[25%]">Jumlah</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={row.id} className="border-b border-black last:border-b-0">
                      <td className="border-r-2 border-black text-center align-top p-1 font-semibold">
                        {index + 1}
                      </td>
                      <td className="border-r-2 border-black p-0">
                        <textarea
                          value={row.keterangan}
                          onChange={(e) => handleRowChange(index, "keterangan", e.target.value)}
                          className="w-full h-full min-h-[48px] resize-none bg-transparent focus:outline-none px-2 py-1 text-black font-medium"
                          placeholder="Keterangan..."
                        />
                      </td>
                      <td className="border-r-2 border-black p-0 align-top">
                        <input
                          type="text"
                          list={`customers-list-${index}`}
                          value={row.customer}
                          onChange={(e) => handleRowChange(index, "customer", e.target.value)}
                          className="w-full h-full min-h-[48px] bg-transparent focus:outline-none px-2 py-1 text-center text-black font-medium"
                          placeholder="Customer"
                        />
                        <datalist id={`customers-list-${index}`}>
                          {customers.map((c: any) => (
                            <option key={c._id} value={c.bussinessName || c.name} />
                          ))}
                        </datalist>
                      </td>
                      <td className="p-1 align-top">
                        <div className="flex items-center h-full px-2">
                          <span className="mr-1 font-semibold">Rp.</span>
                          <NumericFormat
                            thousandSeparator="."
                            decimalSeparator=","
                            decimalScale={2}
                            fixedDecimalScale
                            allowNegative={false}
                            value={row.jumlah}
                            onValueChange={(values) => handleRowChange(index, "jumlah", values.floatValue?.toString() ?? "")}
                            className="w-full bg-transparent focus:outline-none text-right text-black font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            placeholder="Contoh: 150000"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                  {/* Footer Terbilang */}
                  <tr className="border-t-2 border-black font-semibold h-12">
                    <td colSpan={3} className="border-r-2 border-black px-4">
                      <div className="flex items-center space-x-4">
                        <span>TERBILANG</span>
                        <input
                          type="text"
                          value={terbilangValue}
                          onChange={(e) => setTerbilangValue(e.target.value)}
                          placeholder="Dua Juta Empat Ratus Tujuh Puluh Lima Ribu Rupiah"
                          className="flex-1 bg-transparent border-b border-dashed border-gray-400 focus:outline-none focus:border-black px-2 print:border-none print:p-0 italic text-black font-medium"
                        />
                      </div>
                    </td>
                    <td className="px-3 text-right whitespace-nowrap font-bold">
                      Rp. {total.toLocaleString('id-ID')},-
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-4 border-2 border-black text-sm h-32">
              {["DIBUKUKAN OLEH,", "DISETUJUI OLEH,", "DICEK OLEH,", "DIBUAT OLEH,"].map((title, i) => (
                <div key={title} className={`flex flex-col justify-between p-2 ${i !== 3 ? 'border-r-2 border-black' : ''}`}>
                  <div className="text-center font-bold mb-4">{title}</div>
                  <div className="mt-auto space-y-1 font-semibold">
                    <div className="flex items-center">
                      <span className="w-12">Nama</span>
                      <span>:</span>
                      <input type="text" className="flex-1 border-b border-black ml-1 bg-transparent focus:outline-none print:border-b text-black h-5" />
                    </div>
                    <div className="flex items-center">
                      <span className="w-12">Tgl.</span>
                      <span>:</span>
                      <input type="text" className="flex-1 border-b border-black ml-1 bg-transparent focus:outline-none print:border-b text-black h-5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </>
  )
    :
    <>
      {/* ===== Import Excel Modal ===== */}
      {importModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-auto overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-teal-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Import dari Excel</h3>
                  <p className="text-xs text-slate-500">Upload file .xlsx untuk membuat voucher kas secara massal</p>
                </div>
              </div>
              <button
                onClick={() => setImportModal({ open: false, file: null, dragging: false, loading: false, result: null, error: null })}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Format Info */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
                <p className="font-semibold mb-1">📋 Format Kolom Excel yang Diharapkan:</p>
                <div className="overflow-x-auto">
                  <table className="text-[11px] border-collapse w-full">
                    <thead>
                      <tr className="bg-blue-100">
                        <th className="border border-blue-200 px-2 py-1">No</th>
                        <th className="border border-blue-200 px-2 py-1">Tanggal</th>
                        <th className="border border-blue-200 px-2 py-1" colSpan={2}>No. Voucher</th>
                        <th className="border border-blue-200 px-2 py-1">Customer</th>
                        <th className="border border-blue-200 px-2 py-1">Deskripsi</th>
                        <th className="border border-blue-200 px-2 py-1">Debit</th>
                        <th className="border border-blue-200 px-2 py-1">Kredit</th>
                      </tr>
                      <tr className="bg-blue-50">
                        <th className="border border-blue-200 px-2 py-1"></th>
                        <th className="border border-blue-200 px-2 py-1"></th>
                        <th className="border border-blue-200 px-2 py-1">Kas Masuk</th>
                        <th className="border border-blue-200 px-2 py-1">Kas Keluar</th>
                        <th className="border border-blue-200 px-2 py-1"></th>
                        <th className="border border-blue-200 px-2 py-1"></th>
                        <th className="border border-blue-200 px-2 py-1"></th>
                        <th className="border border-blue-200 px-2 py-1"></th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-blue-200 px-2 py-1 text-center">1</td>
                        <td className="border border-blue-200 px-2 py-1">2026-09-01</td>
                        <td className="border border-blue-200 px-2 py-1">KM-KAS/IX/26/001</td>
                        <td className="border border-blue-200 px-2 py-1"></td>
                        <td className="border border-blue-200 px-2 py-1">Toko ABC</td>
                        <td className="border border-blue-200 px-2 py-1">Pembayaran...</td>
                        <td className="border border-blue-200 px-2 py-1">5000000</td>
                        <td className="border border-blue-200 px-2 py-1">0</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="mt-1 text-[10px] text-blue-600">• Kolom <strong>No</strong> hanya sebagai nomor urut tampilan — tidak disimpan ke database.<br />• Isi kolom <strong>Kas Masuk</strong> atau <strong>Kas Keluar</strong> (bukan keduanya) untuk menentukan tipe &amp; nomor voucher.<br />• Baris tanpa No. Voucher akan dikelompokkan ke voucher terakhir sebagai item tambahan.</p>
              </div>

              {/* Drop Zone */}
              {!importModal.result && (
                <div
                  onDragOver={(e) => { e.preventDefault(); setImportModal(p => ({ ...p, dragging: true })); }}
                  onDragLeave={() => setImportModal(p => ({ ...p, dragging: false }))}
                  onDrop={handleImportDrop}
                  onClick={() => importFileRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${importModal.dragging
                    ? 'border-emerald-400 bg-emerald-50 scale-[1.01]'
                    : importModal.file
                      ? 'border-emerald-400 bg-emerald-50'
                      : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
                    }`}
                >
                  <input
                    ref={importFileRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(e) => handleImportFile(e.target.files?.[0] ?? null)}
                  />
                  {importModal.file ? (
                    <div className="flex items-center justify-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-emerald-500">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-emerald-700">{importModal.file.name}</p>
                        <p className="text-xs text-emerald-500">{(importModal.file.size / 1024).toFixed(1)} KB · Klik untuk ganti</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 mx-auto text-slate-400 mb-2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                      <p className="text-sm font-medium text-slate-600">Drag & drop file Excel di sini</p>
                      <p className="text-xs text-slate-400 mt-1">atau klik untuk memilih file (.xlsx, .xls)</p>
                    </>
                  )}
                </div>
              )}

              {/* Error */}
              {importModal.error && (
                <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-700">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 flex-shrink-0 mt-0.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                  <span>{importModal.error}</span>
                </div>
              )}

              {/* Result */}
              {importModal.result && (
                <div className="space-y-3">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-emerald-600">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm font-semibold text-emerald-700">Import Selesai</p>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="bg-white rounded-lg p-2 border border-emerald-100">
                        <p className="text-xl font-bold text-emerald-600">{importModal.result.created}</p>
                        <p className="text-[10px] text-slate-500 uppercase font-medium">Dibuat</p>
                      </div>
                      <div className="bg-white rounded-lg p-2 border border-blue-100">
                        <p className="text-xl font-bold text-blue-500">{importModal.result.linked?.length ?? 0}</p>
                        <p className="text-[10px] text-slate-500 uppercase font-medium">Invoice</p>
                      </div>
                      <div className="bg-white rounded-lg p-2 border border-amber-100">
                        <p className="text-xl font-bold text-amber-500">{importModal.result.skipped.length}</p>
                        <p className="text-[10px] text-slate-500 uppercase font-medium">Dilewati</p>
                      </div>
                      <div className="bg-white rounded-lg p-2 border border-rose-100">
                        <p className="text-xl font-bold text-rose-500">{importModal.result.errors.length}</p>
                        <p className="text-[10px] text-slate-500 uppercase font-medium">Gagal</p>
                      </div>
                    </div>
                    {importModal.result.linked?.length > 0 && (
                      <div className="mt-2 text-xs text-blue-600">
                        <span className="font-semibold">Invoice terhubung:</span> {importModal.result.linked.join(', ')}
                      </div>
                    )}
                    {importModal.result.skipped.length > 0 && (
                      <div className="mt-2 text-xs text-amber-600">
                        <span className="font-semibold">Dilewati (duplikat):</span> {importModal.result.skipped.join(', ')}
                      </div>
                    )}
                    {importModal.result.errors.length > 0 && (
                      <div className="mt-2 text-xs text-rose-600">
                        <span className="font-semibold">Gagal:</span> {importModal.result.errors.join('; ')}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setImportModal({ open: false, file: null, dragging: false, loading: false, result: null, error: null })}
                    className="btn btn-success w-full"
                  >
                    Selesai
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              {!importModal.result && (
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setImportModal({ open: false, file: null, dragging: false, loading: false, result: null, error: null })}
                    className="btn btn-sm btn-ghost"
                    disabled={importModal.loading}
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleImportSubmit}
                    disabled={!importModal.file || importModal.loading}
                    className="btn btn-sm btn-success"
                  >
                    {importModal.loading ? (
                      <><span className="loading loading-spinner loading-xs" /> Mengimpor...</>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                        </svg>
                        Import Sekarang
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Sequence Modal */}
      {sequenceModal.open && sequenceModal.voucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-600">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Edit Sequence</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Voucher: <span className="font-mono font-semibold text-slate-700">{fixBySequence(sequenceModal.voucher.voucherNumber, sequenceModal.voucher.sequence)}</span>
                </p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-xs text-amber-700">
              <span className="font-semibold">ℹ️ Catatan:</span> Semua voucher dengan sequence ≤ nilai baru akan otomatis bertambah 1.
            </div>

            <div className="mb-1">
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Sequence saat ini</label>
              <div className="text-sm font-bold text-slate-800 bg-slate-100 rounded-lg px-3 py-2">
                {sequenceModal.voucher.sequence ?? '-'}
              </div>
            </div>

            <div className="mt-3 mb-5">
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Sequence baru</label>
              <input
                type="number"
                min={1}
                value={sequenceModal.newSeq}
                onChange={(e) => setSequenceModal(prev => ({ ...prev, newSeq: e.target.value }))}
                className="input input-bordered w-full text-sm"
                placeholder="Masukkan sequence baru (misal: 1)"
                autoFocus
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => setSequenceModal({ open: false, voucher: null, newSeq: "" })}
                disabled={patchSequenceFn.loading}
              >
                Batal
              </button>
              <button
                className="btn btn-sm btn-primary"
                disabled={patchSequenceFn.loading || !sequenceModal.newSeq || Number(sequenceModal.newSeq) < 1}
                onClick={() => {
                  const payload = {
                    masterAccountId,
                    _id: sequenceModal.voucher._id,
                    newSequence: Number(sequenceModal.newSeq),
                  };
                  patchSequenceFn.fn(
                    '/api/web/cash-voucher',
                    JSON.stringify(payload),
                    () => {
                      showToast("success", `Sequence voucher berhasil diubah ke ${sequenceModal.newSeq}`);
                      setSequenceModal({ open: false, voucher: null, newSeq: "" });
                      getAllVouchersFn.fn(`/api/web/cash-voucher?id=${masterAccountId}`, "{}", () => { });
                    }
                  );
                }}
              >
                {patchSequenceFn.loading ? <span className="loading loading-spinner loading-xs" /> : null}
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="pb-6 print:p-0">
        <div className="flex justify-between items-center mb-6 print:hidden bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 leading-tight">Daftar Cash Voucher</h2>
              <p className="text-slate-500 text-xs">Arsip semua voucher kas yang tersimpan</p>
            </div>
          </div>
          <div className="flex gap-2">
            {selectedVouchers.length > 0 && (
              <button
                onClick={() => setMode("print-multiple")}
                className="btn btn-secondary"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print {selectedVouchers.length} Terpilih
              </button>
            )}
            <button
              onClick={handleDeleteAll}
              disabled={deleteAllFn.loading}
              className="btn btn-outline btn-error"
              title="Hapus Semua Voucher"
            >
              {deleteAllFn.loading ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5 mr-1">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              )}
              Hapus Semua
            </button>
            <button
              onClick={() => setImportModal({ open: true, file: null, dragging: false, loading: false, result: null, error: null })}
              className="btn btn-outline btn-success"
              title="Import voucher dari file Excel"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5 mr-1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              Import Excel
            </button>
            <button
              onClick={handleNewVoucher}
              className="btn btn-primary"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Buat Voucher Baru
            </button>
          </div>
        </div>

        {/* ── Hint Banner Drag & Drop ── */}
        {(getAllVouchersFn.result?.length ?? 0) > 1 && (
          <div className="mx-4 mb-2 flex items-center gap-2 text-xs text-violet-600 bg-violet-50 border border-violet-200 rounded-lg px-3 py-2 select-none">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 4v8m0 0l4-4m-4 4l-4-4" />
            </svg>
            <span>Seret (drag) kartu voucher ke kartu lain untuk <strong>menukar nomor voucher</strong> di antara keduanya.</span>
          </div>
        )}

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {getAllVouchersFn.result?.map((voucher) => {
                const isMasuk = voucher.voucherType === 'masuk';
                const isSaved = voucher.status === 'saved';
                const isDragging = draggedId === voucher._id;
                const isDropTarget = dragOverId === voucher._id && draggedId !== voucher._id;

                return (
                  <div
                    key={voucher._id || voucher.voucherNumber}
                    draggable
                    onDragStart={(e) => {
                      setDraggedId(voucher._id);
                      // Set drag image opacity via ghost
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragOver={(e) => {
                      e.preventDefault(); // Necessary to allow dropping
                      e.dataTransfer.dropEffect = 'move';
                      if (draggedId && draggedId !== voucher._id) {
                        setDragOverId(voucher._id);
                      }
                    }}
                    onDragLeave={(e) => {
                      // Only clear if we actually leave the card (not its children)
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                        setDragOverId(null);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (!draggedId || draggedId === voucher._id) return;
                      swapSequenceFn.fn(
                        '/api/web/cash-voucher',
                        JSON.stringify({
                          action: 'swap',
                          masterAccountId,
                          voucherId1: draggedId,
                          voucherId2: voucher._id,
                        }),
                        () => {
                          showToast('success', 'Nomor voucher berhasil ditukar!');
                          getAllVouchersFn.fn(`/api/web/cash-voucher?id=${masterAccountId}`, '{}', () => { });
                        }
                      );
                      setDraggedId(null);
                      setDragOverId(null);
                    }}
                    onDragEnd={() => {
                      setDraggedId(null);
                      setDragOverId(null);
                    }}
                    className={[
                      'relative bg-white rounded-xl border shadow-sm flex flex-col justify-between overflow-hidden',
                      'transition-all duration-200',
                      isDragging
                        ? 'opacity-40 scale-95 shadow-none cursor-grabbing'
                        : 'cursor-grab hover:shadow-md',
                      isDropTarget
                        ? 'border-violet-500 ring-2 ring-violet-200 ring-offset-2'
                        : 'border-slate-200'
                    ].join(' ')}
                  >
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="checkbox checkbox-sm rounded"
                          checked={selectedVouchers.some(v => v._id === voucher._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedVouchers([...selectedVouchers, voucher]);
                            } else {
                              setSelectedVouchers(selectedVouchers.filter(v => v._id !== voucher._id));
                            }
                          }}
                          onMouseDown={(e) => e.stopPropagation()} // Prevent checkbox click from triggering drag
                        />
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full uppercase tracking-wider ${isMasuk
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-100 text-rose-700 border border-rose-200'
                          }`}>
                          Voucher {voucher.voucherType}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${isSaved ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                        <span className="text-xs font-medium text-slate-600 capitalize">
                          {voucher.status}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 space-y-3 flex-1">
                      <div>
                        <p className="text-xs text-slate-400 font-mono">{fixBySequence(voucher.voucherNumber, voucher.sequence)}</p>
                        <h3 className="text-base font-bold text-slate-800 truncate">
                          {voucher.dibayarDiterima || 'Tanpa Nama'}
                        </h3>
                      </div>

                      <div className="text-xs text-slate-500 space-y-1">
                        <p>
                          <span className="font-medium text-slate-600">Tanggal:</span>{' '}
                          {new Date(voucher.date).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </p>
                        <p>
                          <span className="font-medium text-slate-600">Total Item:</span> {voucher.items?.length || 0} item
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                      <div className="max-w-[50%]">
                        <p className="text-[10px] uppercase font-bold text-slate-400">Total</p>
                        <p className="text-xs text-slate-500 truncate italic" title={voucher.terbilang}>
                          {voucher.terbilang || '-'}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className={`text-base font-bold font-mono ${isMasuk ? 'text-emerald-600' : 'text-slate-900'}`}>
                          {isMasuk ? '+' : '-'} Rp {voucher.total?.toLocaleString('id-ID')}
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-white border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => setSequenceModal({ open: true, voucher, newSeq: String(voucher.sequence ?? "") })}
                        className="btn btn-sm btn-outline btn-secondary"
                        title={`Sequence: ${voucher.sequence ?? '-'}`}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                        </svg>
                        #{voucher.sequence ?? '-'}
                      </button>
                      <button
                        onClick={() => handleSelectVoucher(voucher)}
                        className="btn btn-sm btn-outline btn-primary"
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Edit & Print
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
}
