"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */

import { useEffect, useState, useMemo } from "react";
import useAbsensiFetch from "@/hooks/useAbsensiFetch";
import useAuth from "@/store/auth";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PayrollItem {
  name: string;
  value: number;
}

interface Employee {
  pegawai_id: string | number;
  company_id: string | number;
  division_id: string | number;
  position_id: string | number;
  nik: string;
  nama_pegawai: string;
  nomor_pegawai: string;
  email_pegawai: string;
  jenis_kelamin: string;
  tanggal_mulai_kerja: string;
  foto_pegawai: string;
  salary: number;
  status_pegawai: string;
  contract_start_date: string;
  contract_end_date: string;
  on_training: boolean | number;
  salary_config: any;
  married: string | number;
  minus: PayrollItem[];
  plus: PayrollItem[];
  totalPlus: number;
  totalMinus: number;
  income: number;
  thp: number;
}

interface Month {
  key: string;
  month: string;
}

interface PayrollData {
  filter: any;
  months: Month[];
  employees: Employee[];
  thpGrandTotal: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRp(value: number | undefined | null) {
  if (value === undefined || value === null || isNaN(Number(value))) return "Rp 0";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value));
}

function genderLabel(g: string) {
  return g === "L" ? "Laki-laki" : g === "P" ? "Perempuan" : g || "-";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PayrollPage() {
  const hasHydrated = useAuth((s) => s._hasHydrated);
  const masterAccountId = useAuth((s) => s.masterAccountId);

  const [payroll, setPayroll] = useState<PayrollData | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [search, setSearch] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const payrollFetch = useAbsensiFetch<PayrollData, null>({
    url: `/payroll/${masterAccountId || ""}`,
    method: "GET",
  });

  useEffect(() => {
    if (hasHydrated && masterAccountId) {
      payrollFetch.fn(
        `/payroll/${masterAccountId}`,
        null as any,
        (data) => {
          setPayroll(data);
          if (data?.months?.length) {
            setSelectedMonth(data.months[0].key);
          }
        }
      );
    }
  }, [hasHydrated, masterAccountId]);

  const filteredEmployees = useMemo(() => {
    if (!payroll?.employees) return [];
    return payroll.employees.filter((emp) => {
      const matchSearch =
        !search ||
        emp.nama_pegawai?.toLowerCase().includes(search.toLowerCase()) ||
        emp.nik?.toLowerCase().includes(search.toLowerCase()) ||
        emp.nomor_pegawai?.toLowerCase().includes(search.toLowerCase());
      return matchSearch;
    });
  }, [payroll, search]);

  if (!hasHydrated) return null;

  // ─── Detail Modal ────────────────────────────────────────────────────────────

  const EmployeeDetailModal = () => {
    if (!selectedEmployee) return null;
    const e = selectedEmployee;
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={() => setSelectedEmployee(null)}
      >
        <div
          className="bg-white text-black rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4"
          onClick={(ev) => ev.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-900 to-blue-700 text-white p-6 rounded-t-2xl flex items-center gap-4">
            <div className="size-16 rounded-full bg-white/20 flex items-center justify-center text-3xl font-bold uppercase flex-shrink-0">
              {e.nama_pegawai?.charAt(0) || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xl font-bold truncate">{e.nama_pegawai}</p>
              <p className="text-blue-200 text-sm">{e.nomor_pegawai} · {e.nik}</p>
              <span className={`mt-1 inline-block text-xs px-2 py-0.5 rounded-full font-medium ${e.status_pegawai === "active" ? "bg-green-500/30 text-green-200" : "bg-red-500/30 text-red-200"}`}>
                {e.status_pegawai}
              </span>
            </div>
            <button onClick={() => setSelectedEmployee(null)} className="text-white/70 hover:text-white transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-6 flex flex-col gap-5">
            {/* Personal Info */}
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Data Diri</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoRow label="Jenis Kelamin" value={genderLabel(e.jenis_kelamin)} />
                <InfoRow label="Email" value={e.email_pegawai || "-"} />
                <InfoRow label="Mulai Kerja" value={e.tanggal_mulai_kerja ? new Date(e.tanggal_mulai_kerja).toLocaleDateString("id-ID") : "-"} />
                <InfoRow label="Status" value={e.status_pegawai || "-"} />
                <InfoRow label="Kontrak Mulai" value={e.contract_start_date ? new Date(e.contract_start_date).toLocaleDateString("id-ID") : "-"} />
                <InfoRow label="Kontrak Selesai" value={e.contract_end_date ? new Date(e.contract_end_date).toLocaleDateString("id-ID") : "-"} />
                <InfoRow label="Status Nikah" value={e.married ? "Menikah" : "Belum Menikah"} />
                <InfoRow label="Training" value={e.on_training ? "Ya" : "Tidak"} />
              </div>
            </section>

            <hr />

            {/* Salary Breakdown */}
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Rincian Gaji</h3>
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Gaji Pokok</span>
                  <span className="font-medium">{formatRp(e.salary)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Income</span>
                  <span className="font-medium">{formatRp(e.income)}</span>
                </div>
              </div>
            </section>

            {/* Additions */}
            {e.plus?.length > 0 && (
              <section>
                <h3 className="text-xs font-semibold text-green-700 uppercase tracking-widest mb-2">Penambahan (+)</h3>
                <div className="flex flex-col gap-1 text-sm">
                  {e.plus.map((p, i) => (
                    <div key={i} className="flex justify-between py-1 border-b border-gray-100">
                      <span className="text-gray-700">{p.name}</span>
                      <span className="font-medium text-green-700">+{formatRp(p.value)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-1 font-semibold text-green-700">
                    <span>Total Penambahan</span>
                    <span>+{formatRp(e.totalPlus)}</span>
                  </div>
                </div>
              </section>
            )}

            {/* Deductions */}
            {e.minus?.length > 0 && (
              <section>
                <h3 className="text-xs font-semibold text-red-700 uppercase tracking-widest mb-2">Potongan (-)</h3>
                <div className="flex flex-col gap-1 text-sm">
                  {e.minus.map((m, i) => (
                    <div key={i} className="flex justify-between py-1 border-b border-gray-100">
                      <span className="text-gray-700">{m.name}</span>
                      <span className="font-medium text-red-700">-{formatRp(m.value)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-1 font-semibold text-red-700">
                    <span>Total Potongan</span>
                    <span>-{formatRp(e.totalMinus)}</span>
                  </div>
                </div>
              </section>
            )}

            <hr />

            {/* THP */}
            <div className="flex justify-between items-center bg-blue-50 rounded-xl p-4">
              <span className="font-bold text-blue-900 text-base">Take Home Pay (THP)</span>
              <span className="font-bold text-blue-900 text-lg">{formatRp(e.thp)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ─── Main Render ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-full p-6 flex flex-col gap-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payroll</h1>
          <p className="text-sm text-gray-500">Kelola dan pantau penggajian karyawan</p>
        </div>
      </div>

      {/* Content Card */}
      <div className="bg-white border-t-4 border-blue-900 rounded-b-xl shadow-sm flex flex-col flex-1">
        {/* Toolbar */}
        <div className="p-5 flex flex-col sm:flex-row gap-3 border-b border-gray-100">
          {/* Month filter */}
          {payroll?.months?.length ? (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="select select-bordered select-sm text-black bg-white w-full sm:w-56"
            >
              {payroll.months.map((m) => (
                <option key={m.key} value={m.key}>{m.month}</option>
              ))}
            </select>
          ) : null}

          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari karyawan..."
              className="input input-bordered input-sm pl-9 w-full text-black bg-white"
            />
          </div>

          <div className="sm:ml-auto flex items-center gap-2">
            <span className="text-sm text-gray-500">{filteredEmployees.length} karyawan</span>
          </div>
        </div>

        {/* Loading / Error */}
        {payrollFetch.loading && (
          <div className="flex-1 flex flex-col justify-center items-center py-24 gap-3">
            <span className="loading loading-spinner loading-lg text-blue-900"></span>
            <span className="text-gray-500 text-sm">Memuat data payroll...</span>
          </div>
        )}

        {!payrollFetch.loading && payrollFetch.error && (
          <div className="flex-1 flex flex-col justify-center items-center py-24 gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-12 text-red-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <p className="text-red-600 font-medium">Gagal memuat data</p>
            <p className="text-gray-500 text-sm">{payrollFetch.message}</p>
          </div>
        )}

        {/* Summary Cards */}
        {!payrollFetch.loading && payroll && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5 border-b border-gray-100">
              <SummaryCard
                title="Total Karyawan"
                value={String(filteredEmployees.length)}
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                  </svg>
                }
                color="blue"
              />
              <SummaryCard
                title="Total THP"
                value={formatRp(payroll.thpGrandTotal)}
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
                  </svg>
                }
                color="green"
              />
              <SummaryCard
                title="Rata-rata THP"
                value={formatRp(filteredEmployees.length ? (payroll.thpGrandTotal / filteredEmployees.length) : 0)}
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                  </svg>
                }
                color="purple"
              />
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="table table-zebra text-black w-full text-sm">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    <th className="w-10">#</th>
                    <th>Karyawan</th>
                    <th>NIK / No. Karyawan</th>
                    <th className="text-right">Gaji Pokok</th>
                    <th className="text-right text-green-700">+ Penambahan</th>
                    <th className="text-right text-red-700">- Potongan</th>
                    <th className="text-right font-semibold text-blue-900">THP</th>
                    <th className="text-center">Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center py-10 text-gray-400">
                        Tidak ada data karyawan.
                      </td>
                    </tr>
                  )}
                  {filteredEmployees.map((emp, idx) => (
                    <tr key={emp.pegawai_id || idx} className="hover cursor-pointer" onClick={() => setSelectedEmployee(emp)}>
                      <td className="text-gray-400">{idx + 1}</td>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center font-bold text-sm uppercase flex-shrink-0">
                            {emp.nama_pegawai?.charAt(0) || "?"}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{emp.nama_pegawai}</p>
                            <p className="text-gray-400 text-xs truncate">{emp.email_pegawai}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <p className="text-xs text-gray-600">{emp.nik || "-"}</p>
                        <p className="text-xs text-gray-400">{emp.nomor_pegawai || "-"}</p>
                      </td>
                      <td className="text-right">{formatRp(emp.salary)}</td>
                      <td className="text-right text-green-700 font-medium">
                        {emp.totalPlus ? `+${formatRp(emp.totalPlus)}` : "-"}
                      </td>
                      <td className="text-right text-red-700 font-medium">
                        {emp.totalMinus ? `-${formatRp(emp.totalMinus)}` : "-"}
                      </td>
                      <td className="text-right font-bold text-blue-900">
                        {formatRp(emp.thp)}
                      </td>
                      <td className="text-center">
                        <span className={`badge badge-sm ${emp.status_pegawai === "active" ? "badge-success" : "badge-ghost"}`}>
                          {emp.status_pegawai || "-"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {filteredEmployees.length > 0 && (
                  <tfoot>
                    <tr className="bg-blue-50 font-bold text-blue-900">
                      <td colSpan={6} className="text-right">Grand Total THP</td>
                      <td className="text-right">{formatRp(payroll.thpGrandTotal)}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </>
        )}
      </div>

      {/* Employee Detail Modal */}
      {selectedEmployee && <EmployeeDetailModal />}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-gray-800 font-medium truncate">{value}</span>
    </div>
  );
}

function SummaryCard({ title, value, icon, color }: { title: string; value: string; icon: React.ReactNode; color: "blue" | "green" | "purple" }) {
  const colorMap = {
    blue: "bg-blue-50 text-blue-900 border-blue-200",
    green: "bg-green-50 text-green-900 border-green-200",
    purple: "bg-purple-50 text-purple-900 border-purple-200",
  };
  const iconMap = {
    blue: "bg-blue-100 text-blue-700",
    green: "bg-green-100 text-green-700",
    purple: "bg-purple-100 text-purple-700",
  };
  return (
    <div className={`flex items-center gap-4 p-4 rounded-xl border ${colorMap[color]}`}>
      <div className={`size-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconMap[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs opacity-70 font-medium">{title}</p>
        <p className="text-lg font-bold leading-tight">{value}</p>
      </div>
    </div>
  );
}
