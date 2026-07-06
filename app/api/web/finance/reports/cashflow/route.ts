import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import Companie from "@/models/Companie";
import BankAccount from "@/models/BankAccount";
import Invoice from "@/models/Invoice";
import Purchase from "@/models/Purchase";
import Log from "@/models/Log";
import Cashflow from "@/models/Cashflow";
import Order from "@/models/Order";
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

        if (!id) {
            return NextResponse.json({
                noResult: true,
                message: "Missing masterAccountId",
                result: null,
                error: true,
            });
        }

        const company = await Companie.findOne({ masterAccountId: id });
        if (!company) {
            return NextResponse.json({
                noResult: true,
                message: "Company not found",
                result: null,
                error: true,
            });
        }

        const bankAccounts = await BankAccount.find({ addedBy: company._id }).lean();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const allTransactions: any[] = [];

        // Helper to check if a method is cash or bank
        const isCashMethod = (method: string) => {
            if (!method) return false;
            const m = method.toLowerCase();
            return m.includes('cash') || m === 'tunai';
        };

        const isBankMethod = (method: string, targetBankName?: string) => {
            if (!method) return false;
            const m = method.toLowerCase();
            if (targetBankName) {
                return m.includes(targetBankName.toLowerCase());
            }

            // If no specific bank, check against all banks or if it starts with transfer
            if (m.startsWith('transfer')) return true;
            return bankAccounts.some(b => m.includes(b.bank.toLowerCase()));
        };

        // Date filtering if provided
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

        // 1. Fetch Invoices (Money IN)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invoiceQuery: any = {
            companyId: company._id,
            paymentHistory: { $exists: true, $not: { $size: 0 } }
        };
        const invoices = await Invoice.find(invoiceQuery).populate('salesOrderId').lean();

        invoices.forEach(async (inv) => {

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            inv.paymentHistory?.forEach(async (payment: any) => {
                if (payment.reverted) return;

                // search related order
                const order = await Order.findOne({ salesOrderNumber: inv.salesOrderNumber });

                // Apply date filter
                const paymentDate = new Date(payment.date);
                if (dateFilter && Object.keys(dateFilter).length > 0) {
                    if (dateFilter.$gte && paymentDate < dateFilter.$gte) return;
                    if (dateFilter.$lte && paymentDate > dateFilter.$lte) return;
                }

                let include = false;
                const pMethod = payment.method || '';

                if (mode === 'cash') {
                    include = isCashMethod(pMethod);
                } else {
                    if (bankAccountId) {
                        const targetBank = bankAccounts.find(b => b._id.toString() === bankAccountId);
                        include = isBankMethod(pMethod, targetBank?.bank);
                    } else {
                        include = isBankMethod(pMethod);
                    }
                }

                if (include) {
                    allTransactions.push({
                        _id: new mongoose.Types.ObjectId().toString(),
                        date: paymentDate,
                        amount: payment.amount,
                        method: payment.method,
                        reference: inv.invoiceNumber,
                        source: 'Sales Invoice',
                        type: 'in',
                        from: order.customCustomer.name
                    });
                }
            });
        });

        // 2. Fetch Logs for Purchases (Money OUT)
        const purchases = await Purchase.find({ companyId: company._id }).select('_id purchaseOrderNumber').lean();
        const purchaseIds = purchases.map((p) => p._id);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const logQuery: any = { purchaseId: { $in: purchaseIds }, amount: { $gt: 0 } };
        if (Object.keys(dateFilter).length > 0) {
            logQuery.date = dateFilter;
        }

        const logs = await Log.find(logQuery).lean();

        logs.forEach((log) => {
            const pMethod = log.paymentMethod || '';
            let include = false;

            if (mode === 'cash') {
                include = isCashMethod(pMethod);
            } else {
                if (bankAccountId) {
                    const targetBank = bankAccounts.find(b => b._id.toString() === bankAccountId);
                    include = isBankMethod(pMethod, targetBank?.bank);
                } else {
                    include = isBankMethod(pMethod);
                }
            }

            if (include) {
                const relatedPurchase = purchases.find(p => p._id.toString() === log.purchaseId.toString());
                allTransactions.push({
                    _id: log._id.toString(),
                    date: log.date,
                    amount: log.type === 'adjustment' ? log.amount : Math.abs(log.amount),
                    method: log.paymentMethod,
                    reference: (log.paymentNumber || '') + (relatedPurchase ? ` (${relatedPurchase.purchaseOrderNumber})` : ''),
                    source: 'Purchase Payment',
                    type: 'out',
                    to: log.to.name
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

        if (Object.keys(dateFilter).length > 0) {
            manualQuery.date = dateFilter;
        }

        const manualLogs = await Cashflow.find(manualQuery).populate('bankAccountId').lean();
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
                type: entry.type, // 'in', 'out', or 'initial'
                from: entry.from,
                to: entry.to
            });
        });

        // 4. Sort and Calculate Summaries
        allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        let totalIn = 0;
        let totalOut = 0;
        let initialBalance = 0;

        allTransactions.forEach(t => {
            if (t.type === 'in') totalIn += t.amount;
            else if (t.type === 'out') totalOut += t.amount;
            else if (t.type === 'initial') initialBalance += t.amount;
        });

        const netCashflow = totalIn - totalOut;

        return NextResponse.json({
            noResult: allTransactions.length === 0,
            message: "success",
            result: {
                transactions: allTransactions,
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

export async function POST(request: NextRequest) {
    try {
        await connectToDatabase();

        const body = await request.json();

        const { masterAccountId, accountType, bankAccountId, type, amount, reference, date, recordedBy, additional } = body;

        if (!masterAccountId || !accountType || !type || amount === undefined || !reference) {
            return NextResponse.json({
                noResult: true,
                message: "Missing required fields",
                error: true
            });
        }

        const company = await Companie.findOne({ masterAccountId });

        if (!company) return NextResponse.json({
            noResult: true,
            message: "Company not found",
            error: true
        });

        const newEntry = new Cashflow({
            companyId: company._id,
            accountType,
            bankAccountId: bankAccountId || null,
            type,
            amount,
            reference,
            date: date || new Date(),
            recordedBy: recordedBy || null,
            ...additional
        });

        await newEntry.save();

        return NextResponse.json({
            noResult: false,
            message: "Cashflow entry added successfully",
            result: newEntry,
            error: false
        });

    }
    catch (e: unknown) {
        console.error("Cashflow POST Error:", e);
        return NextResponse.json({
            noResult: true,
            message: e instanceof Error ? e.message : "Something went wrong",
            error: true
        });
    }
}
