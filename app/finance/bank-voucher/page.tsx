"use client";

import React, { useState, useEffect } from "react";
import useAuth from "@/store/auth";
import useFetch from "@/hooks/useFetch";

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

export default function BankVoucherPage() {
  const today = new Date();
  const formattedToday = today.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const masterAccountId = useAuth((state) => state.masterAccountId);
  const hasHydrated = useAuth((s) => s._hasHydrated);

  const [accounts, setAccounts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);

  const getFn = useFetch<any[], any>({
    url: '',
    method: "GET",
  });

  const getCustomersFn = useFetch<any[], any>({
    url: '',
    method: "GET",
  });

  useEffect(() => {
    if (hasHydrated && masterAccountId) {
      getFn.fn(`/api/web/bank-accounts?id=${masterAccountId}`, "{}", (result) => {
        setAccounts(result);
      });
      getCustomersFn.fn(`/api/web/customers?id=${masterAccountId}`, "{}", (result) => {
        setCustomers(result);
      });
    }
  }, [hasHydrated, masterAccountId]);

  const [isMasuk, setIsMasuk] = useState(false);
  const [isKeluar, setIsKeluar] = useState(true);

  const [selectedRekening, setSelectedRekening] = useState("");

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
  const [voucherNo, setVoucherNo] = useState("BM-BCA8838/V/26/001");

  useEffect(() => {
    setVoucherNo((prev) => {
      if (prev.startsWith("BK-") && isMasuk) return prev.replace("BK-", "BM-");
      if (prev.startsWith("BM-") && isKeluar) return prev.replace("BM-", "BK-");
      return prev;
    });
  }, [isMasuk, isKeluar]);

  useEffect(() => {
    if (total > 0) {
      setTerbilangValue(terbilang(total) + " Rupiah");
    } else {
      setTerbilangValue("");
    }
  }, [total]);

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
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
          <h1 className="text-2xl font-bold text-base-content">Bank Voucher</h1>
          <p className="text-base-content/70">Create and print bank vouchers</p>
        </div>
        <button onClick={handlePrint} className="btn btn-primary">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print Voucher
        </button>
      </div>

      <div className="flex justify-center print:block print:w-full print:m-0 print:p-0">
        {/* Printable Area */}
        <div className="bg-white text-black w-full max-w-5xl p-4 md:p-8 shadow-xl print:shadow-none print:w-full print:max-w-none print:p-0 border border-gray-300 print:border-none">
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-4">
            <div>
              <h2 className="text-2xl font-bold tracking-wider mb-4">BUKTI VOUCHER BANK</h2>
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
                  <span>BANK KELUAR</span>
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
                  <span>BANK MASUK</span>
                </label>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center justify-end space-x-2 mb-2">
                <div className="w-10 h-10 bg-blue-500 text-white font-bold flex items-center justify-center rounded-sm">
                  LR
                </div>
                <h3 className="font-bold text-lg">PT. LERYN JAYA MAS</h3>
              </div>
            </div>
          </div>

          {/* Details Section */}
          <div className="grid grid-cols-2 gap-4 md:gap-8 mb-4 text-sm font-medium">
            <div className="space-y-3">
              <div className="grid grid-cols-[130px_10px_1fr] items-center">
                <span>Dibayar/ Diterima</span>
                <span>:</span>
                <select className="select select-sm border-b border-dashed border-gray-400 bg-transparent rounded-none focus:outline-none focus:border-black px-1 print:border-none print:p-0 w-full text-black font-medium print:appearance-none" defaultValue="">
                  <option value="" disabled>Pilih Bank...</option>
                  <option value="Bank BCA">Bank BCA</option>
                  <option value="Bank Mandiri">Bank Mandiri</option>
                  <option value="Bank BNI">Bank BNI</option>
                  <option value="Bank BRI">Bank BRI</option>
                  <option value="Bank Syariah Indonesia (BSI)">Bank Syariah Indonesia (BSI)</option>
                  <option value="Bank CIMB Niaga">Bank CIMB Niaga</option>
                  <option value="Bank Permata">Bank Permata</option>
                  <option value="Bank Danamon">Bank Danamon</option>
                  <option value="Bank BTN">Bank BTN</option>
                </select>
              </div>
              <div className="grid grid-cols-[130px_10px_1fr] items-center">
                <span>Bank</span>
                <span>:</span>
                <select 
                  className="select select-sm border-b border-dashed border-gray-400 bg-transparent rounded-none focus:outline-none focus:border-black px-1 print:border-none print:p-0 w-full text-black font-medium print:appearance-none" 
                  defaultValue=""
                  onChange={(e) => {
                    const acc = accounts.find((a) => a._id === e.target.value);
                    if (acc) setSelectedRekening(acc.accountNumber);
                  }}
                >
                  <option value="" disabled>Pilih Akun Bank...</option>
                  {accounts.map(a => (
                    <option key={a._id} value={a._id}>{a.bank}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-[130px_10px_1fr] items-center">
                <span>No. Rekening</span>
                <span>:</span>
                <input 
                  type="text" 
                  value={selectedRekening}
                  onChange={(e) => setSelectedRekening(e.target.value)}
                  placeholder="6475788838" 
                  className="input input-sm border-b border-dashed border-gray-400 bg-transparent rounded-none focus:outline-none focus:border-black px-1 print:border-none print:p-0 w-full text-black" 
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
                  placeholder="BM-BCA8838/V/26/001" 
                  className="input input-sm border-b border-dashed border-gray-400 bg-transparent rounded-none focus:outline-none focus:border-black px-1 print:border-none print:p-0 w-full text-black" 
                />
              </div>
              <div className="grid grid-cols-[80px_10px_1fr] items-center">
                <span>Tgl.</span>
                <span>:</span>
                <input type="text" defaultValue={formattedToday} className="input input-sm border-b border-dashed border-gray-400 bg-transparent rounded-none focus:outline-none focus:border-black px-1 print:border-none print:p-0 w-full text-black" />
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
                        <input
                          type="number"
                          value={row.jumlah || ""}
                          onChange={(e) => handleRowChange(index, "jumlah", e.target.value)}
                          className="w-full bg-transparent focus:outline-none text-right text-black font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          placeholder="0"
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
  );
}
