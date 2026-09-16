/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
"use client"

import { NumericFormat } from "react-number-format";
import { useState, useEffect, useCallback } from "react";
import useAuth from "@/store/auth";
import * as XLSX from 'xlsx';
import PrintableCashVoucher from "@/components/finance/PrintableCashVoucher";
import PrintableBankVoucher from "@/components/finance/PrintableBankVoucher";

function fixBySequence(voucher: string, sequence: number) {
  if (!voucher) return voucher;
  const [type, month, year, number] = voucher.split('/');
  return `${type}/${month}/${year}/${String(sequence || 1).padStart(3, "0")}`
}

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
	cashVoucherId?: string;
	cashVoucherNumber?: string;
	bankVoucherId?: string;
	bankVoucherNumber?: string;
	voucherNumber?: string;
};

type Voucher = {
	_id: string;
	voucherNumber: string;
	voucherType: string;
	sequence?: number;
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
	const [company, setCompany] = useState<any>(null);

	const [transactions, setTransactions] = useState<CashflowTransaction[]>([]);
	const [summary, setSummary] = useState<Summary>({ totalIn: 0, totalOut: 0, initialBalance: 0, netCashflow: 0, finalBalance: 0 });
	const [cashVouchers, setCashVouchers] = useState<Voucher[]>([]);
	const [bankVouchers, setBankVouchers] = useState<Voucher[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	const [isCashOut, setIsCashOut] = useState(false);
	const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

	const [selectedReference, setSelectedReference] = useState('');
	const [search, setSearch] = useState('');
	const [inlineSavingId, setInlineSavingId] = useState<string | null>(null);

	// Modal Add state
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
		cashVoucherId: '',
		bankVoucherId: '',
	});

	// Modal Edit state
	const [showEditModal, setShowEditModal] = useState(false);
	const [editData, setEditData] = useState({
		_id: '',
		type: 'in',
		amount: '',
		reference: '',
		date: new Date().toISOString().split('T')[0],
		accountType: 'cash',
		bankAccountId: '',
		from: '',
		to: '',
		cashVoucherId: '',
		bankVoucherId: '',
	});
	const [editSaving, setEditSaving] = useState(false);

	const [selectedTxs, setSelectedTxs] = useState<CashflowTransaction[]>([]);
	const [printVouchersList, setPrintVouchersList] = useState<Array<{voucher: any, type: 'cash'|'bank'}>>([]);

	function handlePrintInvoiceVoucher(t: CashflowTransaction) {
		const vNum = t.voucherNumber;
		if (!vNum) return;

		// Try to find in cashVouchers first, then bankVouchers
		const cashMatch = cashVouchers.find(v => v.voucherNumber === vNum);
		if (cashMatch) {
			setPrintVouchersList([{ voucher: cashMatch, type: 'cash' }]);
			return;
		}
		const bankMatch = bankVouchers.find(v => v.voucherNumber === vNum);
		if (bankMatch) {
			setPrintVouchersList([{ voucher: bankMatch, type: 'bank' }]);
			return;
		}

		// Voucher not loaded in state — inform user
		alert(`Voucher dengan nomor "${vNum}" tidak ditemukan dalam daftar voucher. Pastikan voucher telah dibuat.`);
	}

	function toggleSelectTx(t: CashflowTransaction) {
		if (selectedTxs.find(x => x._id === t._id)) {
			setSelectedTxs(selectedTxs.filter(x => x._id !== t._id));
		} else {
			setSelectedTxs([...selectedTxs, t]);
		}
	}
	
	function handleBulkPrint() {
		const toPrint: Array<{voucher: any, type: 'cash'|'bank'}> = [];
		const notFound: string[] = [];
		
		selectedTxs.forEach(t => {
			const vNum = t.voucherNumber;
			if (!vNum) return;
			const cashMatch = cashVouchers.find(v => v.voucherNumber === vNum);
			if (cashMatch) {
				toPrint.push({ voucher: cashMatch, type: 'cash' });
				return;
			}
			const bankMatch = bankVouchers.find(v => v.voucherNumber === vNum);
			if (bankMatch) {
				toPrint.push({ voucher: bankMatch, type: 'bank' });
				return;
			}
			notFound.push(vNum);
		});
		
		if (notFound.length > 0) {
			alert(`Voucher berikut tidak ditemukan: ${notFound.join(', ')}`);
		}
		
		if (toPrint.length > 0) {
			setPrintVouchersList(toPrint);
		}
	}

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

	const fetchVouchers = useCallback(async () => {
		if (!masterAccountId) return;
		try {
			const resCash = await fetch(`/api/web/cash-voucher?id=${masterAccountId}`);
			const dataCash = await resCash.json();
			if (!dataCash.error) setCashVouchers(dataCash.result || []);

			const resBank = await fetch(`/api/web/bank-voucher?id=${masterAccountId}`);
			const dataBank = await resBank.json();
			if (!dataBank.error) setBankVouchers(dataBank.result || []);
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
				txs.sort((a: any, b: any) => {
					const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
					if (dateDiff === 0) {
						if (a.type === 'initial') return -1;
						if (b.type === 'initial') return 1;
						return 0;
					}
					return dateDiff;
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

	useEffect(() => {
		if (hasHydrated && loggedIn) {
			fetchCompany();
			fetchBankAccounts();
			fetchVouchers();
			fetchCashflow();
		}
	}, [hasHydrated, loggedIn, fetchCashflow, fetchBankAccounts, fetchVouchers, fetchCompany]);

	const handleAddSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			const isInitial = modalData.type === 'initial';
			const additional: any = isInitial ? {} : (modalData.type === 'out' ? { to: modalData.to } : { from: modalData.from });
			const reference = isInitial && !modalData.reference ? `Saldo Awal-${selectedReference}` : modalData.reference;

			const res = await fetch('/api/web/finance/reports/cashflow', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					masterAccountId,
					accountType: modalData.accountType === 'cash' ? 'Cash' : 'Bank',
					bankAccountId: modalData.accountType === 'bank' ? modalData.bankAccountId : null,
					type: modalData.type,
					amount: Number(modalData.amount),
					reference: reference,
					date: modalData.date,
					recordedBy: null,
					cashVoucherId: modalData.accountType === 'cash' ? modalData.cashVoucherId : null,
					bankVoucherId: modalData.accountType === 'bank' ? modalData.bankVoucherId : null,
					additional
				})
			});
			const json = await res.json();
			if (json.error) {
				alert(json.message);
			}
			else {
				window.location.href = '/dashboard/finance/cashflow';
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

	const handleInlineVoucherChange = async (t: any, voucherId: string) => {
		setInlineSavingId(t._id);
		try {
			const res = await fetch('/api/web/finance/reports/cashflow', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id: t._id,
					masterAccountId,
					cashVoucherId: mode === 'cash' ? (voucherId || null) : undefined,
					bankVoucherId: mode === 'bank' ? (voucherId || null) : undefined,
				})
			});
			const json = await res.json();
			if (json.error) {
				alert(json.message);
			} else {
				fetchCashflow();
			}
		} catch (e: any) {
			alert('Error: ' + e.message);
		} finally {
			setInlineSavingId(null);
		}
	};

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
			accountType,
			bankAccountId: matchedBank?._id || '',
			from: t.from || '',
			to: t.to || '',
			cashVoucherId: t.cashVoucherId || '',
			bankVoucherId: t.bankVoucherId || '',
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
					from: editData.type === 'in' ? editData.from : undefined,
					to: editData.type === 'out' ? editData.to : undefined,
					cashVoucherId: editData.accountType === 'cash' ? editData.cashVoucherId : null,
					bankVoucherId: editData.accountType === 'bank' ? editData.bankVoucherId : null,
				})
			});
			const json = await res.json();
			if (json.error) {
				alert(json.message);
			} else {
				setShowEditModal(false);
				fetchCashflow();
			}
		} catch (e: any) {
			alert('Error: ' + e.message);
		} finally {
			setEditSaving(false);
		}
	};

	function toExcel() {
		if (transactions.length === 0) return alert('Tidak ada data untuk diexport');
		const data = transactions.map(t => ({
			'Tanggal': new Date(t.date).toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }),
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

						{selectedTxs.length > 0 && (
							<button
								type="button"
								onClick={handleBulkPrint}
								className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm active:scale-95 flex items-center gap-2"
							>
								<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
									<path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" />
								</svg>
								<span>Print {selectedTxs.length} Voucher</span>
							</button>
						)}

						<button
							type="button"
							onClick={() => {
								setModalData({ ...modalData, accountType: mode });
								setShowModal(true);
							}}
							className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/20 transition-all active:scale-95 flex items-center gap-1.5"
						>
							<span>+ Catat Kas Manual</span>
						</button>
					</div>
				</div>

				{/* Integrated Sticky Filter Bar */}
				<div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-slate-200/80 flex flex-wrap items-center gap-3.5 transition-all">

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
													const eligible = transactions.filter(t => t.source === 'Sales Invoice' && t.voucherNumber);
													setSelectedTxs(eligible);
												} else {
													setSelectedTxs([]);
												}
											}}
											checked={selectedTxs.length > 0 && selectedTxs.length === transactions.filter(t => t.source === 'Sales Invoice' && t.voucherNumber).length}
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
												{t.source === 'Sales Invoice' && t.voucherNumber ? (
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
												<span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
													t.source === 'Manual Entry'
														? 'bg-amber-100 text-amber-700'
														: 'bg-slate-100 text-slate-600'
												}`}>
													{t.source}
												</span>
											</td>
											<td className="p-3.5 font-medium text-slate-700">
												{t.type === "initial" ? t.reference.split('-')[0] : t.reference}
												{t.source === 'Manual Entry' && (t.cashVoucherNumber || t.bankVoucherNumber) && (
													<span className="block text-[10px] text-slate-400 font-normal">
														Voucher: {t.cashVoucherNumber || t.bankVoucherNumber}
													</span>
												)}
											</td>
											<td className="p-3.5 font-medium text-slate-600 capitalize whitespace-nowrap">
												{t.type === 'initial' ? `${t.method} - ${t.reference.split('-')[1] || ''}` : t.method}
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
													{/* Print Voucher button — untuk invoice dengan voucherNumber */}
													{t.source !== 'Manual Entry' && t.voucherNumber && (
														<button
															type="button"
															title={`Print Voucher: ${t.voucherNumber}`}
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
															{t.type !== 'initial' && (
																<li className="px-3 py-1.5 flex flex-col gap-1 border-t border-slate-100 mt-1 pt-2 pointer-events-none">
																	<span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-0 py-0 mb-1">Set Voucher</span>
																	<select
																		value={t.cashVoucherId || t.bankVoucherId || ''}
																		onChange={(e) => handleInlineVoucherChange(t, e.target.value)}
																		disabled={inlineSavingId === t._id}
																		className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-xs text-slate-600 focus:outline-indigo-500 bg-slate-50 pointer-events-auto"
																	>
																		<option value="">-- Tanpa Voucher --</option>
																		{mode === 'cash' 
																			? cashVouchers.filter(v => v.voucherType === (t.type === 'in' ? 'masuk' : 'keluar')).map(v => (
																				<option key={v._id} value={v._id}>{fixBySequence(v.voucherNumber, v.sequence)}</option>
																			))
																			: bankVouchers.filter(v => v.voucherType === (t.type === 'in' ? 'masuk' : 'keluar')).map(v => (
																				<option key={v._id} value={v._id}>{fixBySequence(v.voucherNumber, v.sequence)}</option>
																			))
																		}
																	</select>
																</li>
															)}
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
					<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
						<div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100">
							<div className="px-6 py-5 border-b border-amber-100 bg-amber-50/60 flex items-center justify-between">
								<div className="flex items-center gap-2">
									<span className="bg-amber-500 text-white rounded-lg p-1.5">
										<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
											<path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
										</svg>
									</span>
									<h2 className="text-lg font-bold text-slate-800">Edit Entri Manual</h2>
								</div>
								<button
									type="button"
									onClick={() => setShowEditModal(false)}
									className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full transition-colors"
								>
									<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
										<path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
									</svg>
								</button>
							</div>

							<form onSubmit={handleEditSubmit} className="p-6 space-y-4">
								<div>
									<label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">Jenis Aliran</label>
									<select
										required
										value={editData.type}
										onChange={(e) => setEditData({ ...editData, type: e.target.value })}
										className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-amber-400 bg-slate-50"
									>
										<option value="in">Uang Masuk (Cash In)</option>
										<option value="out">Uang Keluar (Cash Out)</option>
										<option value="initial">Saldo Awal</option>
									</select>
								</div>

								<div className="grid grid-cols-2 gap-4">
									{editData.type !== 'initial' && (
										<div>
											<label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">Tipe Akun</label>
											<select
												value={editData.accountType}
												onChange={(e) => setEditData({ ...editData, accountType: e.target.value })}
												className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-amber-400 bg-slate-50"
											>
												<option value="cash">Kas Tunai</option>
												<option value="bank">Rekening Bank</option>
											</select>
										</div>
									)}
									{editData.accountType === 'bank' && (
										<div className={editData.type === 'initial' ? 'col-span-2' : ''}>
											<label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">Pilih Bank</label>
											<select
												required
												value={editData.bankAccountId}
												onChange={(e) => setEditData({ ...editData, bankAccountId: e.target.value })}
												className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-amber-400 bg-slate-50"
											>
												<option value="">-- Pilih Bank --</option>
												{bankAccounts.map(b => (
													<option key={b._id} value={b._id}>{b.accountName} ({b.bank})</option>
												))}
											</select>
										</div>
									)}
									
									{editData.type !== 'initial' && editData.accountType === 'cash' && (
										<div>
											<label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">Cash Voucher</label>
											<select
												value={editData.cashVoucherId}
												onChange={(e) => setEditData({ ...editData, cashVoucherId: e.target.value })}
												className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-amber-400 bg-slate-50"
											>
												<option value="">-- Tanpa Voucher --</option>
												{cashVouchers
													.filter(v => v.voucherType === (editData.type === 'in' ? 'masuk' : 'keluar'))
													.map(v => (
													<option key={v._id} value={v._id}>{fixBySequence(v.voucherNumber, v.sequence)}</option>
												))}
											</select>
										</div>
									)}

									{editData.type !== 'initial' && editData.accountType === 'bank' && (
										<div>
											<label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">Bank Voucher</label>
											<select
												value={editData.bankVoucherId}
												onChange={(e) => setEditData({ ...editData, bankVoucherId: e.target.value })}
												className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-amber-400 bg-slate-50"
											>
												<option value="">-- Tanpa Voucher --</option>
												{bankVouchers
													.filter(v => v.voucherType === (editData.type === 'in' ? 'masuk' : 'keluar'))
													.map(v => (
													<option key={v._id} value={v._id}>{fixBySequence(v.voucherNumber, v.sequence)}</option>
												))}
											</select>
										</div>
									)}
								</div>

								<div>
									<label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">Nominal (Rp)</label>
									<NumericFormat
										thousandSeparator="."
										decimalSeparator=","
										decimalScale={2}
										fixedDecimalScale
										allowNegative={false}
										value={editData.amount}
										onValueChange={(values) => setEditData({ ...editData, amount: values.floatValue?.toString() ?? '' })}
										className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-amber-400 bg-slate-50"
										placeholder="Contoh: 150000"
									/>
								</div>

								{editData.type !== 'initial' && (
									<div>
										<label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">Referensi / Keterangan</label>
										<input
											type="text"
											required
											value={editData.reference}
											onChange={(e) => setEditData({ ...editData, reference: e.target.value })}
											className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-amber-400 bg-slate-50"
											placeholder="Contoh: Bayar Listrik Bulan Ini"
										/>
									</div>
								)}

								<div>
									<label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">Tanggal</label>
									<input
										type="date"
										required
										value={editData.date}
										onChange={(e) => setEditData({ ...editData, date: e.target.value })}
										className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-amber-400 bg-slate-50"
									/>
								</div>

								{editData.type !== 'initial' && (
									editData.type === 'out' ? (
										<div>
											<label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">Kepada</label>
											<input
												type="text"
												value={editData.to}
												onChange={(e) => setEditData({ ...editData, to: e.target.value })}
												className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-amber-400 bg-slate-50"
												placeholder="Contoh: Ke Siapa"
											/>
										</div>
									) : (
										<div>
											<label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">Dari</label>
											<input
												type="text"
												value={editData.from}
												onChange={(e) => setEditData({ ...editData, from: e.target.value })}
												className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-amber-400 bg-slate-50"
												placeholder="Contoh: Dari Siapa"
											/>
										</div>
									)
								)}

								<div className="pt-4 flex justify-end gap-3">
									<button
										type="button"
										onClick={() => setShowEditModal(false)}
										disabled={editSaving}
										className="px-5 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
									>
										Batal
									</button>
									<button
										type="submit"
										disabled={editSaving}
										className="px-6 py-2.5 rounded-xl text-white font-semibold shadow-md focus:outline-none transition-all active:scale-95 bg-amber-500 hover:bg-amber-600 shadow-amber-500/30 disabled:opacity-60 flex items-center gap-2"
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
					<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
						<div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100">
							<div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
								<h2 className="text-lg font-bold text-slate-800">Catat Kas (Manual)</h2>
								<button
									type="button"
									onClick={() => setShowModal(false)}
									className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full transition-colors"
								>
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
									{modalData.type !== 'initial' && (
										<div>
											<label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">Tujuan/Sumber</label>
											<select
												required={modalData.type !== 'initial'}
												value={modalData.accountType}
												onChange={(e) => setModalData({ ...modalData, accountType: e.target.value })}
												className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-indigo-500 bg-slate-50"
											>
												<option value="cash">Kas Tunai</option>
												<option value="bank">Rekening Bank</option>
											</select>
										</div>
									)}
									{modalData.accountType === 'bank' && (
										<div className={modalData.type === 'initial' ? 'col-span-2' : ''}>
											<label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">Pilih Bank</label>
											<select
												required
												onChange={(e) => {
													setModalData({ ...modalData, bankAccountId: e.target.value.split('-')[0] });
													if (modalData.type === 'initial') setSelectedReference(e.target.value.split('-')[1]);
												}}
												className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-indigo-500 bg-slate-50"
											>
												<option value="">-- Pilih Bank --</option>
												{bankAccounts.map(b => (
													<option key={b._id} value={`${b._id}-${b.accountNumber}`}>{b.accountName}</option>
												))}
											</select>
										</div>
									)}

									{modalData.type !== 'initial' && modalData.accountType === 'cash' && (
										<div>
											<label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">Cash Voucher</label>
											<select
												value={modalData.cashVoucherId}
												onChange={(e) => setModalData({ ...modalData, cashVoucherId: e.target.value })}
												className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-indigo-500 bg-slate-50"
											>
												<option value="">-- Tanpa Voucher --</option>
												{cashVouchers
													.filter(v => v.voucherType === (modalData.type === 'in' ? 'masuk' : 'keluar'))
													.map(v => (
													<option key={v._id} value={v._id}>{fixBySequence(v.voucherNumber, v.sequence)}</option>
												))}
											</select>
										</div>
									)}

									{modalData.type !== 'initial' && modalData.accountType === 'bank' && (
										<div>
											<label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">Bank Voucher</label>
											<select
												value={modalData.bankVoucherId}
												onChange={(e) => setModalData({ ...modalData, bankVoucherId: e.target.value })}
												className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-indigo-500 bg-slate-50"
											>
												<option value="">-- Tanpa Voucher --</option>
												{bankVouchers
													.filter(v => v.voucherType === (modalData.type === 'in' ? 'masuk' : 'keluar'))
													.map(v => (
													<option key={v._id} value={v._id}>{fixBySequence(v.voucherNumber, v.sequence)}</option>
												))}
											</select>
										</div>
									)}
								</div>

								<div>
									<label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">Nominal (Rp)</label>
									<NumericFormat
										thousandSeparator="."
										decimalSeparator=","
										decimalScale={2}
										fixedDecimalScale
										allowNegative={false}
										value={modalData.amount}
										onValueChange={(values) => setModalData({ ...modalData, amount: values.floatValue?.toString() ?? "" })}
										className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-indigo-500 bg-slate-50"
										placeholder="Contoh: 150000"
									/>
								</div>

								{modalData.type !== 'initial' && (
									<div>
										<label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">Referensi / Keterangan</label>
										<input
											type="text"
											required={modalData.type !== 'initial'}
											value={modalData.reference}
											onChange={(e) => setModalData({ ...modalData, reference: e.target.value })}
											className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-indigo-500 bg-slate-50"
											placeholder="Contoh: Bayar Listrik Bulan Ini"
										/>
									</div>
								)}

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

								{modalData.type !== 'initial' && (
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
								)}

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

				{/* ===== Print Preview Modal untuk Invoice Voucher ===== */}
				{printVouchersList.length > 0 && (
					<div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm print:hidden">
						<div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-100 p-6">
							<div className="flex items-center gap-3 mb-4">
								<span className="bg-indigo-100 text-indigo-700 rounded-xl p-2">
									<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
										<path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
									</svg>
								</span>
								<div>
									<h3 className="text-base font-bold text-slate-800">Print Voucher</h3>
									<p className="text-xs text-slate-500">
										{printVouchersList.length === 1 
											? <span>No. Voucher: <span className="font-semibold text-indigo-600">{fixBySequence(printVouchersList[0].voucher.voucherNumber, printVouchersList[0].voucher.sequence)}</span></span>
											: <span><span className="font-semibold text-indigo-600">{printVouchersList.length}</span> Voucher Terpilih</span>
										}
									</p>
								</div>
							</div>
							<p className="text-sm text-slate-600 mb-5">
								{printVouchersList.length === 1 
									? <>Voucher <span className="font-semibold">{printVouchersList[0].type === 'cash' ? 'Cash' : 'Bank'}</span> akan dicetak.</>
									: <>{printVouchersList.length} Voucher akan dicetak sekaligus.</>
								}
								<br/>Klik <strong>Print</strong> untuk melanjutkan.
							</p>
							<div className="flex justify-end gap-3">
								<button
									type="button"
									onClick={() => setPrintVouchersList([])}
									className="px-4 py-2 rounded-xl text-slate-600 font-semibold hover:bg-slate-100 transition-colors text-sm"
								>
									Batal
								</button>
								<button
									type="button"
									onClick={() => setTimeout(() => window.print(), 100)}
									className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md shadow-indigo-600/20 transition-all active:scale-95 text-sm flex items-center gap-2"
								>
									<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
										<path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
									</svg>
									Print
								</button>
							</div>
						</div>
					</div>
				)}

				{/* Hidden print-only voucher area */}
				{printVouchersList.length > 0 && (
					<div className="hidden print:block">
						{printVouchersList.map((pv, idx) => (
							<div key={pv.voucher._id + idx} style={idx < printVouchersList.length - 1 ? { pageBreakAfter: 'always' } : {}}>
								{pv.type === 'cash'
									? <PrintableCashVoucher voucher={pv.voucher} isLast={true} company={company} />
									: <PrintableBankVoucher voucher={pv.voucher} isLast={true} company={company} />
								}
							</div>
						))}
					</div>
				)}

			</div>
		</div>

		{/* Hidden print-only voucher area — di luar container print:hidden */}
		{printVouchersList.length > 0 && (
			<div className="hidden print:block">
				{printVouchersList.map((pv, idx) => (
					<div key={pv.voucher._id + idx} style={idx < printVouchersList.length - 1 ? { pageBreakAfter: 'always' } : {}}>
						{pv.type === 'cash'
							? <PrintableCashVoucher voucher={pv.voucher} isLast={true} company={company} />
							: <PrintableBankVoucher voucher={pv.voucher} isLast={true} company={company} />
						}
					</div>
				))}
			</div>
		)}
		</>
	);
}