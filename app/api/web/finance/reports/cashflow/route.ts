/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
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
import CashVoucher from "@/models/VoucherCash";
import BankVoucher from "@/models/VoucherBank";
import User from "@/models/User";
import mongoose from "mongoose";

// export async function GET(request: NextRequest) {
// 	try {
// 		await connectToDatabase();

// 		const url = new URL(request.url);
// 		const id = url.searchParams.get("id"); // masterAccountId
// 		const mode = url.searchParams.get("mode") || "cash"; // 'cash' or 'bank'
// 		const startDate = url.searchParams.get("startDate");
// 		const endDate = url.searchParams.get("endDate");
// 		const bankAccountId = url.searchParams.get("bankAccountId");
// 		const search = url.searchParams.get("search")?.trim().toLowerCase() || "";

// 		if (!id) {
// 			return NextResponse.json({
// 				noResult: true,
// 				message: "Missing masterAccountId",
// 				result: null,
// 				error: true,
// 			});
// 		}

// 		const company = await Companie.findOne({ masterAccountId: id }).lean();
// 		if (!company) {
// 			return NextResponse.json({
// 				noResult: true,
// 				message: "Company not found",
// 				result: null,
// 				error: true,
// 			});
// 		}

// 		const bankAccounts = await BankAccount.find({ addedBy: company._id }).lean();

// 		const isCashMethod = (method: string) => {
// 			if (!method) return false;
// 			const m = method.toLowerCase();
// 			return m.includes('cash') || m === 'tunai';
// 		};

// 		const extractAccountNumberFromMethod = (method: string): string => {
// 			if (!method) return '';
// 			const parts = method.split(' - ');
// 			return parts.length > 1 ? parts[1].trim() : '';
// 		};

// 		const isBankMethod = (method: string, targetAccountNumber?: string) => {
// 			if (!method) return false;
// 			if (targetAccountNumber) {
// 				return extractAccountNumberFromMethod(method) === targetAccountNumber;
// 			}
// 			return method.includes(' - ');
// 		};

// 		let targetAccountNumber: string | undefined = undefined;
// 		if (mode === 'bank' && bankAccountId) {
// 			const targetBank = bankAccounts.find(b => b._id.toString() === bankAccountId);
// 			targetAccountNumber = targetBank?.accountNumber;
// 		}

// 		// eslint-disable-next-line @typescript-eslint/no-explicit-any
// 		let dateFilter: any = {};
// 		if (startDate || endDate) {
// 			// eslint-disable-next-line @typescript-eslint/no-explicit-any
// 			const df: any = {};
// 			if (startDate) df.$gte = new Date(startDate);
// 			if (endDate) {
// 				const eDate = new Date(endDate);
// 				eDate.setHours(23, 59, 59, 999);
// 				df.$lte = eDate;
// 			}
// 			dateFilter = df;
// 		}

// 		// 1. Fetch Invoices
// 		const invoices = await Invoice.find({
// 			companyId: company._id,
// 			paymentHistory: { $exists: true, $not: { $size: 0 } }
// 		}).lean();

// 		// OPTIMASI: Kumpulkan semua kunci pencarian untuk Batch Fetching
// 		const salesOrderNumbers = Array.from(new Set(invoices.map(i => i.salesOrderNumber).filter(Boolean)));

// 		// Kumpulkan voucherId yang dibutuhkan
// 		const cashVoucherIds: string[] = [];
// 		const bankVoucherIds: string[] = [];

// 		invoices.forEach(inv => {
// 			inv.paymentHistory?.forEach((p: any) => {
// 				if (!p.reverted && !p.voucherNumber && p.voucherId) {
// 					if (mode === 'cash') cashVoucherIds.push(p.voucherId);
// 					else bankVoucherIds.push(p.voucherId);
// 				}
// 			});
// 		});

// 		// Jalankan Query Pendukung secara Pararel (Batch Processing)
// 		const [orders, serviceOrders, cashVouchers, bankVouchers] = await Promise.all([
// 			Order.find({ salesOrderNumber: { $in: salesOrderNumbers } }).lean(),
// 			ServiceOrder.find({ salesOrderNumber: { $in: salesOrderNumbers } }).lean(),
// 			cashVoucherIds.length ? CashVoucher.find({ _id: { $in: cashVoucherIds } }).select('voucherNumber sequence').lean() : [],
// 			bankVoucherIds.length ? BankVoucher.find({ _id: { $in: bankVoucherIds } }).select('voucherNumber sequence').lean() : []
// 		]);

// 		// Kumpulkan Customer ID
// 		const customerIds = Array.from(new Set([
// 			...orders.map(o => o.customerId).filter(Boolean),
// 			...serviceOrders.map(s => s.customerId).filter(Boolean)
// 		]));

// 		const customers = customerIds.length
// 			? await Customer.find({ _id: { $in: customerIds } }).select('bussinessName name').lean()
// 			: [];

// 		// Buat Map di Memory untuk lookup Instan (O(1) time complexity)
// 		const orderMap = new Map([...orders, ...serviceOrders].map(o => [o.salesOrderNumber, o]));
// 		const customerMap = new Map(customers.map(c => [c._id.toString(), c.bussinessName || c.name]));
// 		const cashVoucherMap = new Map(cashVouchers.map(v => [v._id.toString(), v]));
// 		const bankVoucherMap = new Map(bankVouchers.map(v => [v._id.toString(), v]));

// 		// eslint-disable-next-line @typescript-eslint/no-explicit-any
// 		const allTransactions: any[] = [];

// 		// Olah Invoices di Memory (Tanpa query DB lagi)
// 		for (const inv of invoices) {
// 			if (!inv.paymentHistory) continue;

// 			const order = orderMap.get(inv.salesOrderNumber);
// 			let fromName = 'Customer';
// 			if (order) {
// 				if (order.customCustomer?.name) {
// 					fromName = order.customCustomer.name;
// 				} else if (order.customerId) {
// 					fromName = customerMap.get(order.customerId.toString()) || fromName;
// 				}
// 			}

// 			for (const payment of inv.paymentHistory) {
// 				if (payment.reverted) continue;

// 				const paymentDate = new Date(payment.date);
// 				if (dateFilter && Object.keys(dateFilter).length > 0) {
// 					if (dateFilter.$gte && paymentDate < dateFilter.$gte) continue;
// 					if (dateFilter.$lte && paymentDate > dateFilter.$lte) continue;
// 				}

// 				const pMethod = payment.method || '';
// 				const include = mode === 'cash'
// 					? isCashMethod(pMethod)
// 					: isBankMethod(pMethod, targetAccountNumber);

// 				if (include) {
// 					let fetchedVoucherNumber = payment.voucherNumber ?? null;
// 					let fetchedSequence = undefined;

// 					if (!fetchedVoucherNumber && payment.voucherId) {
// 						const voucherMap = mode === 'cash' ? cashVoucherMap : bankVoucherMap;
// 						const v = voucherMap.get(payment.voucherId.toString());
// 						if (v) {
// 							fetchedVoucherNumber = v.voucherNumber;
// 							fetchedSequence = v.sequence;
// 						}
// 					}

// 					allTransactions.push({
// 						_id: new mongoose.Types.ObjectId().toString(),
// 						date: paymentDate,
// 						amount: payment.amount,
// 						method: payment.method,
// 						reference: inv.invoiceNumber,
// 						source: 'Sales Invoice',
// 						type: 'in',
// 						from: fromName,
// 						bankVoucher: inv.bankVoucher ?? '-',
// 						voucherNumber: fetchedVoucherNumber,
// 						voucherSequence: fetchedSequence,
// 						voucherId: payment.voucherId
// 					});
// 				}
// 			}
// 		}

// 		// 2. Fetch Purchases & Logs (Pararel Query)
// 		const purchases = await Purchase.find({ companyId: company._id }).select('_id purchaseOrderNumber').lean();
// 		const purchaseIds = purchases.map((p) => p._id);

// 		// eslint-disable-next-line @typescript-eslint/no-explicit-any
// 		const logQuery: any = {
// 			purchaseId: { $in: purchaseIds },
// 			amount: { $gt: 0 },
// 			// Hanya tampilkan Log pembayaran pertama (saat PO dibuat).
// 			// Pembayaran hutang lanjutan (initial: false) sudah tercatat di
// 			// Cashflow collection sehingga tidak perlu ditampilkan dari Log agar tidak double.
// 			initial: true
// 		};
// 		if (Object.keys(dateFilter).length > 0) logQuery.date = dateFilter;

// 		// Filter log berdasarkan mode (cash/bank) dan bankAccountId jika ada
// 		if (mode === 'cash') {
// 			// Cash: paymentMethod adalah 'Cash' atau 'Tunai'
// 			logQuery.paymentMethod = { $regex: /^(cash|tunai)$/i };
// 		} else {
// 			// Bank: punya bankAccountId (data baru), atau paymentMethod bukan Cash (data lama)
// 			if (bankAccountId) {
// 				logQuery.$or = [
// 					{ bankAccountId: new mongoose.Types.ObjectId(bankAccountId) },
// 					// Fallback data lama: belum ada bankAccountId, cocokkan dari paymentMethod
// 					{
// 						bankAccountId: { $exists: false },
// 						paymentMethod: targetAccountNumber
// 							? { $regex: targetAccountNumber }
// 							: { $not: /^(cash|tunai)$/i }
// 					}
// 				];
// 			} else {
// 				// Semua bank: punya bankAccountId ATAU paymentMethod bukan Cash
// 				logQuery.$or = [
// 					{ bankAccountId: { $exists: true, $ne: null } },
// 					{ bankAccountId: { $in: [null, undefined] }, paymentMethod: { $not: /^(cash|tunai)$/i } }
// 				];
// 			}
// 		}

// 		const logs = await Log.find(logQuery).lean();
// 		const purchaseMap = new Map(purchases.map(p => [p._id.toString(), p.purchaseOrderNumber]));

// 		// Semua log sudah difilter di query, langsung push ke allTransactions
// 		logs.forEach((log) => {
// 			const poNumber = purchaseMap.get(log.purchaseId.toString());
// 			allTransactions.push({
// 				_id: log._id.toString(),
// 				date: log.date,
// 				amount: log.type === 'adjustment' ? log.amount : Math.abs(log.amount),
// 				method: log.paymentMethod,
// 				reference: (log.paymentNumber || '') + (poNumber ? ` (${poNumber})` : ''),
// 				source: 'Log',
// 				type: 'out',
// 				to: log.to?.name
// 			});
// 		});

// 		// 3. Fetch Manual Cashflow Logs
// 		// eslint-disable-next-line @typescript-eslint/no-explicit-any
// 		const manualQuery: any = { companyId: company._id };
// 		if (mode === 'cash') {
// 			manualQuery.accountType = 'Cash';
// 		} else {
// 			manualQuery.accountType = 'Bank';
// 			if (bankAccountId) {
// 				manualQuery.bankAccountId = new mongoose.Types.ObjectId(bankAccountId);
// 			}
// 		}
// 		if (Object.keys(dateFilter).length > 0) manualQuery.date = dateFilter;

// 		const manualLogs = await Cashflow.find(manualQuery)
// 			.populate('bankAccountId', 'bank')
// 			.populate('cashVoucherId', 'voucherNumber')
// 			.populate('bankVoucherId', 'voucherNumber')
// 			.lean();

// 		manualLogs.forEach(entry => {
// 			let methodName = 'Cash';
// 			if (entry.accountType === 'Bank') {
// 				// eslint-disable-next-line @typescript-eslint/no-explicit-any
// 				methodName = entry.bankAccountId ? (entry.bankAccountId as any).bank : 'Bank';
// 			}

// 			allTransactions.push({
// 				_id: entry._id.toString(),
// 				date: entry.date,
// 				time: entry.time || null,
// 				amount: entry.amount,
// 				method: methodName,
// 				reference: entry.reference,
// 				source: (entry as any).source === 'purchase_payment' ? 'Purchase Payment' : 'Manual Entry',
// 				type: entry.type,
// 				from: entry.from,
// 				to: entry.to,
// 				voucherId: entry.voucherId,
// 				cashVoucherId: entry.cashVoucherId ? (entry.cashVoucherId as any)._id : null,
// 				cashVoucherNumber: entry.cashVoucherId ? (entry.cashVoucherId as any).voucherNumber : null,
// 				bankVoucherId: entry.bankVoucherId ? (entry.bankVoucherId as any)._id : null,
// 				bankVoucherNumber: entry.bankVoucherId ? (entry.bankVoucherId as any).voucherNumber : null,
// 				bankAccountId: entry.bankAccountId ? String((entry.bankAccountId as any)._id) : ''
// 			});
// 		});

// 		// 4. Filtering Search & Sorting
// 		let finalTransactions = allTransactions;
// 		if (search) {
// 			finalTransactions = allTransactions.filter(t =>
// 				String(t.from || '').toLowerCase().includes(search) ||
// 				String(t.to || '').toLowerCase().includes(search) ||
// 				String(t.reference || '').toLowerCase().includes(search)
// 			);
// 		}

// 		// Helper: build a full Date with time for proper chronological sorting.
// 		// Manual Cashflow entries store time as a separate "HH:MM" string field,
// 		// while invoice payments embed time directly in the date field.
// 		const getFullDateTime = (t: any): number => {
// 			const d = new Date(t.date);
// 			if (t.time && typeof t.time === 'string') {
// 				const [hh, mm] = t.time.split(':').map(Number);
// 				if (!isNaN(hh) && !isNaN(mm)) {
// 					d.setHours(hh, mm, 0, 0);
// 				}
// 			}
// 			return d.getTime();
// 		};

// 		finalTransactions.sort((a, b) => getFullDateTime(a) - getFullDateTime(b));

// 		let totalIn = 0;
// 		let totalOut = 0;
// 		let initialBalance = 0;

// 		finalTransactions.forEach(t => {
// 			if (t.type === 'in') totalIn += t.amount;
// 			else if (t.type === 'out') totalOut += t.amount;
// 			else if (t.type === 'initial') initialBalance += t.amount;
// 		});

// 		const netCashflow = totalIn - totalOut;

// 		console.log("=========================================")
// 		console.log(finalTransactions)
// 		console.log("=========================================")

// 		const [init] = finalTransactions.filter((t) => t.type === 'initial')

// 		return NextResponse.json({
// 			noResult: finalTransactions.length === 0,
// 			message: "success",
// 			result: {
// 				transactions: finalTransactions,
// 				summary: {
// 					totalIn: totalIn + init.amount,
// 					totalOut,
// 					initialBalance,
// 					netCashflow: (totalIn + init.amount) - totalOut,
// 					finalBalance: initialBalance + netCashflow
// 				}
// 			},
// 			error: false,
// 		});
// 	}
// 	catch (e: unknown) {
// 		console.error("Cashflow API Error:", e);
// 		return NextResponse.json({
// 			noResult: true,
// 			message: e instanceof Error ? e.message : "Something went wrong",
// 			result: null,
// 			error: true,
// 		});
// 	}
// }


export async function GET(request: NextRequest) {
	try {
		await connectToDatabase();

		const url = new URL(request.url);
		const id = url.searchParams.get("id");
		const mode = url.searchParams.get("mode") || "cash";
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

		const bankAccounts = await BankAccount.find({
			addedBy: company._id,
		}).lean();

		const isCashMethod = (method: string) => {
			const value = method?.toLowerCase() || "";
			return value.includes("cash") || value === "tunai";
		};

		const extractAccountNumberFromMethod = (method: string): string => {
			if (!method) return "";
			const parts = method.split(" - ");
			return parts.length > 1 ? parts[1].trim() : "";
		};

		const isBankMethod = (
			method: string,
			targetAccountNumber?: string,
		) => {
			if (!method) return false;

			if (targetAccountNumber) {
				return extractAccountNumberFromMethod(method) === targetAccountNumber;
			}

			return method.includes(" - ");
		};

		let targetAccountNumber: string | undefined;

		if (mode === "bank" && bankAccountId) {
			const targetBank = bankAccounts.find(
				(bank) => bank._id.toString() === bankAccountId,
			);

			targetAccountNumber = targetBank?.accountNumber;
		}

		const dateFilter: Record<string, Date> = {};

		if (startDate) {
			dateFilter.$gte = new Date(startDate);
		}

		if (endDate) {
			const end = new Date(endDate);
			end.setHours(23, 59, 59, 999);
			dateFilter.$lte = end;
		}

		const hasDateFilter = Object.keys(dateFilter).length > 0;

		// 1. Fetch Sales Invoices
		const invoices = await Invoice.find({
			companyId: company._id,
			paymentHistory: {
				$exists: true,
				$not: { $size: 0 },
			},
		}).lean();

		const salesOrderNumbers = [
			...new Set(
				invoices
					.map((invoice) => invoice.salesOrderNumber)
					.filter(Boolean),
			),
		];

		const cashVoucherIds = new Set<string>();
		const bankVoucherIds = new Set<string>();

		// Collect voucher IDs according to their actual field.
		for (const invoice of invoices) {
			for (const payment of invoice.paymentHistory || []) {
				if (payment.reverted || payment.voucherNumber) continue;

				if (mode === "cash" && payment.voucherId) {
					cashVoucherIds.add(payment.voucherId.toString());
				}

				if (mode === "bank" && payment.bankVoucherId) {
					bankVoucherIds.add(payment.bankVoucherId.toString());
				}
			}
		}

		const [
			orders,
			serviceOrders,
			cashVouchers,
			bankVouchers,
		] = await Promise.all([
			Order.find({
				salesOrderNumber: { $in: salesOrderNumbers },
			}).lean(),

			ServiceOrder.find({
				salesOrderNumber: { $in: salesOrderNumbers },
			}).lean(),

			cashVoucherIds.size
				? CashVoucher.find({
					_id: { $in: [...cashVoucherIds] },
				})
					.select("voucherNumber sequence")
					.lean()
				: [],

			bankVoucherIds.size
				? BankVoucher.find({
					_id: { $in: [...bankVoucherIds] },
				})
					.select("voucherNumber sequence")
					.lean()
				: [],
		]);

		// Customer lookup
		const customerIds = [
			...new Set(
				[
					...orders.map((order) => order.customerId),
					...serviceOrders.map((order) => order.customerId),
				]
					.filter(Boolean)
					.map((customerId) => customerId.toString()),
			),
		];

		const customers = customerIds.length
			? await Customer.find({
				_id: { $in: customerIds },
			})
				.select("bussinessName name")
				.lean()
			: [];

		// O(1) lookups
		const orderMap = new Map(
			[...orders, ...serviceOrders].map((order) => [
				order.salesOrderNumber,
				order,
			]),
		);

		const customerMap = new Map(
			customers.map((customer) => [
				customer._id.toString(),
				customer.bussinessName || customer.name,
			]),
		);

		const cashVoucherMap = new Map(
			cashVouchers.map((voucher) => [
				voucher._id.toString(),
				voucher,
			]),
		);

		const bankVoucherMap = new Map(
			bankVouchers.map((voucher) => [
				voucher._id.toString(),
				voucher,
			]),
		);

		const allTransactions: any[] = [];

		for (const invoice of invoices) {
			if (!invoice.paymentHistory) continue;

			const order = orderMap.get(invoice.salesOrderNumber);

			let fromName = "Customer";

			if (order) {
				if (order.customCustomer?.name) {
					fromName = order.customCustomer.name;
				} else if (order.customerId) {
					fromName =
						customerMap.get(order.customerId.toString()) || fromName;
				}
			}

			for (const payment of invoice.paymentHistory) {
				if (payment.reverted) continue;

				const paymentDate = new Date(payment.date);

				if (hasDateFilter) {
					if (
						dateFilter.$gte &&
						paymentDate < dateFilter.$gte
					) {
						continue;
					}

					if (
						dateFilter.$lte &&
						paymentDate > dateFilter.$lte
					) {
						continue;
					}
				}

				const paymentMethod = payment.method || "";

				const include =
					mode === "cash"
						? isCashMethod(paymentMethod)
						: isBankMethod(paymentMethod, targetAccountNumber);

				if (!include) continue;

				// Select the correct voucher reference for this mode.
				const cashVoucherId = payment.voucherId
					? payment.voucherId.toString()
					: null;

				const bankVoucherId = payment.bankVoucherId
					? payment.bankVoucherId.toString()
					: null;

				const voucherId =
					mode === "cash" ? cashVoucherId : bankVoucherId;

				const voucherMap =
					mode === "cash" ? cashVoucherMap : bankVoucherMap;

				const voucher = voucherId
					? voucherMap.get(voucherId)
					: undefined;

				const fetchedVoucherNumber =
					payment.voucherNumber ?? voucher?.voucherNumber ?? null;

				const fetchedSequence = voucher?.sequence;

				allTransactions.push({
					_id: new mongoose.Types.ObjectId().toString(),
					date: paymentDate,
					amount: payment.amount,
					method: paymentMethod,
					reference: invoice.invoiceNumber,
					source: "Sales Invoice",
					type: "in",
					from: fromName,
					bankVoucher: invoice.bankVoucher ?? "-",

					// Existing generic voucher fields
					voucherNumber: fetchedVoucherNumber,
					voucherSequence: fetchedSequence,
					voucherId: cashVoucherId,

					// Explicit bank voucher fields
					bankVoucherId,
					bankVoucherNumber:
						bankVoucherMap.get(bankVoucherId || "")?.voucherNumber ?? null,
				});
			}
		}

		// 2. Fetch Purchase Logs
		const purchases = await Purchase.find({
			companyId: company._id,
		})
			.select("_id purchaseOrderNumber")
			.lean();

		const purchaseIds = purchases.map((purchase) => purchase._id);

		const logQuery: any = {
			purchaseId: { $in: purchaseIds },
			amount: { $gt: 0 },
			initial: true,
		};

		if (hasDateFilter) {
			logQuery.date = dateFilter;
		}

		if (mode === "cash") {
			logQuery.paymentMethod = {
				$regex: /^(cash|tunai)$/i,
			};
		} else if (bankAccountId) {
			logQuery.$or = [
				{
					bankAccountId: new mongoose.Types.ObjectId(bankAccountId),
				},
				{
					bankAccountId: { $exists: false },
					paymentMethod: targetAccountNumber
						? { $regex: targetAccountNumber }
						: { $not: /^(cash|tunai)$/i },
				},
			];
		} else {
			logQuery.$or = [
				{
					bankAccountId: { $exists: true, $ne: null },
				},
				{
					bankAccountId: { $in: [null, undefined] },
					paymentMethod: { $not: /^(cash|tunai)$/i },
				},
			];
		}

		const logs = await Log.find(logQuery).lean();

		const purchaseMap = new Map(
			purchases.map((purchase) => [
				purchase._id.toString(),
				purchase.purchaseOrderNumber,
			]),
		);

		for (const log of logs) {
			const purchaseOrderNumber = purchaseMap.get(
				log.purchaseId.toString(),
			);

			allTransactions.push({
				_id: log._id.toString(),
				date: log.date,
				amount:
					log.type === "adjustment"
						? log.amount
						: Math.abs(log.amount),
				method: log.paymentMethod,
				reference:
					(log.paymentNumber || "") +
					(purchaseOrderNumber
						? ` (${purchaseOrderNumber})`
						: ""),
				source: "Log",
				type: "out",
				to: log.to?.name,
			});
		}

		// 3. Fetch Manual Cashflow Entries
		const manualQuery: any = {
			companyId: company._id,
		};

		if (mode === "cash") {
			manualQuery.accountType = "Cash";
		} else {
			manualQuery.accountType = "Bank";

			if (bankAccountId) {
				manualQuery.bankAccountId =
					new mongoose.Types.ObjectId(bankAccountId);
			}
		}

		if (hasDateFilter) {
			manualQuery.date = dateFilter;
		}

		const manualLogs = await Cashflow.find(manualQuery)
			.populate("bankAccountId", "bank")
			.populate("cashVoucherId", "voucherNumber")
			.populate("bankVoucherId", "voucherNumber")
			.lean();

		for (const entry of manualLogs) {
			const bankAccount = entry.bankAccountId as any;
			const cashVoucher = entry.cashVoucherId as any;
			const bankVoucher = entry.bankVoucherId as any;

			const methodName =
				entry.accountType === "Bank"
					? bankAccount?.bank || "Bank"
					: "Cash";

			allTransactions.push({
				_id: entry._id.toString(),
				date: entry.date,
				time: entry.time || null,
				amount: entry.amount,
				method: methodName,
				reference: entry.reference,
				source:
					(entry as any).source === "purchase_payment"
						? "Purchase Payment"
						: "Manual Entry",
				type: entry.type,
				from: entry.from,
				to: entry.to,
				voucherId: entry.voucherId ?? null,

				cashVoucherId: cashVoucher?._id?.toString() ?? null,
				cashVoucherNumber: cashVoucher?.voucherNumber ?? null,

				bankVoucherId: bankVoucher?._id?.toString() ?? null,
				bankVoucherNumber: bankVoucher?.voucherNumber ?? null,

				bankAccountId: bankAccount?._id?.toString() ?? "",
				nonCashDst: methodName != 'Cash' ? entry.nonCashDst : null
			});
		}

		// 4. Search and Sort
		let finalTransactions = allTransactions;

		if (search) {
			finalTransactions = allTransactions.filter((transaction) =>
				[
					transaction.from,
					transaction.to,
					transaction.reference,
				].some((value) =>
					String(value || "").toLowerCase().includes(search),
				),
			);
		}

		const getFullDateTime = (transaction: any): number => {
			const date = new Date(transaction.date);

			if (transaction.time && typeof transaction.time === "string") {
				const [hours, minutes] = transaction.time.split(":").map(Number);

				if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
					date.setHours(hours, minutes, 0, 0);
				}
			}

			return date.getTime();
		};

		finalTransactions.sort(
			(a, b) => getFullDateTime(a) - getFullDateTime(b),
		);

		let totalIn = 0;
		let totalOut = 0;
		let initialBalance = 0;

		for (const transaction of finalTransactions) {
			if (transaction.type === "in") {
				totalIn += transaction.amount;
			}
			else if (transaction.type === "out") {
				totalOut += transaction.amount;
			}
			else if (transaction.type === "initial") {
				initialBalance += transaction.amount;
			}
		}

		const netCashflow = totalIn - totalOut;

		const initialTransaction = finalTransactions.find(
			(transaction) => transaction.type === "initial",
		);

		const initialAmount = initialTransaction?.amount ?? 0;

		return NextResponse.json({
			noResult: finalTransactions.length === 0,
			message: "success",
			result: {
				transactions: finalTransactions,
				summary: {
					totalIn: totalIn + initialAmount,
					totalOut,
					initialBalance,
					netCashflow: totalIn + initialAmount - totalOut,
					finalBalance: initialBalance + netCashflow,
				},
			},
			error: false,
		});
	}
	catch (error: unknown) {
		console.error("Cashflow API Error:", error);

		return NextResponse.json({
			noResult: true,
			message:
				error instanceof Error
					? error.message
					: "Something went wrong",
			result: null,
			error: true,
		});
	}
}



export async function POST(request: NextRequest) {
	try {
		await connectToDatabase();
		const body = await request.json();
		const { masterAccountId, additional, ...rest } = body;

		if (!masterAccountId) {
			return NextResponse.json({ error: true, message: "Missing masterAccountId" });
		}

		const company = await Companie.findOne({ masterAccountId }).lean();
		if (!company) {
			return NextResponse.json({ error: true, message: "Company not found" });
		}

		// ─── Validasi saldo untuk transaksi keluar (out) ─────────────────────────
		if (rest.type === 'out' && rest.amount > 0) {
			const { getAvailableBalance } = await import('@/lib/finance/balance');
			const isCash = rest.accountType === 'Cash';
			const paymentMethod = isCash ? 'Cash' : 'transfer';
			const bankAccId = !isCash ? rest.bankAccountId : undefined;
			const txDate = rest.date || new Date().toISOString();

			const balance = await getAvailableBalance(company._id, paymentMethod, bankAccId, txDate);
			if (balance < rest.amount) {
				return NextResponse.json({
					error: true,
					message: `Saldo ${isCash ? 'Cash' : 'Bank'} tidak mencukupi pada tanggal tersebut.\nSaldo tersedia: Rp ${balance.toLocaleString('id-ID')}\nJumlah pengeluaran: Rp ${Number(rest.amount).toLocaleString('id-ID')}`
				});
			}
		}

		const cashflowData = {
			companyId: company._id,
			...rest,
			...additional
		};

		await Cashflow.create(cashflowData);
		return NextResponse.json({ error: false, message: "success" });
	} catch (e: any) {
		console.error("Cashflow POST Error:", e);
		return NextResponse.json({ error: true, message: e.message || "Failed to save cashflow" });
	}
}

export async function PUT(request: NextRequest) {
	try {
		await connectToDatabase();
		const body = await request.json();
		const { id, masterAccountId, additional, ...rest } = body;

		if (!id) {
			return NextResponse.json({ error: true, message: "Missing id" });
		}

		const cashflowData = {
			...rest,
			...additional
		};

		await Cashflow.findByIdAndUpdate(id, cashflowData);
		return NextResponse.json({ error: false, message: "success" });
	} catch (e: any) {
		console.error("Cashflow PUT Error:", e);
		return NextResponse.json({ error: true, message: e.message || "Failed to update cashflow" });
	}
}

export async function DELETE(request: NextRequest) {
	try {
		await connectToDatabase();
		const url = new URL(request.url);
		let id = url.searchParams.get("id");
		let approvalCode = url.searchParams.get("approvalCode");

		if (!id || !approvalCode) {
			try {
				const body = await request.json();
				id = id || body.id;
				approvalCode = approvalCode || body.approvalCode;
			} catch {
				// body is empty or not JSON
			}
		}

		if (!id) {
			return NextResponse.json({ error: true, message: "ID entri diperlukan" }, { status: 400 });
		}
		if (!approvalCode) {
			return NextResponse.json({ error: true, message: "Kode approval diperlukan" }, { status: 400 });
		}

		const approver = await User.findOne({ approvalCode }).lean();
		if (!approver) {
			return NextResponse.json({ error: true, message: "Kode approval tidak valid" }, { status: 400 });
		}

		const cashflow = await Cashflow.findById(id);
		if (!cashflow) {
			return NextResponse.json({ error: true, message: "Data cashflow tidak ditemukan" }, { status: 404 });
		}

		await Cashflow.findByIdAndDelete(id);
		return NextResponse.json({ error: false, message: "Entri cashflow berhasil dihapus" });
	} catch (e: any) {
		console.error("Cashflow DELETE Error:", e);
		return NextResponse.json({ error: true, message: e.message || "Gagal menghapus cashflow" }, { status: 500 });
	}
}