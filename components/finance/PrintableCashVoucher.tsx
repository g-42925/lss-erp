import React from 'react';

export default function PrintableVoucher({ voucher, isLast, company }: { voucher: any; isLast?: boolean; company?: any }) {
  const isMasuk = voucher.voucherType === "masuk";
  const isKeluar = voucher.voucherType === "keluar";

  let rows = [...(voucher.items || [])];
  while (rows.length < 3) {
    rows.push({ id: Math.random().toString(), keterangan: "", customer: "", jumlah: 0 });
  }

  const tanggal = voucher.date ? new Date(voucher.date).toISOString().split("T")[0] : "";

  return (
    <div className="voucher-print-page bg-white text-black w-full max-w-5xl mx-auto p-4 md:p-8 shadow-xl border border-gray-300 mb-8">

      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-wider mb-4">BUKTI VOUCHER KAS</h2>
          <div className="flex space-x-6 text-sm font-semibold">
            <label className="flex items-center space-x-2">
              <input type="checkbox" checked={isKeluar} readOnly
                className="checkbox checkbox-sm rounded-none border-2 border-black" />
              <span>KAS KELUAR</span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="checkbox" checked={isMasuk} readOnly
                className="checkbox checkbox-sm rounded-none border-2 border-black" />
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
            <div className="border-b border-dashed border-gray-400 px-1 w-full text-black font-medium h-6">{voucher.dibayarDiterima}</div>
          </div>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-[80px_10px_1fr] items-center">
            <span>No.</span>
            <span>:</span>
            <div className="border-b border-dashed border-gray-400 px-1 w-full text-black font-medium h-6">{voucher.voucherNumber}</div>
          </div>
          <div className="grid grid-cols-[80px_10px_1fr] items-center">
            <span>Tgl.</span>
            <span>:</span>
            <div className="border-b border-dashed border-gray-400 px-1 w-full text-black font-medium h-6">{tanggal}</div>
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
            {rows.map((row: any, index: number) => (
              <tr key={index} className="border-b border-black last:border-b-0">
                <td className="border-r-2 border-black text-center align-top p-1 font-semibold">{index + 1}</td>
                <td className="border-r-2 border-black p-0">
                  <div className="w-full min-h-[48px] px-2 py-1 text-black font-medium whitespace-pre-wrap">{row.keterangan}</div>
                </td>
                <td className="border-r-2 border-black p-0 align-top">
                  <div className="w-full min-h-[48px] px-2 py-1 text-center text-black font-medium">{row.customer}</div>
                </td>
                <td className="p-1 align-top">
                  <div className="flex justify-between items-center h-full px-2">
                    <span className="font-semibold">Rp.</span>
                    <span className="text-right text-black font-semibold">{Number(row.jumlah || 0).toLocaleString('id-ID', { minimumFractionDigits: 2 })}</span>
                  </div>
                </td>
              </tr>
            ))}
            <tr className="border-t-2 border-black font-semibold h-12">
              <td colSpan={3} className="border-r-2 border-black px-4">
                <div className="flex items-center space-x-4">
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
      <div className="grid grid-cols-4 border-2 border-black text-sm h-32">
        {["DIBUKUKAN OLEH,", "DISETUJUI OLEH,", "DICEK OLEH,", "DIBUAT OLEH,"].map((title, i) => (
          <div key={title} className={`flex flex-col justify-between p-2 ${i !== 3 ? 'border-r-2 border-black' : ''}`}>
            <div className="text-center font-bold mb-4">{title}</div>
            <div className="mt-auto space-y-1 font-semibold">
              <div className="flex items-center">
                <span className="w-12">Nama</span><span>:</span>
                <div className="flex-1 border-b border-black ml-1 h-5" />
              </div>
              <div className="flex items-center">
                <span className="w-12">Tgl.</span><span>:</span>
                <div className="flex-1 border-b border-black ml-1 h-5" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
