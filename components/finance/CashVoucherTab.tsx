"use client";

import { NumericFormat } from "react-number-format";
import React, { useState, useEffect, useRef } from "react";
import useAuth from "@/store/auth";
import useFetch from "@/hooks/useFetch";
import PrintableVoucher from "./PrintableCashVoucher";

type ItemRow = {
  id: string;
  keterangan: string;
  customer: string;
  jumlah: number;
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
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {getAllVouchersFn.result?.map((voucher) => {
                const isMasuk = voucher.voucherType === 'masuk';
                const isSaved = voucher.status === 'saved';

                return (
                  <div
                    key={voucher._id || voucher.voucherNumber}
                    className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col justify-between overflow-hidden"
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
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                        </svg>
                        #{voucher.sequence ?? '-'}
                      </button>
                      <button
                        onClick={() => handleSelectVoucher(voucher)}
                        className="btn btn-sm btn-outline btn-primary"
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
