import React from 'react';

export default function PrintableVoucher({ voucher, isLast, company }: { voucher: any; isLast?: boolean; company?: any }) {
  const isMasuk = voucher.voucherType === "masuk";
  const isKeluar = voucher.voucherType === "keluar";

  let rows = [...(voucher.items || [])];
  while (rows.length < 3) {
    rows.push({ id: Math.random().toString(), keterangan: "", customer: "", jumlah: 0 });
  }

  const tanggal = voucher.date ? new Date(voucher.date).toISOString().split("T")[0] : "";

  const fMonth = (_date: string) => {
    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const [year, month, date] = _date.split("-");
    return `${date} ${months[Number(month) - 1]} ${year}`;
  }

  function fixBySequence(voucher: string, sequence: number) {
    const [type, month, year, number] = voucher.split('/');
    return `${type}/${month}/${year}/${String(sequence).padStart(3, "0")}`
  }

  return (
    <div className="voucher-print-page bg-white text-black w-full max-w-5xl mx-auto p-3 md:p-6 print:py-8 print:px-6 shadow-xl border border-gray-300 mb-8 print:border-none print:shadow-none print:mb-0">

      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-black pb-2 mb-2">
        <div>
          <h2 className="text-lg font-bold tracking-wider mb-2">BUKTI VOUCHER BANK</h2>
          <div className="flex space-x-6 text-sm font-semibold">
            <label className="flex items-center space-x-2">
              <input type="checkbox" checked={isKeluar} readOnly
                className="checkbox checkbox-sm rounded-none border-2 border-black" />
              <span>BANK KELUAR</span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="checkbox" checked={isMasuk} readOnly
                className="checkbox checkbox-sm rounded-none border-2 border-black" />
              <span>BANK MASUK</span>
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
      <div className="grid grid-cols-2 gap-3 md:gap-6 mb-2 text-xs font-medium">
        <div className="space-y-1.5">
          <div className="grid grid-cols-[100px_10px_1fr] items-center">
            {isMasuk ? <span>Dibayar Oleh</span> : <span>Diterima Oleh</span>}
            <span>:</span>
            <div className="border-b border-dashed border-gray-400 px-1 w-full text-black font-medium h-6">{voucher.dibayarDiterima}</div>
          </div>
          <div className="grid grid-cols-[100px_10px_1fr] items-center">
            <span>Bank</span>
            <span>:</span>
            <div className="border-b border-dashed border-gray-400 px-1 w-full text-black font-medium h-6">{voucher.bank || voucher.bankAccountId?.bank}</div>
          </div>
          <div className="grid grid-cols-[100px_10px_1fr] items-center">
            <span>No. Rekening</span>
            <span>:</span>
            <div className="border-b border-dashed border-gray-400 px-1 w-full text-black font-medium h-6">{voucher.noRekening}</div>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="grid grid-cols-[60px_10px_1fr] items-center">
            <span>No.</span>
            <span>:</span>
            <div className="border-b border-dashed border-gray-400 px-1 w-full text-black font-medium h-6">{fixBySequence(voucher.voucherNumber, voucher.sequence)}</div>
          </div>
          <div className="grid grid-cols-[60px_10px_1fr] items-center">
            <span>Tgl.</span>
            <span>:</span>
            <div className="border-b border-dashed border-gray-400 px-1 w-full text-black font-medium h-6">{fMonth(tanggal)}</div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="border-2 border-black mb-2">
        <table className="w-full text-xs">
          <thead className="border-b-2 border-black text-center font-bold">
            <tr>
              <th className="border-r-2 border-black py-2 w-[5%]">No.</th>
              <th className="border-r-2 border-black py-2 w-[40%]">Keterangan</th>
              <th className="border-r-2 border-black py-2 w-[30%]">Nama Customer</th>
              <th className="py-2 w-[25%]">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row: any, index: number) => (
              <tr key={index} className="border-b border-black last:border-b-0">
                <td className="border-r-2 border-black text-center align-top p-0.5 font-semibold text-xs">{index + 1}</td>
                <td className="border-r-2 border-black p-0">
                  <div className="w-full min-h-[32px] px-1 py-0.5 text-black font-medium whitespace-pre-wrap text-xs">{row.keterangan}</div>
                </td>
                <td className="border-r-2 border-black p-0 align-top">
                  <div className="w-full min-h-[32px] px-1 py-0.5 text-center text-black font-medium text-xs">{row.customer}</div>
                </td>
                <td className="p-1 align-top">
                  <div className="flex justify-between items-center h-full px-2">
                    <span className="font-semibold">Rp.</span>
                    <span className="text-right text-black font-semibold">{Number(row.jumlah || 0).toLocaleString('id-ID', { minimumFractionDigits: 2 })}</span>
                  </div>
                </td>
              </tr>
            ))}
            <tr className="border-t-2 border-black font-semibold h-8">
              <td colSpan={3} className="border-r-2 border-black px-2">
                <div className="flex items-center space-x-2">
                  <span>TERBILANG</span>
                  <div className="flex-1 border-b border-dashed border-gray-400 px-2 italic text-black font-medium h-6">{voucher.terbilang}</div>
                </div>
              </td>
              <td className="px-3 text-right whitespace-nowrap font-bold">
                Rp. {Number(voucher.total || 0).toLocaleString('id-ID')},-
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Signatures */}
      <div className="grid grid-cols-4 border-2 border-black text-xs h-24">
        {["DIBUKUKAN OLEH,", "DISETUJUI OLEH,", "DICEK OLEH,", "DIBUAT OLEH,"].map((title, i) => (
          <div key={title} className={`flex flex-col justify-between p-1.5 ${i !== 3 ? 'border-r-2 border-black' : ''}`}>
            <div className="text-center font-bold text-[10px] mb-1">{title}</div>
            <div className="mt-auto space-y-1 font-semibold">
              <div className="flex items-center">
                <span className="w-8 text-[10px]">Nama</span><span className="text-[10px]">:</span>
                <div className="flex-1 border-b border-black ml-1 h-4" />
              </div>
              <div className="flex items-center">
                <span className="w-8 text-[10px]">Tgl.</span><span className="text-[10px]">:</span>
                <div className="flex-1 border-b border-black ml-1 h-4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
