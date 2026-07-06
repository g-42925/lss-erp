/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
"use client"

import { useState, useEffect, useCallback } from "react";
import useAuth from "@/store/auth";
import * as XLSX from 'xlsx';

// -- Typings --
type CashflowTransaction = {
	_id: string;
	date: string;
	amount: number;
	method: string;
	reference: string;
	source: string;
	type: 'in' | 'out' | 'initial';
	to?: string,
	from?: string
};

type Summary = {
	totalIn: number;
	totalOut: number;
	initialBalance: number;
	netCashflow: number;
	finalBalance: number;
};

type BankAccount = {
	_id: string;
	bank: string;
	accountNumber: string;
	accountName: string;
};

// -- Helpers --
const IDR = (v: number) =>
	new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(v);

export default function CashflowReportPage() {
	const hasHydrated = useAuth(s => s._hasHydrated);
	const loggedIn = useAuth(s => s.loggedIn);
	const masterAccountId = useAuth(s => s.masterAccountId);

	const [mode, setMode] = useState<'cash' | 'bank'>('cash');
	const [startDate, setStartDate] = useState('');
	const [endDate, setEndDate] = useState('');
	const [bankAccountId, setBankAccountId] = useState('');
	const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

	const [transactions, setTransactions] = useState<CashflowTransaction[]>([]);
	const [summary, setSummary] = useState<Summary>({ totalIn: 0, totalOut: 0, initialBalance: 0, netCashflow: 0, finalBalance: 0 });
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	const [isCashOut, setIsCashOut] = useState(false);

	// Modal state
	const [showModal, setShowModal] = useState(false);
	const [modalData, setModalData] = useState({
		type: 'in', // 'in', 'out', 'initial'
		amount: '',
		reference: '',
		date: new Date().toISOString().split('T')[0],
		accountType: 'cash',
		bankAccountId: '',
		from: '',
		to: '',
	});

	const fetchBankAccounts = useCallback(async () => {
		if (!masterAccountId) return;
		try {
			const res = await fetch(`/api/web/bank-accounts?id=${masterAccountId}`);
			const data = await res.json();
			if (!data.error) setBankAccounts(data.result || []);
		} catch (e) { }
	}, [masterAccountId]);

	const fetchCashflow = useCallback(async () => {
		if (!masterAccountId) return;
		setLoading(true);
		setError('');
		try {
			const params = new URLSearchParams({
				id: masterAccountId,
				mode: mode,
			});
			if (startDate) params.append('startDate', startDate);
			if (endDate) params.append('endDate', endDate);
			if (mode === 'bank' && bankAccountId) params.append('bankAccountId', bankAccountId);

			const res = await fetch(`/api/web/finance/reports/cashflow?${params.toString()}`);
			const json = await res.json();

			if (json.error) {
				setError(json.message);
			} else {
				setTransactions(json.result?.transactions || []);
				setSummary(json.result?.summary || { totalIn: 0, totalOut: 0, initialBalance: 0, netCashflow: 0, finalBalance: 0 });
			}
		} catch (e: any) {
			setError(e.message);
		} finally {
			setLoading(false);
		}
	}, [masterAccountId, mode, startDate, endDate, bankAccountId]);

	useEffect(() => {
		if (hasHydrated && loggedIn) {
			fetchBankAccounts();
			fetchCashflow();
		}
	}, [hasHydrated, loggedIn, fetchCashflow, fetchBankAccounts]);

	const handleAddSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {

			const additional = modalData.type === 'out' ? { to: modalData.to } : { from: modalData.from };

			const res = await fetch('/api/web/finance/reports/cashflow', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					masterAccountId,
					accountType: modalData.accountType === 'cash' ? 'Cash' : 'Bank',
					bankAccountId: modalData.accountType === 'bank' ? modalData.bankAccountId : null,
					type: modalData.type,
					amount: Number(modalData.amount),
					reference: modalData.reference,
					date: modalData.date,
					recordedBy: null,
					additional
				})
			});
			const json = await res.json();
			if (json.error) {
				alert(json.message);
			}
			else {
				window.location.href = '/dashboard/finance/cashflow'
			}
		}
		catch (e: any) {
			alert("Error: " + e.message);
		}
	};

	function onTransactionChange(type: 'in' | 'out' | 'initial') {
		if (type === 'out') {
			setIsCashOut(true);
		}
		else {
			setIsCashOut(false);
		}
	}

	function countFinalBalance(index: number, current: { amount: number, type: string }, prev: { amount: number }) {
		if (index === 0) return current.amount

		if (index > 0 && index < 2) {
			if (current.type === 'in' || current.type === 'initial') {
				return prev.amount + current.amount
			}
			else {
				return prev.amount - current.amount
			}
		}

		if (index > 1) {
			if (current.type === 'in' || current.type === 'initial') {
				const x = transactions[index - 1];
				const y = transactions[index - 2];

				if (y.type === 'in' || y.type === 'initial') {
					return (y.amount + x.amount) + current.amount
				}
				else {
					return (y.amount - x.amount) + current.amount
				}
			}
			else {
				const x = transactions[index - 1];
				const y = transactions[index - 2];

				if (y.type === 'in' || y.type === 'initial') {
					return (y.amount + x.amount) - current.amount
				}
				else {
					return (y.amount - x.amount) - current.amount
				}
			}
		}
	}

	function toExcel() {
		if (transactions.length === 0) return alert('Tidak ada data untuk diexport')
		const data = transactions.map(t => ({
			'Tanggal': new Date(t.date).toLocaleString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
			'Dari': t.from || '-',
			'Kepada': t.to || '-',
			'Sumber': t.source,
			'Referensi': t.reference,
			'Akun / Metode': t.method,
			'Tipe': t.type.toUpperCase(),
			'Jumlah (IDR)': t.amount,
		}))
		const worksheet = XLSX.utils.json_to_sheet(data)
		const workbook = XLSX.utils.book_new()
		XLSX.utils.book_append_sheet(workbook, worksheet, `Cashflow ${mode.charAt(0).toUpperCase() + mode.slice(1)}`)
		XLSX.writeFile(workbook, `cashflow-${mode}-${new Date().toISOString().slice(0, 10)}.xlsx`)
	}

	if (!hasHydrated || !loggedIn) return null;

	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/20 text-slate-800 p-6 font-sans">
			<div className="max-w-[1400px] mx-auto space-y-6">

				{/* Header */}
				<div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-4">
					<div>
						<h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Cashflow Report</h1>
						<p className="text-sm text-slate-500 mt-1">Laporan Uang Keluar & Masuk</p>
					</div>
					<button
						onClick={() => {
							setModalData({ ...modalData, accountType: mode });
							setShowModal(true);
						}}
						className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/20 transition-all active:scale-95"
					>
						+ Catat Kas Manual
					</button>
				</div>

				{/* Filters */}
				<div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-wrap items-center gap-4">
					<div className="flex bg-slate-100 p-1 rounded-xl">
						<button
							onClick={() => setMode('cash')}
							className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'cash' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
						>
							Cash (Tunai)
						</button>
						<button
							onClick={() => setMode('bank')}
							className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'bank' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
						>
							Bank
						</button>
					</div>

					<div className="h-8 w-px bg-slate-200 hidden md:block"></div>

					<input
						type="date"
						value={startDate}
						onChange={(e) => setStartDate(e.target.value)}
						className="border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-indigo-500 bg-slate-50"
					/>
					<input
						type="date"
						value={endDate}
						onChange={(e) => setEndDate(e.target.value)}
						className="border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-indigo-500 bg-slate-50"
					/>

					{mode === 'bank' && (
						<select value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)} className="border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-indigo-500 bg-slate-50">
							{bankAccounts.map(b => (
								<option key={b._id} value={b._id}>
									{b.bank} - {b.accountName}
								</option>
							))}
						</select>
					)}

					<button
						onClick={fetchCashflow}
						disabled={loading}
						className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm active:scale-95 disabled:opacity-70 ml-auto"
					>
						{loading ? 'Memuat...' : 'Terapkan Filter'}
					</button>
					<button
						onClick={toExcel}
						disabled={loading || transactions.length === 0}
						className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm active:scale-95 disabled:opacity-70 flex items-center gap-2"
					>
						<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
						Export Excel
					</button>
				</div>

				{/* Summary Cards */}
				{error ? (
					<div className="bg-rose-50 text-rose-600 p-4 rounded-xl border border-rose-100 text-sm font-medium">
						Error: {error}
					</div>
				) : (
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
						<div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 relative overflow-hidden">
							<div className="w-16 h-16 bg-emerald-500/10 rounded-full absolute -right-4 -top-4"></div>
							<p className="text-emerald-700/70 text-xs font-bold uppercase tracking-widest mb-1 relative z-10">Total Uang Masuk</p>
							<p className="text-2xl font-extrabold text-emerald-700 relative z-10">{IDR(summary.totalIn)}</p>
						</div>
						<div className="bg-rose-50 border border-rose-100 rounded-2xl p-5 relative overflow-hidden">
							<div className="w-16 h-16 bg-rose-500/10 rounded-full absolute -right-4 -top-4"></div>
							<p className="text-rose-700/70 text-xs font-bold uppercase tracking-widest mb-1 relative z-10">Total Uang Keluar</p>
							<p className="text-2xl font-extrabold text-rose-700 relative z-10">{IDR(summary.totalOut)}</p>
						</div>
						<div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 relative overflow-hidden">
							<div className="w-16 h-16 bg-emerald-500/10 rounded-full absolute -right-4 -top-4"></div>
							<p className="text-emerald-700/70 text-xs font-bold uppercase tracking-widest mb-1 relative z-10">Saldo Bersih</p>
							<p className="text-2xl font-extrabold text-emerald-700 relative z-10">{IDR(summary.netCashflow)}</p>
						</div>
					</div>
				)}

				{/* Table */}
				<div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
					<div className="overflow-x-auto">
						<table className="w-full text-left text-sm">
							<thead className="bg-slate-50 border-b border-slate-100 text-xs font-bold uppercase tracking-widest text-slate-500">
								<tr>
									<th className="p-4 whitespace-nowrap">Tanggal</th>
									<th className="p-4 whitespace-nowrap">Dari</th>
									<th className="p-4 whitespace-nowrap">Kepada</th>
									<th className="p-4 whitespace-nowrap">Sumber</th>
									<th className="p-4">Referensi</th>
									<th className="p-4 whitespace-nowrap">Akun / Metode</th>
									<th className="p-4 whitespace-nowrap">Tipe</th>
									<th className="p-4 whitespace-nowrap text-right">Jumlah</th>
									<th className="p-4 whitespace-nowrap">Saldo akhir</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-50">
								{transactions.length === 0 ? (
									<tr>
										<td colSpan={6} className="p-8 text-center text-slate-400">Belum ada transaksi pada periode ini.</td>
									</tr>
								) : (
									transactions.map((t, idx) => (
										<tr key={t._id + idx} className="hover:bg-slate-50/50 transition-colors">
											<td className="p-4 whitespace-nowrap font-medium text-slate-700">
												{new Date(t.date).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
											</td>
											<td className="p-4 whitespace-nowrap">
												{t.from || t.from === '' ? t.from : '-'}
											</td>
											<td className="p-4 whitespace-nowrap">
												{t.to || t.to == '' ? t.to : '-'}
											</td>
											<td className="p-4 whitespace-nowrap">
												<span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md">
													{t.source}
												</span>
											</td>
											<td className="p-4 truncate max-w-[200px] text-slate-700" title={t.reference}>{t.reference}</td>
											<td className="p-4 font-medium text-slate-600 capitalize">{t.method}</td>
											<td className="p-4 whitespace-nowrap">
												{t.type === 'in' && <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">IN</span>}
												{t.type === 'out' && <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">OUT</span>}
												{t.type === 'initial' && <span className="text-xs font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">INITIAL</span>}
											</td>
											<td className={`p-4 font-extrabold text-right whitespace-nowrap ${t.type === 'in' ? 'text-emerald-600' : t.type === 'out' ? 'text-rose-600' : 'text-sky-600'}`}>
												{t.amount}
											</td>
											<td className={`p-4 font-extrabold text-right whitespace-nowrap`}>
												{countFinalBalance(idx, transactions[idx], transactions[idx - 1])}
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</div>

				{/* Create Modal */}
				{showModal && (
					<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
						<div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100">
							<div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
								<h2 className="text-lg font-bold text-slate-800">Catat Kas (Manual)</h2>
								<button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full transition-colors">
									<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
										<path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
									</svg>
								</button>
							</div>

							<form onSubmit={handleAddSubmit} className="p-6 space-y-4">
								<div>
									<label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">Jenis Aliran</label>
									<select
										required
										value={modalData.type}
										onChange={(e) => {
											setModalData({ ...modalData, type: e.target.value });
											onTransactionChange(e.target.value as 'in' | 'out' | 'initial');
										}}
										className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-indigo-500 bg-slate-50"
									>
										<option value="in">Uang Masuk (Cash In)</option>
										<option value="out">Uang Keluar (Cash Out)</option>
										<option value="initial">Saldo Awal</option>
									</select>
								</div>
								<div className="grid grid-cols-2 gap-4">
									<div>
										<label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">Tujuan/Sumber</label>
										<select
											required
											value={modalData.accountType}
											onChange={(e) => setModalData({ ...modalData, accountType: e.target.value })}
											className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-indigo-500 bg-slate-50"
										>
											<option value="cash">Kas Tunai</option>
											<option value="bank">Rekening Bank</option>
										</select>
									</div>
									{modalData.accountType === 'bank' && (
										<div>
											<label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">Pilih Bank</label>
											<select
												required
												value={modalData.bankAccountId}
												onChange={(e) => setModalData({ ...modalData, bankAccountId: e.target.value })}
												className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-indigo-500 bg-slate-50"
											>
												<option value="">-- Pilih Bank --</option>
												{bankAccounts.map(b => (
													<option key={b._id} value={b._id}>{b.bank} - {b.accountName}</option>
												))}
											</select>
										</div>
									)}
								</div>

								<div>
									<label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">Nominal (Rp)</label>
									<input
										type="number"
										required
										min="0"
										value={modalData.amount}
										onChange={(e) => setModalData({ ...modalData, amount: e.target.value })}
										className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-indigo-500 bg-slate-50"
										placeholder="Contoh: 150000"
									/>
								</div>

								<div>
									<label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">Referensi / Keterangan</label>
									<input
										type="text"
										required
										value={modalData.reference}
										onChange={(e) => setModalData({ ...modalData, reference: e.target.value })}
										className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-indigo-500 bg-slate-50"
										placeholder="Contoh: Bayar Listrik Bulan Ini"
									/>
								</div>

								<div>
									<label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">Tanggal</label>
									<input
										type="date"
										required
										value={modalData.date}
										onChange={(e) => setModalData({ ...modalData, date: e.target.value })}
										className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-indigo-500 bg-slate-50"
									/>
								</div>

								{
									isCashOut ? (
										<div>
											<label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">Kepada</label>
											<input
												type="text"
												value={modalData.to}
												onChange={(e) => setModalData({ ...modalData, to: e.target.value })}
												className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-indigo-500 bg-slate-50"
												placeholder="Contoh: Ke Siapa"
											/>
										</div>
									) : (
										<div>
											<label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">Dari</label>
											<input
												type="text"
												value={modalData.from}
												onChange={(e) => setModalData({ ...modalData, from: e.target.value })}
												className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-indigo-500 bg-slate-50"
												placeholder="Contoh: Dari Siapa"
											/>
										</div>
									)
								}

								<div className="pt-4 flex justify-end gap-3">
									<button
										type="button"
										onClick={() => setShowModal(false)}
										className="px-5 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
									>
										Batal
									</button>
									<button
										type="submit"
										className="px-6 py-2.5 rounded-xl text-white font-semibold shadow-md focus:outline-none transition-all active:scale-95 bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30"
									>
										Simpan Entri
									</button>
								</div>
							</form>
						</div>
					</div>
				)}

			</div>
		</div>
	);
}
