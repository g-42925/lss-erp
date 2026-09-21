import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import Companie from "@/models/Companie";
import BankAccount from "@/models/BankAccount";
import Invoice from "@/models/Invoice";
import Purchase from "@/models/Purchase";
import Log from "@/models/Log";
import Cashflow from "@/models/Cashflow";
import Order from "@/models/Order";
import ServiceOrder from "@/models/ServiceOrder";
import Customer from "@/models/Customer";
import CashVoucher from "@/models/CashVoucher";
import BankVoucher from "@/models/BankVoucher";
import mongoose from "mongoose";

export async function GET(request: NextRequest) {
	try {
		await connectToDatabase();

		const url = new URL(request.url);
		const id = url.searchParams.get("id"); // masterAccountId
		const mode = url.searchParams.get("mode") || "cash"; // 'cash' or 'bank'
		const startDate = url.searchParams.get("startDate");
		const endDate = url.searchParams.get("endDate");
		const bankAccountId = url.searchParams.get("bankAccountId");
		const search = url.searchParams.get("search")?.trim().toLowerCase() || "";

		if (!id) {
			return NextResponse.json({
				noResult: true,
				message: "Missing masterAccountId",
				result: null,
				error: true,
			});
		}

		const company = await Companie.findOne({ masterAccountId: id }).lean();
		if (!company) {
			return NextResponse.json({
				noResult: true,
				message: "Company not found",
				result: null,
				error: true,
			});
		}

		const bankAccounts = await BankAccount.find({ addedBy: company._id }).lean();

		const isCashMethod = (method: string) => {
			if (!method) return false;
			const m = method.toLowerCase();
			return m.includes('cash') || m === 'tunai';
		};

		const extractAccountNumberFromMethod = (method: string): string => {
			if (!method) return '';
			const parts = method.split(' - ');
			return parts.length > 1 ? parts[1].trim() : '';
		};

		const isBankMethod = (method: string, targetAccountNumber?: string) => {
			if (!method) return false;
			if (targetAccountNumber) {
				return extractAccountNumberFromMethod(method) === targetAccountNumber;
			}
			return method.includes(' - ');
		};

		let targetAccountNumber: string | undefined = undefined;
		if (mode === 'bank' && bankAccountId) {
			const targetBank = bankAccounts.find(b => b._id.toString() === bankAccountId);
			targetAccountNumber = targetBank?.accountNumber;
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let dateFilter: any = {};
		if (startDate || endDate) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const df: any = {};
			if (startDate) df.$gte = new Date(startDate);
			if (endDate) {
				const eDate = new Date(endDate);
				eDate.setHours(23, 59, 59, 999);
				df.$lte = eDate;
			}
			dateFilter = df;
		}

		// 1. Fetch Invoices
		const invoices = await Invoice.find({
			companyId: company._id,
			paymentHistory: { $exists: true, $not: { $size: 0 } }
		}).lean();

		// OPTIMASI: Kumpulkan semua kunci pencarian untuk Batch Fetching
		const salesOrderNumbers = Array.from(new Set(invoices.map(i => i.salesOrderNumber).filter(Boolean)));

		// Kumpulkan voucherId yang dibutuhkan
		const cashVoucherIds: string[] = [];
		const bankVoucherIds: string[] = [];

		invoices.forEach(inv => {
			inv.paymentHistory?.forEach((p: any) => {
				if (!p.reverted && !p.voucherNumber && p.voucherId) {
					if (mode === 'cash') cashVoucherIds.push(p.voucherId);
					else bankVoucherIds.push(p.voucherId);
				}
			});
		});

		// Jalankan Query Pendukung secara Pararel (Batch Processing)
		const [orders, serviceOrders, cashVouchers, bankVouchers] = await Promise.all([
			Order.find({ salesOrderNumber: { $in: salesOrderNumbers } }).lean(),
			ServiceOrder.find({ salesOrderNumber: { $in: salesOrderNumbers } }).lean(),
			cashVoucherIds.length ? CashVoucher.find({ _id: { $in: cashVoucherIds } }).select('voucherNumber sequence').lean() : [],
			bankVoucherIds.length ? BankVoucher.find({ _id: { $in: bankVoucherIds } }).select('voucherNumber sequence').lean() : []
		]);

		// Kumpulkan Customer ID
		const customerIds = Array.from(new Set([
			...orders.map(o => o.customerId).filter(Boolean),
			...serviceOrders.map(s => s.customerId).filter(Boolean)
		]));

		const customers = customerIds.length
			? await Customer.find({ _id: { $in: customerIds } }).select('bussinessName name').lean()
			: [];

		// Buat Map di Memory untuk lookup Instan (O(1) time complexity)
		const orderMap = new Map([...orders, ...serviceOrders].map(o => [o.salesOrderNumber, o]));
		const customerMap = new Map(customers.map(c => [c._id.toString(), c.bussinessName || c.name]));
		const cashVoucherMap = new Map(cashVouchers.map(v => [v._id.toString(), v]));
		const bankVoucherMap = new Map(bankVouchers.map(v => [v._id.toString(), v]));

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const allTransactions: any[] = [];

		// Olah Invoices di Memory (Tanpa query DB lagi)
		for (const inv of invoices) {
			if (!inv.paymentHistory) continue;

			const order = orderMap.get(inv.salesOrderNumber);
			let fromName = 'Customer';
			if (order) {
				if (order.customCustomer?.name) {
					fromName = order.customCustomer.name;
				} else if (order.customerId) {
					fromName = customerMap.get(order.customerId.toString()) || fromName;
				}
			}

			for (const payment of inv.paymentHistory) {
				if (payment.reverted) continue;

				const paymentDate = new Date(payment.date);
				if (dateFilter && Object.keys(dateFilter).length > 0) {
					if (dateFilter.$gte && paymentDate < dateFilter.$gte) continue;
					if (dateFilter.$lte && paymentDate > dateFilter.$lte) continue;
				}

				const pMethod = payment.method || '';
				const include = mode === 'cash'
					? isCashMethod(pMethod)
					: isBankMethod(pMethod, targetAccountNumber);

				if (include) {
					let fetchedVoucherNumber = payment.voucherNumber ?? null;
					let fetchedSequence = undefined;

					if (!fetchedVoucherNumber && payment.voucherId) {
						const voucherMap = mode === 'cash' ? cashVoucherMap : bankVoucherMap;
						const v = voucherMap.get(payment.voucherId.toString());
						if (v) {
							fetchedVoucherNumber = v.voucherNumber;
							fetchedSequence = v.sequence;
						}
					}

					allTransactions.push({
						_id: new mongoose.Types.ObjectId().toString(),
						date: paymentDate,
						amount: payment.amount,
						method: payment.method,
						reference: inv.invoiceNumber,
						source: 'Sales Invoice',
						type: 'in',
						from: fromName,
						bankVoucher: inv.bankVoucher ?? '-',
						voucherNumber: fetchedVoucherNumber,
						voucherSequence: fetchedSequence,
						voucherId: payment.voucherId
					});
				}
			}
		}

		// 2. Fetch Purchases & Logs (Pararel Query)
		const purchases = await Purchase.find({ companyId: company._id }).select('_id purchaseOrderNumber').lean();
		const purchaseIds = purchases.map((p) => p._id);

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const logQuery: any = { purchaseId: { $in: purchaseIds }, amount: { $gt: 0 } };
		if (Object.keys(dateFilter).length > 0) logQuery.date = dateFilter;

		const logs = await Log.find(logQuery).lean();
		const purchaseMap = new Map(purchases.map(p => [p._id.toString(), p.purchaseOrderNumber]));

		logs.forEach((log) => {
			const pMethod = log.paymentMethod || '';
			const include = mode === 'cash'
				? isCashMethod(pMethod)
				: isBankMethod(pMethod, targetAccountNumber);

			if (include) {
				const poNumber = purchaseMap.get(log.purchaseId.toString());
				allTransactions.push({
					_id: log._id.toString(),
					date: log.date,
					amount: log.type === 'adjustment' ? log.amount : Math.abs(log.amount),
					method: log.paymentMethod,
					reference: (log.paymentNumber || '') + (poNumber ? ` (${poNumber})` : ''),
					source: 'Purchase Payment',
					type: 'out',
					to: log.to?.name
				});
			}
		});

		// 3. Fetch Manual Cashflow Logs
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const manualQuery: any = { companyId: company._id };
		if (mode === 'cash') {
			manualQuery.accountType = 'Cash';
		} else {
			manualQuery.accountType = 'Bank';
			if (bankAccountId) {
				manualQuery.bankAccountId = new mongoose.Types.ObjectId(bankAccountId);
			}
		}
		if (Object.keys(dateFilter).length > 0) manualQuery.date = dateFilter;

		const manualLogs = await Cashflow.find(manualQuery)
			.populate('bankAccountId', 'bank')
			.populate('cashVoucherId', 'voucherNumber')
			.populate('bankVoucherId', 'voucherNumber')
			.lean();

		manualLogs.forEach(entry => {
			let methodName = 'Cash';
			if (entry.accountType === 'Bank') {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				methodName = entry.bankAccountId ? (entry.bankAccountId as any).bank : 'Bank';
			}

			allTransactions.push({
				_id: entry._id.toString(),
				date: entry.date,
				amount: entry.amount,
				method: methodName,
				reference: entry.reference,
				source: 'Manual Entry',
				type: entry.type,
				from: entry.from,
				to: entry.to,
				cashVoucherId: entry.cashVoucherId ? (entry.cashVoucherId as any)._id : null,
				cashVoucherNumber: entry.cashVoucherId ? (entry.cashVoucherId as any).voucherNumber : null,
				bankVoucherId: entry.bankVoucherId ? (entry.bankVoucherId as any)._id : null,
				bankVoucherNumber: entry.bankVoucherId ? (entry.bankVoucherId as any).voucherNumber : null,
			});
		});

		// 4. Filtering Search & Sorting
		let finalTransactions = allTransactions;
		if (search) {
			finalTransactions = allTransactions.filter(t =>
				String(t.from || '').toLowerCase().includes(search) ||
				String(t.to || '').toLowerCase().includes(search) ||
				String(t.reference || '').toLowerCase().includes(search)
			);
		}

		finalTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

		let totalIn = 0;
		let totalOut = 0;
		let initialBalance = 0;

		finalTransactions.forEach(t => {
			if (t.type === 'in') totalIn += t.amount;
			else if (t.type === 'out') totalOut += t.amount;
			else if (t.type === 'initial') initialBalance += t.amount;
		});

		const netCashflow = totalIn - totalOut;

		return NextResponse.json({
			noResult: finalTransactions.length === 0,
			message: "success",
			result: {
				transactions: finalTransactions,
				summary: {
					totalIn,
					totalOut,
					initialBalance,
					netCashflow,
					finalBalance: initialBalance + netCashflow
				}
			},
			error: false,
		});
	}
	catch (e: unknown) {
		console.error("Cashflow API Error:", e);
		return NextResponse.json({
			noResult: true,
			message: e instanceof Error ? e.message : "Something went wrong",
			result: null,
			error: true,
		});
	}
}