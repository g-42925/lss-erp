/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
"use client"

import { NumericFormat } from "react-number-format";
import { useState, useEffect, useCallback } from "react";
import useAuth from "@/store/auth";
import * as XLSX from "xlsx";

// -- Typings --
type CashflowTransaction = {
	_id: string;
	date: string;
	amount: number;
	method: string;
	reference: string;
	source: string;
	type: 'in' | 'out' | 'initial';
	to?: string;
	from?: string;
	balance?: number;
	voucherId?: string;
	voucherNumber?: string;
	voucherSequence?: string | number;
	cashVoucherId?: string;
	cashVoucherNumber?: string;
	bankVoucherId?: string;
	bankVoucherNumber?: string;
	time?: string;
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
	new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(v);

const getCurrentTime = () => {
	const now = new Date();
	return now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
};

const fixBySequence = (voucherNumber: string, sequence?: number | string) => {
	if (sequence === undefined || sequence === null) return voucherNumber;
	return `${voucherNumber}-${sequence}`;
};

export default function CashflowReportPage() {
	const hasHydrated = useAuth(s => s._hasHydrated);
	const loggedIn = useAuth(s => s.loggedIn);
	const masterAccountId = useAuth(s => s.masterAccountId);

	const [mode, setMode] = useState<'cash' | 'bank'>('cash');
	const [startDate, setStartDate] = useState('');
	const [endDate, setEndDate] = useState('');
	const [bankAccountId, setBankAccountId] = useState('');
	const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
	const [company, setCompany] = useState<any>(null);

	const [transactions, setTransactions] = useState<CashflowTransaction[]>([]);
	const [cashVouchers, setCashVouchers] = useState<any[]>([]);
	const [bankVouchers, setBankVouchers] = useState<any[]>([]);
	const [summary, setSummary] = useState<Summary>({ totalIn: 0, totalOut: 0, initialBalance: 0, netCashflow: 0, finalBalance: 0 }); const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	const [isCashOut, setIsCashOut] = useState(false);
	const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

	const [selectedReference, setSelectedReference] = useState('');
	const [search, setSearch] = useState('');
	const [inlineSavingId, setInlineSavingId] = useState<string | null>(null);

	// Modal Add state
	const [showModal, setShowModal] = useState(false);
	const [addSaving, setAddSaving] = useState(false);
	const [modalData, setModalData] = useState({
		type: 'in', // 'in', 'out', 'initial'
		amount: '',
		reference: '',
		date: new Date().toISOString().split('T')[0],
		time: getCurrentTime(),
		accountType: 'cash',
		bankAccountId: '',
		from: '',
		to: '',
	});

	function getInitialModalData(currentMode: string) {
		return {
			type: 'in',
			amount: '',
			reference: '',
			date: new Date().toISOString().split('T')[0],
			time: getCurrentTime(),
			accountType: currentMode,
			bankAccountId: '',
			from: '',
			to: '',
		};
	}

	// Modal Edit state
	const [showEditModal, setShowEditModal] = useState(false);
	const [editData, setEditData] = useState({
		_id: '',
		type: 'in',
		amount: '',
		reference: '',
		date: new Date().toISOString().split('T')[0],
		time: getCurrentTime(),
		accountType: 'cash',
		bankAccountId: '',
		from: '',
		to: '',
	});
	const [editSaving, setEditSaving] = useState(false);

	// Modal Delete state
	const [deleteModalOpen, setDeleteModalOpen] = useState(false);
	const [deleteTargetTx, setDeleteTargetTx] = useState<any>(null);
	const [deleteApprovalCode, setDeleteApprovalCode] = useState('');
	const [deleteLoading, setDeleteLoading] = useState(false);
	const [deleteError, setDeleteError] = useState('');

	const [selectedTxs, setSelectedTxs] = useState<CashflowTransaction[]>([]);

	// ─── Balance validation state untuk Cash Out ────────────────────────────────
	const [cashOutBalance, setCashOutBalance] = useState<number | null>(null);
	const [cashOutBalanceLoading, setCashOutBalanceLoading] = useState(false);

	const fetchCashOutBalance = async (accountType: string, bankAccId: string, date: string) => {
		if (!masterAccountId) return;
		setCashOutBalanceLoading(true);
		try {
			const params = new URLSearchParams({
				id: masterAccountId,
				paymentMethod: accountType === 'bank' ? 'transfer' : 'Cash',
			});
			if (accountType === 'bank' && bankAccId) params.set('bankAccountId', bankAccId);
			if (date) params.set('date', date);
			const res = await fetch(`/api/web/finance/balance?${params}`);
			const json = await res.json();
			if (!json.error) setCashOutBalance(json.result ?? 0);
			else setCashOutBalance(null);
		} catch {
			setCashOutBalance(null);
		} finally {
			setCashOutBalanceLoading(false);
		}
	};


	const fetchBankAccounts = useCallback(async () => {
		if (!masterAccountId) return;
		try {
			const res = await fetch(`/api/web/bank-accounts?id=${masterAccountId}`);
			const data = await res.json();
			if (!data.error) setBankAccounts(data.result || []);
		} catch (e) { }
	}, [masterAccountId]);

	const fetchCompany = useCallback(async () => {
		if (!masterAccountId) return;
		try {
			const res = await fetch(`/api/web/companies?id=${masterAccountId}`);
			const data = await res.json();
			if (!data.error && data.result && data.result.length > 0) {
				setCompany(data.result[0]);
			}
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
			if (search.trim()) params.append('search', search.trim());

			const res = await fetch(`/api/web/finance/reports/cashflow?${params.toString()}`);
			const json = await res.json();

			if (json.error) {
				setError(json.message);
			}
			else {
				const txs = json.result?.transactions || [];
				// Helper: build full datetime for proper chronological sorting.
				// Manual Cashflow entries store time as a separate "HH:MM" string,
				// while Invoice/Purchase entries embed time in the Date field.
				const getFullDateTime = (t: any): number => {
					const d = new Date(t.date);
					if (t.time && typeof t.time === 'string') {
						const [hh, mm] = t.time.split(':').map(Number);
						if (!isNaN(hh) && !isNaN(mm)) {
							d.setHours(hh, mm, 0, 0);
						}
					}
					return d.getTime();
				};

				txs.sort((a: any, b: any) => {
					const diff = getFullDateTime(a) - getFullDateTime(b);
					if (diff === 0) {
						if (a.type === 'initial') return -1;
						if (b.type === 'initial') return 1;
						return 0;
					}
					return diff;
				});

				let currentBalance = 0;
				const txsWithBalance = txs.map((t: any) => {
					if (t.type === 'in' || t.type === 'initial') {
						currentBalance += t.amount;
					}
					else {
						currentBalance -= t.amount;
					}
					return { ...t, balance: currentBalance };
				});

				setTransactions(txsWithBalance);
				setSummary(json.result?.summary || { totalIn: 0, totalOut: 0, initialBalance: 0, netCashflow: 0, finalBalance: 0 });
			}
		} catch (e: any) {
			setError(e.message);
		} finally {
			setLoading(false);
		}
	}, [masterAccountId, mode, startDate, endDate, bankAccountId, search]);

	const fetchVouchers = useCallback(async () => {
		if (!masterAccountId) return;
		try {
			const [cashRes, bankRes] = await Promise.all([
				fetch(`/api/web/voucher-cash?id=${masterAccountId}`),
				fetch(`/api/web/voucher-bank?id=${masterAccountId}`),
			]);
			const cashData = await cashRes.json();
			const bankData = await bankRes.json();
			if (!cashData.error) setCashVouchers(cashData.result || []);
			if (!bankData.error) setBankVouchers(bankData.result || []);
		} catch (e) { }
	}, [masterAccountId]);

	useEffect(() => {
		if (hasHydrated && loggedIn) {
			fetchCompany();
			fetchBankAccounts();
			fetchCashflow();
			fetchVouchers();
		}
	}, [hasHydrated, loggedIn, fetchCashflow, fetchBankAccounts, fetchCompany, fetchVouchers]);

	const toggleSelectTx = (t: CashflowTransaction) => {
		setSelectedTxs(prev =>
			prev.some(x => x._id === t._id)
				? prev.filter(x => x._id !== t._id)
				: [...prev, t]
		);
	};

	const handlePrintInvoiceVoucher = (t: CashflowTransaction) => {
		if (!t.voucherId) return;
		window.open(`/finance/voucher/cash/print/${t.voucherId}`, '_blank');
	};

	const handleInlineVoucherChange = async (t: CashflowTransaction, voucherId: string) => {
		setInlineSavingId(t._id);
		try {
			const field = mode === 'cash' ? 'cashVoucherId' : 'bankVoucherId';
			const res = await fetch('/api/web/finance/reports/cashflow', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: t._id, [field]: voucherId || null }),
			});
			const json = await res.json();
			if (!json.error) fetchCashflow();
		} catch (e) { }
		finally { setInlineSavingId(null); }
	};

	const handleAddSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!modalData.amount || Number(modalData.amount) <= 0) {
			alert('Nominal harus diisi dan lebih dari 0');
			return;
		}
		setAddSaving(true);
		try {
			const isInitial = modalData.type === 'initial';
			const additional: any = isInitial ? {} : (modalData.type === 'out' ? { to: modalData.to } : { from: modalData.from });
			const reference = isInitial && !modalData.reference ? `Saldo Awal-${selectedReference}` : `${modalData.reference}-${selectedReference}`;
			const res = await fetch('/api/web/finance/reports/cashflow', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					masterAccountId,
					accountType: modalData.accountType === 'cash' ? 'Cash' : 'Bank',
					bankAccountId: modalData.accountType === 'bank' ? modalData.bankAccountId : null,
					reference: modalData.accountType === 'bank' ? reference : modalData.reference,

					type: modalData.type,
					amount: Number(modalData.amount),
					date: modalData.date,
					time: modalData.time,
					recordedBy: null,
					additional
				})
			});
			const json = await res.json();
			if (json.error) {
				alert(json.message);
			}
			else {
				setShowModal(false);
				setIsCashOut(false);
				setSelectedReference('');
				fetchCashflow();
			}
		}
		catch (e: any) {
			alert("Error: " + e.message);
		}
		finally {
			setAddSaving(false);
		}
	};

	function onTransactionChange(type: 'in' | 'out' | 'initial') {
		if (type === 'out') {
			setIsCashOut(true);
			// Fetch balance ketika user memilih Cash Out
			fetchCashOutBalance(modalData.accountType, modalData.bankAccountId, modalData.date);
		}
		else {
			setIsCashOut(false);
			setCashOutBalance(null);
		}
	}



	function openEditModal(t: any) {
		// Determine accountType from method
		const accountType = mode === 'bank' ? 'bank' : 'cash';
		// Find bankAccountId: we look up by method name matching bank name
		const matchedBank = bankAccounts.find(b => b.bank === t.method);
		setEditData({
			_id: t._id,
			type: t.type,
			amount: String(t.amount),
			reference: t.type === 'initial' ? t.reference.split('-')[0] : t.reference,
			date: new Date(t.date).toISOString().split('T')[0],
			time: t.time || getCurrentTime(),
			accountType,
			bankAccountId: matchedBank?._id || '',
			from: t.from || '',
			to: t.to || '',
		});
		setShowEditModal(true);
	}

	const handleEditSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setEditSaving(true);
		try {
			const res = await fetch('/api/web/finance/reports/cashflow', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id: editData._id,
					masterAccountId,
					accountType: editData.accountType === 'cash' ? 'Cash' : 'Bank',
					bankAccountId: editData.accountType === 'bank' ? editData.bankAccountId : null,
					type: editData.type,
					amount: Number(editData.amount),
					reference: editData.reference,
					date: editData.date,
					time: editData.time,
					from: editData.type === 'in' ? editData.from : undefined,
					to: editData.type === 'out' ? editData.to : undefined,
				})
			});
			const json = await res.json();
			if (json.error) {
				alert(json.message);
			}
			else {
				setShowEditModal(false);
				fetchCashflow();
			}
		}
		catch (e: any) {
			alert('Error: ' + e.message);
		}
		finally {
			setEditSaving(false);
		}
	};

	function openDeleteModal(t: any) {
		setDeleteTargetTx(t);
		setDeleteApprovalCode('');
		setDeleteError('');
		setDeleteModalOpen(true);
	}

	const handleDeleteSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!deleteTargetTx) return;
		if (!deleteApprovalCode.trim()) {
			setDeleteError('Kode approval supervisor wajib diisi');
			return;
		}
		setDeleteLoading(true);
		setDeleteError('');
		try {
			const res = await fetch(`/api/web/finance/reports/cashflow?id=${deleteTargetTx._id}&approvalCode=${encodeURIComponent(deleteApprovalCode.trim())}`, {
				method: 'DELETE',
			});
			const json = await res.json();
			if (json.error) {
				setDeleteError(json.message || 'Gagal menghapus entri');
			} else {
				setDeleteModalOpen(false);
				setDeleteTargetTx(null);
				setDeleteApprovalCode('');
				fetchCashflow();
			}
		} catch (err: any) {
			setDeleteError(err.message || 'Terjadi kesalahan sistem');
		} finally {
			setDeleteLoading(false);
		}
	};

	function toExcel() {
		if (transactions.length === 0) return alert('Tidak ada data untuk diexport');
		const data = transactions.map(t => ({
			'Tanggal': new Date(t.date).toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }),
			'No. Voucher': t.voucherNumber || '-',
			'Dari': t.from || '-',
			'Kepada': t.to || '-',
			'Sumber': t.source,
			'Referensi': t.reference,
			'Akun / Metode': t.method,
			'Tipe': t.type.toUpperCase(),
			'Jumlah (IDR)': t.amount,
		}));
		const worksheet = XLSX.utils.json_to_sheet(data);
		const workbook = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(workbook, worksheet, `Cashflow ${mode.charAt(0).toUpperCase() + mode.slice(1)}`);
		XLSX.writeFile(workbook, `cashflow-${mode}-${new Date().toISOString().slice(0, 10)}.xlsx`);
	}

	if (!hasHydrated || !loggedIn) return null;

	return (
		<>
			<div className="min-h-screen bg-slate-50/50 text-slate-800 p-6 font-sans print:hidden">
				<div className="max-w-[1400px] mx-auto space-y-6">

					{/* Sticky Section: Header, Filter Bar & Summary Cards */}
					<div className="sticky top-0 z-20 backdrop-blur-md -mt-6 pt-6 pb-2 space-y-4">
						{/* Header dengan Action Group di Kanan */}
						<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
							<div>
								<h1 className="text-2xl font-bold text-slate-900 tracking-tight">Cashflow Report</h1>
								<p className="text-xs text-slate-500 mt-0.5">Laporan Uang Keluar & Masuk Real-time</p>
							</div>

							<div className="flex items-center gap-2.5">
								<button
									type="button"
									onClick={toExcel}
									disabled={loading || transactions.length === 0}
									className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm active:scale-95 disabled:opacity-50 flex items-center gap-2"
								>
									<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4 text-emerald-600">
										<path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
									</svg>
									<span>Export Excel</span>
								</button>



								<button
									type="button"
									onClick={() => {
										setModalData(getInitialModalData(mode));
										setIsCashOut(false);
										setSelectedReference('');
										setShowModal(true);
									}}
									className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/20 transition-all active:scale-95 flex items-center gap-1.5"
								>
									<span>+ Catat Kas Manual</span>
								</button>
							</div>
						</div>

						{/* Integrated Filter Bar */}
						<div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 flex flex-wrap items-center gap-3.5 transition-all">

							{/* Mode Switcher */}
							<div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
								<button
									type="button"
									onClick={() => setMode('cash')}
									className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'cash'
										? 'bg-white shadow-sm text-indigo-600 font-bold'
										: 'text-slate-600 hover:text-slate-900'
										}`}
								>
									Cash (Tunai)
								</button>
								<button
									type="button"
									onClick={() => setMode('bank')}
									className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'bank'
										? 'bg-white shadow-sm text-indigo-600 font-bold'
										: 'text-slate-600 hover:text-slate-900'
										}`}
								>
									Bank
								</button>
							</div>

							<div className="h-6 w-px bg-slate-200 hidden lg:block"></div>

							{/* Date Range */}
							<div className="flex items-center gap-2 shrink-0">
								<input
									type="date"
									value={startDate}
									onChange={(e) => setStartDate(e.target.value)}
									className="border border-slate-200 rounded-xl px-3.5 py-2 text-sm font-medium focus:outline-indigo-500 bg-slate-50/50 text-slate-700 min-w-[140px]"
								/>
								<input
									type="date"
									value={endDate}
									onChange={(e) => setEndDate(e.target.value)}
									className="border border-slate-200 rounded-xl px-3.5 py-2 text-sm font-medium focus:outline-indigo-500 bg-slate-50/50 text-slate-700 min-w-[140px]"
								/>
							</div>

							{/* Bank Select */}
							{mode === 'bank' && (
								<select
									value={bankAccountId}
									onChange={(e) => setBankAccountId(e.target.value)}
									className="border border-slate-200 rounded-xl px-3.5 py-2 text-sm font-medium focus:outline-indigo-500 bg-slate-50/50 text-slate-700 max-w-[220px] truncate shrink-0"
								>
									<option value="">-- Semua Bank --</option>
									{bankAccounts.map((b) => (
										<option key={b._id} value={b._id}>
											{b.bank} - {b.accountName}
										</option>
									))}
								</select>
							)}

							{/* Search Input */}
							<div className="relative flex-1 min-w-[240px]">
								<input
									type="text"
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									placeholder="Cari customer, invoice, referensi..."
									className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-indigo-500 bg-slate-50/50 text-slate-700 placeholder:text-slate-400"
								/>
								<svg
									className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
								</svg>
							</div>

							{/* Sort Button */}
							<button
								type="button"
								onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
								className="border border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 shrink-0 ml-auto"
								title="Urutan Transaksi"
							>
								<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" className="w-4 h-4 text-slate-500">
									<path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
								</svg>
								<span>{sortOrder === 'asc' ? 'Terlama' : 'Terbaru'}</span>
							</button>

						</div>

						{/* Summary Cards */}
						{error ? (
							<div className="bg-rose-50 text-rose-600 p-4 rounded-xl border border-rose-100 text-xs font-semibold">
								Error: {error}
							</div>
						) : (
							<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
								<div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-4 relative overflow-hidden">
									<div className="w-14 h-14 bg-emerald-500/10 rounded-full absolute -right-3 -top-3"></div>
									<p className="text-emerald-800/70 text-[11px] font-bold uppercase tracking-wider mb-0.5 relative z-10">Total Uang Masuk</p>
									<p className="text-2xl font-extrabold text-emerald-700 relative z-10">{IDR(summary.totalIn)}</p>
								</div>
								<div className="bg-rose-50/60 border border-rose-100 rounded-2xl p-4 relative overflow-hidden">
									<div className="w-14 h-14 bg-rose-500/10 rounded-full absolute -right-3 -top-3"></div>
									<p className="text-rose-800/70 text-[11px] font-bold uppercase tracking-wider mb-0.5 relative z-10">Total Uang Keluar</p>
									<p className="text-2xl font-extrabold text-rose-700 relative z-10">{IDR(summary.totalOut)}</p>
								</div>
								<div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-4 relative overflow-hidden">
									<div className="w-14 h-14 bg-emerald-500/10 rounded-full absolute -right-3 -top-3"></div>
									<p className="text-emerald-800/70 text-[11px] font-bold uppercase tracking-wider mb-0.5 relative z-10">Saldo Bersih</p>
									<p className="text-2xl font-extrabold text-emerald-700 relative z-10">{IDR(summary.netCashflow)}</p>
								</div>
							</div>
						)}
					</div>

					{/* Table */}
					<div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
						<div className="overflow-x-auto">
							<table className="w-full text-left text-xs">
								<thead className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-500">
									<tr>
										<th className="p-3.5 whitespace-nowrap">
											<input type="checkbox" className="checkbox checkbox-sm"
												onChange={(e) => {
													if (e.target.checked) {
														const eligible = transactions.filter(t => t.source === 'Sales Invoice' && t.voucherId);
														setSelectedTxs(eligible);
													}
													else {
														setSelectedTxs([]);
													}
												}}
												checked={selectedTxs.length > 0 && selectedTxs.length === transactions.filter(t => t.source === 'Sales Invoice' && t.voucherId).length}
											/>
										</th>
										<th className="p-3.5 whitespace-nowrap">Tanggal</th>
										<th className="p-3.5 whitespace-nowrap">Dari</th>
										<th className="p-3.5 whitespace-nowrap">Kepada</th>
										<th className="p-3.5 whitespace-nowrap">Sumber</th>
										<th className="p-3.5">Referensi</th>
										<th className="p-3.5 whitespace-nowrap">Akun / Metode</th>
										<th className="p-3.5 whitespace-nowrap">Tipe</th>
										<th className="p-3.5 whitespace-nowrap text-right">Jumlah</th>
										<th className="p-3.5 whitespace-nowrap text-right">Saldo Akhir</th>
										<th className="p-3.5 whitespace-nowrap text-right">Aksi</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-100">
									{loading ? (
										<tr>
											<td colSpan={10} className="p-8 text-center text-slate-400 font-medium">Memuat data transaksi...</td>
										</tr>
									) : transactions.length === 0 ? (
										<tr>
											<td colSpan={10} className="p-8 text-center text-slate-400">Belum ada transaksi pada periode ini.</td>
										</tr>
									) : (
										(sortOrder === 'desc' ? [...transactions].reverse() : transactions).map((t: any, idx: number) => (
											<tr key={t._id + idx} className="hover:bg-slate-50/60 transition-colors">
												<td className="p-3.5 whitespace-nowrap text-slate-700">
													{t.source === 'Sales Invoice' && t.voucherId ? (
														<input type="checkbox" className="checkbox checkbox-sm"
															checked={selectedTxs.some(x => x._id === t._id)}
															onChange={() => toggleSelectTx(t)}
														/>
													) : null}
												</td>
												<td className="p-3.5 whitespace-nowrap font-medium text-slate-700">
													{new Date(t.date).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" })}
												</td>
												<td className="p-3.5 whitespace-nowrap text-slate-600">
													{t.from || <span className="text-slate-300">-</span>}
												</td>
												<td className="p-3.5 whitespace-nowrap text-slate-600">
													{t.to || <span className="text-slate-300">-</span>}
												</td>
												<td className="p-3.5 whitespace-nowrap">
													<span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${t.source === 'Manual Entry'
														? 'bg-amber-100 text-amber-700'
														: 'bg-slate-100 text-slate-600'
														}`}>
														{t.source}
													</span>
												</td>
												<td className="p-3.5 font-medium text-slate-700">
													{t.type === "initial" || t.type === "out" ? t.reference.split('-')[0] : t.reference}
													{t.source === 'Manual Entry' && (() => {
														const vId = t.voucherId || t.cashVoucherId || t.bankVoucherId;
														if (!vId) return null;
														const v = cashVouchers.find(v => v._id === vId) || bankVouchers.find(v => v._id === vId);
														const vNumber = v ? v.voucherNumber : (t.cashVoucherNumber || t.bankVoucherNumber);
														const vSeq = v ? v.sequence : undefined;
														return vNumber ? (
															<span className="block text-[10px] text-slate-400 font-normal">
																Voucher: {fixBySequence(vNumber, vSeq)}
															</span>
														) : null;
													})()}
													{t.source === 'Sales Invoice' && t.voucherNumber && (
														<span className="block text-[10px] text-slate-400 font-normal">
															Voucher: {fixBySequence(t.voucherNumber, t.voucherSequence)}
														</span>
													)}
												</td>
												<td className="p-3.5 font-medium text-slate-600 capitalize whitespace-nowrap">
													{t.type === 'initial' || t.type === "out" ? `${t.method} - ${t.reference.split('-')[1] || ''}` : t.method}
												</td>
												<td className="p-3.5 whitespace-nowrap">
													{t.type === 'in' && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">IN</span>}
													{t.type === 'out' && <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">OUT</span>}
													{t.type === 'initial' && <span className="text-[10px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">INITIAL</span>}
												</td>
												<td className={`p-3.5 font-bold text-right whitespace-nowrap ${t.type === 'in' ? 'text-emerald-600' : t.type === 'out' ? 'text-rose-600' : 'text-sky-600'}`}>
													{t.amount.toLocaleString('id-ID')}
												</td>
												<td className="p-3.5 font-bold text-right whitespace-nowrap text-slate-700">
													{(t.balance || 0).toLocaleString('id-ID')}
												</td>
												<td className="p-3.5 text-right">
													<div className="flex items-center justify-end gap-1.5">
														{/* Print Voucher button */}
														{t.source !== 'Manual Entry' && t.voucherId && (
															<button
																type="button"
																title="Print Voucher"
																onClick={() => handlePrintInvoiceVoucher(t)}
																className="btn btn-sm btn-ghost btn-circle text-indigo-500 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
															>
																<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
																	<path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
																</svg>
															</button>
														)}
														{t.source === 'Manual Entry' && (
															<div className="dropdown dropdown-left z-50">
																<div tabIndex={0} role="button" className="btn btn-sm btn-ghost btn-circle" title="Opsi">
																	<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400 hover:text-slate-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
																		<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
																	</svg>
																</div>
																<ul tabIndex={0} className="dropdown-content menu p-2 shadow-xl bg-white rounded-xl w-52 border border-slate-100 z-[100] gap-1 text-left">
																	{(t.voucherId || t.cashVoucherId || t.bankVoucherId) && (
																		<li>
																			<button
																				type="button"
																				onClick={() => {
																					const idToPrint = t.voucherId || t.cashVoucherId || t.bankVoucherId;
																					if (t.cashVoucherId || (t.voucherId && t.method.toLowerCase().includes('cash'))) {
																						window.open(`/finance/voucher/cash/print/${idToPrint}`, '_blank');
																					} else if (t.bankVoucherId || t.voucherId) {
																						window.open(`/finance/voucher/bank/print/${idToPrint}`, '_blank');
																					}
																				}}
																				className="text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 text-xs font-semibold rounded-lg flex items-center gap-2 px-3 py-2"
																			>
																				<svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
																					<path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
																				</svg>
																				Print Voucher
																			</button>
																		</li>
																	)}
																	<li>
																		<button
																			type="button"
																			onClick={() => openEditModal(t)}
																			className="text-amber-700 hover:bg-amber-50 hover:text-amber-800 text-xs font-semibold rounded-lg flex items-center gap-2 px-3 py-2"
																		>
																			<svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
																				<path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
																			</svg>
																			Edit Entri
																		</button>
																	</li>
																	<li>
																		<button
																			type="button"
																			onClick={() => openDeleteModal(t)}
																			className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 text-xs font-semibold rounded-lg flex items-center gap-2 px-3 py-2"
																		>
																			<svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
																				<path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
																			</svg>
																			Hapus Entri
																		</button>
																	</li>
																</ul>
															</div>
														)}
													</div>
												</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>
					</div>

					{/* Modal Edit Manual Entry */}
					{showEditModal && (
						<div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/40 backdrop-blur-sm">
							<div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
								{/* Header */}
								<div className="px-4 py-3 border-b border-amber-100 bg-amber-50/60 flex items-center justify-between shrink-0">
									<div className="flex items-center gap-2">
										<span className="bg-amber-500 text-white rounded-md p-1">
											<svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
												<path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
											</svg>
										</span>
										<h2 className="text-sm font-bold text-slate-800">Edit Entri Manual</h2>
									</div>
									<button
										type="button"
										onClick={() => setShowEditModal(false)}
										className="text-slate-400 hover:text-slate-600 bg-slate-100 p-1.5 rounded-full transition-colors"
									>
										<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
											<path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
										</svg>
									</button>
								</div>

								<form onSubmit={handleEditSubmit} className="overflow-y-auto">
									<div className="p-4 space-y-3">
										{/* Jenis Aliran */}
										<div>
											<label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Jenis Aliran</label>
											<select
												required
												value={editData.type}
												onChange={(e) => setEditData({ ...editData, type: e.target.value })}
												className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-amber-400 bg-slate-50"
											>
												<option value="in">Uang Masuk (Cash In)</option>
												<option value="out">Uang Keluar (Cash Out)</option>
												<option value="initial">Saldo Awal</option>
											</select>
										</div>

										{/* Tipe Akun + Bank / Voucher */}
										<div className="grid grid-cols-2 gap-3">
											{editData.type !== 'initial' && (
												<div>
													<label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Tipe Akun</label>
													<select
														value={editData.accountType}
														onChange={(e) => setEditData({ ...editData, accountType: e.target.value })}
														className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-amber-400 bg-slate-50"
													>
														<option value="cash">Kas Tunai</option>
														<option value="bank">Rekening Bank</option>
													</select>
												</div>
											)}
											{editData.accountType === 'bank' && (
												<div className={editData.type === 'initial' ? 'col-span-2' : ''}>
													<label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Pilih Bank</label>
													<select
														required
														value={editData.bankAccountId}
														onChange={(e) => setEditData({ ...editData, bankAccountId: e.target.value })}
														className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-amber-400 bg-slate-50"
													>
														<option value="">-- Pilih Bank --</option>
														{bankAccounts.map(b => (
															<option key={b._id} value={b._id}>{b.accountName} ({b.bank})</option>
														))}
													</select>
												</div>
											)}

										</div>

										{/* Nominal */}
										<div>
											<label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Nominal (Rp)</label>
											<NumericFormat
												thousandSeparator="."
												decimalSeparator=","
												allowedDecimalSeparators={[",", "."]}
												allowNegative={false}
												value={editData.amount}
												onValueChange={(values) => setEditData({ ...editData, amount: values.value })}
												className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold focus:outline-amber-400 bg-slate-50"
												placeholder="Nominal"
											/>
										</div>

										{/* Tanggal + Jam side by side */}
										<div className="grid grid-cols-2 gap-3">
											<div>
												<label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Tanggal</label>
												<input
													type="date"
													required
													value={editData.date}
													onChange={(e) => setEditData({ ...editData, date: e.target.value })}
													className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-amber-400 bg-slate-50"
												/>
											</div>
											<div>
												<label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Jam (HH:MM)</label>
												<input
													type="time"
													required
													value={editData.time}
													onChange={(e) => setEditData({ ...editData, time: e.target.value })}
													className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-amber-400 bg-slate-50"
												/>
											</div>
										</div>

										{/* Referensi */}
										{editData.type !== 'initial' && (
											<div>
												<label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Referensi / Keterangan</label>
												<input
													type="text"
													required
													value={editData.reference}
													onChange={(e) => setEditData({ ...editData, reference: e.target.value })}
													className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-amber-400 bg-slate-50"
													placeholder="Contoh: Bayar Listrik Bulan Ini"
												/>
											</div>
										)}

										{/* Dari / Kepada */}
										{editData.type !== 'initial' && (
											editData.type === 'out' ? (
												<div>
													<label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Kepada</label>
													<input
														type="text"
														value={editData.to}
														onChange={(e) => setEditData({ ...editData, to: e.target.value })}
														className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-amber-400 bg-slate-50"
														placeholder="Ke Siapa"
													/>
												</div>
											) : (
												<div>
													<label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Dari</label>
													<input
														type="text"
														value={editData.from}
														onChange={(e) => setEditData({ ...editData, from: e.target.value })}
														className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-amber-400 bg-slate-50"
														placeholder="Dari Siapa"
													/>
												</div>
											)
										)}
									</div>

									{/* Footer Buttons */}
									<div className="px-4 py-3 border-t border-slate-100 bg-slate-50/60 flex justify-end gap-2 shrink-0">
										<button
											type="button"
											onClick={() => setShowEditModal(false)}
											disabled={editSaving}
											className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-50"
										>
											Batal
										</button>
										<button
											type="submit"
											disabled={editSaving}
											className="px-5 py-2 rounded-lg text-xs text-white font-semibold bg-amber-500 hover:bg-amber-600 shadow-sm shadow-amber-500/30 disabled:opacity-60 flex items-center gap-1.5 transition-all active:scale-95"
										>
											{editSaving && <span className="loading loading-spinner loading-xs" />}
											Simpan Perubahan
										</button>
									</div>
								</form>
							</div>
						</div>
					)}

					{/* Modal Catat Kas Manual */}
					{showModal && (
						<div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/40 backdrop-blur-sm">
							<div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100">
								<div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
									<h2 className="text-sm font-bold text-slate-800">Catat Kas (Manual)</h2>
									<button
										type="button"
										onClick={() => setShowModal(false)}
										className="text-slate-400 hover:text-slate-600 bg-slate-100 p-1.5 rounded-full transition-colors"
									>
										<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
											<path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
										</svg>
									</button>
								</div>

								<form onSubmit={handleAddSubmit} className="p-4 space-y-3">
									<div>
										<label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Jenis Aliran</label>
										<select
											required
											value={modalData.type}
											onChange={(e) => {
												setModalData({ ...modalData, type: e.target.value });
												onTransactionChange(e.target.value as 'in' | 'out' | 'initial');
											}}
											className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-indigo-500 bg-slate-50"
										>
											<option value="in">Uang Masuk (Cash In)</option>
											<option value="out">Uang Keluar (Cash Out)</option>
											<option value="initial">Saldo Awal</option>
										</select>
									</div>

									<div className="grid grid-cols-2 gap-3">
										{modalData.type !== 'initial' && (
											<div>
												<label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Tipe Akun</label>
												<select
													required={modalData.type !== 'initial'}
													value={modalData.accountType}
														onChange={(e) => {
														const newAccountType = e.target.value;
														setModalData({ ...modalData, accountType: newAccountType });
														if (modalData.type === 'out') fetchCashOutBalance(newAccountType, modalData.bankAccountId, modalData.date);
													}}
													className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-indigo-500 bg-slate-50"
												>
													<option value="cash">Kas Tunai</option>
													<option value="bank">Rekening Bank</option>
												</select>
											</div>
										)}
										{modalData.accountType === 'bank' && (
											<div className={modalData.type === 'initial' ? 'col-span-2' : ''}>
												<label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Pilih Bank</label>
												<select
													required
													onChange={(e) => {
														const newBankAccountId = e.target.value.split('-')[0];
														setModalData({ ...modalData, bankAccountId: newBankAccountId });
														if (modalData.type === 'initial' || modalData.type === 'in' || modalData.type === 'out') setSelectedReference(e.target.value.split('-')[1]);
														if (modalData.type === 'out') fetchCashOutBalance(modalData.accountType, newBankAccountId, modalData.date);
													}}
													className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-indigo-500 bg-slate-50"
												>
													<option value="">-- Pilih Bank --</option>
													{bankAccounts.map(b => (
														<option key={b._id} value={`${b._id}-${b.accountNumber}`}>{b.accountName}</option>
													))}
												</select>
											</div>
										)}


									</div>

									<div>
										<label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Nominal (Rp)</label>
										<NumericFormat
											thousandSeparator="."
											decimalSeparator=","
											allowedDecimalSeparators={[",", "."]}
											allowNegative={false}
											value={modalData.amount}
											onValueChange={(values) => setModalData({ ...modalData, amount: values.value })}
											className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold focus:outline-indigo-500 bg-slate-50"
											placeholder="Contoh: 150.000 atau 150.000,50"
										/>
									</div>

									<div className="grid grid-cols-2 gap-3">
										<div>
											<label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Tanggal</label>
											<input
												type="date"
												required
												value={modalData.date}
												onChange={(e) => {
													const newDate = e.target.value;
													setModalData({ ...modalData, date: newDate });
													if (modalData.type === 'out') fetchCashOutBalance(modalData.accountType, modalData.bankAccountId, newDate);
												}}
												className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-indigo-500 bg-slate-50"
											/>
										</div>
										<div>
											<label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Jam (HH:MM)</label>
											<input
												type="time"
												required
												value={modalData.time}
												onChange={(e) => setModalData({ ...modalData, time: e.target.value })}
												className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-indigo-500 bg-slate-50"
											/>
										</div>
									</div>

									{modalData.type !== 'initial' && (
										<div>
											<label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Referensi / Keterangan</label>
											<input
												type="text"
												required={modalData.type !== 'initial'}
												value={modalData.reference}
												onChange={(e) => setModalData({ ...modalData, reference: e.target.value })}
												className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-indigo-500 bg-slate-50"
												placeholder="Contoh: Bayar Listrik Bulan Ini"
											/>
										</div>
									)}

									{modalData.type !== 'initial' && (
										isCashOut ? (
											<div>
												<label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Kepada</label>
												<input
													type="text"
													value={modalData.to}
													onChange={(e) => setModalData({ ...modalData, to: e.target.value })}
													className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-indigo-500 bg-slate-50"
													placeholder="Contoh: Ke Siapa"
												/>
											</div>
										) : (
											<div>
												<label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Dari</label>
												<input
													type="text"
													value={modalData.from}
													onChange={(e) => setModalData({ ...modalData, from: e.target.value })}
													className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-indigo-500 bg-slate-50"
													placeholder="Contoh: Dari Siapa"
												/>
											</div>
										)
									)}

									{/* Tampilan Saldo Tersedia (hanya untuk Cash Out) */}
									{isCashOut && (
										<div>
											{cashOutBalanceLoading ? (
												<span className="text-xs text-slate-400 flex items-center gap-1">
													<span className="loading loading-spinner loading-xs"></span> Memuat saldo...
												</span>
											) : cashOutBalance !== null ? (
												<div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border ${
													(Number(modalData.amount) > 0 && Number(modalData.amount) > cashOutBalance)
														? 'bg-rose-50 border-rose-200 text-rose-700'
														: 'bg-emerald-50 border-emerald-200 text-emerald-700'
												}`}>
													<svg xmlns="http://www.w3.org/2000/svg" className="size-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
														<path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
													</svg>
													<span>Saldo tersedia: <strong>Rp {cashOutBalance.toLocaleString('id-ID')}</strong></span>
												</div>
											) : null}
											{cashOutBalance !== null && Number(modalData.amount) > 0 && Number(modalData.amount) > cashOutBalance && (
												<p className="text-[10px] text-rose-600 mt-1 font-medium">
													⚠ Pengeluaran melebihi saldo tersedia pada tanggal ini
												</p>
											)}
										</div>
									)}

									<div className="pt-2 flex justify-end gap-2">
										<button
											type="button"
											onClick={() => setShowModal(false)}
											disabled={addSaving}
											className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
										>
											Batal
										</button>
										<button
											type="submit"
											disabled={addSaving || (isCashOut && cashOutBalance !== null && Number(modalData.amount) > 0 && Number(modalData.amount) > cashOutBalance)}
											className="px-4 py-2 rounded-lg text-xs text-white font-semibold bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-600/30 disabled:opacity-60 flex items-center gap-1.5 transition-all active:scale-95"
										>
											{addSaving && <span className="loading loading-spinner loading-xs" />}
											Simpan Entri
										</button>
									</div>
								</form>
							</div>
						</div>
					)}

					{/* Modal Hapus Cashflow Manual dengan Approval Code */}
					{deleteModalOpen && deleteTargetTx && (
						<div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/40 backdrop-blur-sm">
							<div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100">
								<div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-rose-50/50">
									<div className="flex items-center gap-2.5">
										<div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
											<svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
												<path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
											</svg>
										</div>
										<div>
											<h2 className="text-sm font-bold text-slate-800">Hapus Entri Cashflow</h2>
											<p className="text-[11px] text-slate-500">Memerlukan otorisasi kode approval supervisor</p>
										</div>
									</div>
									<button
										type="button"
										onClick={() => {
											if (!deleteLoading) {
												setDeleteModalOpen(false);
												setDeleteTargetTx(null);
												setDeleteError('');
											}
										}}
										className="text-slate-400 hover:text-slate-600 bg-white p-1.5 rounded-full border border-slate-200 transition-colors"
									>
										<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
											<path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
										</svg>
									</button>
								</div>

								<form onSubmit={handleDeleteSubmit} className="p-5 space-y-4">
									{/* Ringkasan Transaksi */}
									<div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 space-y-2 text-xs">
										<div className="flex justify-between items-center text-slate-500">
											<span>Tanggal</span>
											<span className="font-semibold text-slate-700">
												{new Date(deleteTargetTx.date).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" })}
											</span>
										</div>
										<div className="flex justify-between items-center text-slate-500">
											<span>Referensi</span>
											<span className="font-semibold text-slate-700 truncate max-w-[200px]" title={deleteTargetTx.reference}>
												{deleteTargetTx.reference || '-'}
											</span>
										</div>
										<div className="flex justify-between items-center text-slate-500">
											<span>Tipe & Metode</span>
											<span className="font-semibold text-slate-700 uppercase">
												{deleteTargetTx.type} • {deleteTargetTx.method}
											</span>
										</div>
										<div className="flex justify-between items-center pt-1.5 border-t border-slate-200">
											<span className="font-bold text-slate-700">Nominal</span>
											<span className="text-sm font-extrabold text-rose-600">
												{IDR(deleteTargetTx.amount)}
											</span>
										</div>
									</div>

									{deleteError && (
										<div className="bg-rose-50 text-rose-700 p-3 rounded-xl border border-rose-200 text-xs font-semibold flex items-center gap-2">
											<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0 text-rose-500" viewBox="0 0 20 20" fill="currentColor">
												<path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
											</svg>
											<span>{deleteError}</span>
										</div>
									)}

									<div>
										<label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
											Kode Approval Supervisor <span className="text-rose-500">*</span>
										</label>
										<input
											type="password"
											autoFocus
											required
											value={deleteApprovalCode}
											onChange={(e) => {
												setDeleteApprovalCode(e.target.value);
												if (deleteError) setDeleteError('');
											}}
											placeholder="Masukkan kode approval..."
											className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-slate-50"
										/>
										<p className="text-[11px] text-slate-400 mt-1">
											Hanya supervisor atau admin dengan kode approval valid yang dapat menghapus entri ini.
										</p>
									</div>

									<div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
										<button
											type="button"
											onClick={() => {
												setDeleteModalOpen(false);
												setDeleteTargetTx(null);
												setDeleteError('');
											}}
											disabled={deleteLoading}
											className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
										>
											Batal
										</button>
										<button
											type="submit"
											disabled={deleteLoading}
											className="px-5 py-2 rounded-xl text-xs text-white font-semibold bg-rose-600 hover:bg-rose-700 shadow-sm shadow-rose-600/30 disabled:opacity-60 flex items-center gap-1.5 transition-all active:scale-95"
										>
											{deleteLoading && <span className="loading loading-spinner loading-xs" />}
											Hapus Entri
										</button>
									</div>
								</form>
							</div>
						</div>
					)}



				</div>
			</div>


		</>
	);
}