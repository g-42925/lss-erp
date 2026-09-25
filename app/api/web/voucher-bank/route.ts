/* eslint-disable @typescript-eslint/no-explicit-any */
import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import Companie from "@/models/Companie";
import VoucherBank from "@/models/VoucherBank";
import Invoice from "@/models/Invoice";
import Cashflow from "@/models/Cashflow";
import BankAccount from "@/models/BankAccount";
import Purchase from "@/models/Purchase";
import Log from "@/models/Log";
import mongoose from "mongoose";

// ─── GET: list vouchers or available refs ─────────────────────────────────────
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const masterAccountId = url.searchParams.get("id");
  const type = url.searchParams.get("type"); // 'in' | 'out'
  const mode = url.searchParams.get("mode"); // 'refs'

  try {
    await connectToDatabase();
    const company = await Companie.findOne({ masterAccountId });
    if (!company) return NextResponse.json({ noResult: true, message: "Company not found", result: null, error: true });

    if (mode === "refs") {
      // Return unlinked references for relation picker
      const results: any = { invoicePayments: [], cashflows: [], bankAccounts: [], purchasePayments: [], debtPayments: [] };

      // Fetch company bank accounts
      const bankAccounts = await BankAccount.find({ addedBy: company._id }).lean();
      results.bankAccounts = bankAccounts;

      if (type === "in") {
        // Find invoice payment histories without a bankVoucherId
        const invoices = await Invoice.find({
          companyId: company._id,
          "paymentHistory.0": { $exists: true },
        }).lean();

        invoices.forEach((inv: any) => {
          inv.paymentHistory?.forEach((ph: any) => {
            if (!ph.bankVoucherId) {
              results.invoicePayments.push({
                invoiceId: inv._id,
                invoiceNumber: inv.invoiceNumber,
                invoiceType: inv.invoiceType,
                paymentHistoryId: ph._id,
                amount: ph.amount,
                method: ph.method,
                date: ph.date,
              });
            }
          });
        });
      } else if (type === "out") {
        // Purchases
        const purchases = await Purchase.find({ companyId: company._id }).select('_id purchaseOrderNumber description').lean();
        const purchaseIds = purchases.map((p: any) => p._id);
        const purchaseLogs = await Log.find({
          purchaseId: { $in: purchaseIds },
          type: "payment",
          paymentNumber: { $regex: /^PL-/ },
          bankVoucherId: { $exists: false }
        }).lean();
        
        purchaseLogs.forEach((log: any) => {
          const purchase = purchases.find((p: any) => p._id.toString() === log.purchaseId.toString());
          results.purchasePayments.push({
            purchaseId: log.purchaseId,
            purchaseOrderNumber: purchase?.purchaseOrderNumber || "-",
            description: purchase?.description || "-",
            paymentHistoryId: log._id,
            amount: log.amount,
            method: log.paymentMethod || "Bank",
            date: log.date,
            paymentNumber: log.paymentNumber
          });
        });

        // Debts (Vendor Invoices)
        const vendorInvoices = await Invoice.find({ companyId: company._id, invoiceType: "vendor" }).select('_id invoiceNumber').lean();
        const vendorInvoiceIds = vendorInvoices.map((inv: any) => inv._id);
        const debtLogs = await Log.find({
          purchaseId: { $in: vendorInvoiceIds },
          type: "payment",
          paymentNumber: { $regex: /^VL-/ },
          bankVoucherId: { $exists: false }
        }).lean();

        debtLogs.forEach((log: any) => {
          const inv = vendorInvoices.find((i: any) => i._id.toString() === log.purchaseId.toString());
          results.debtPayments.push({
            invoiceId: log.purchaseId,
            invoiceNumber: inv?.invoiceNumber || "-",
            paymentHistoryId: log._id,
            amount: log.amount,
            method: log.paymentMethod || "Bank",
            date: log.date,
            paymentNumber: log.paymentNumber
          });
        });
      }

      // Unlinked cashflows matching type (accountType Bank)
      const cashflows = await Cashflow.find({
        companyId: company._id,
        type: type,
        accountType: "Bank",
        bankVoucherId: { $exists: false },
      })
        .sort({ date: -1 })
        .lean();

      results.cashflows = cashflows.map((cf: any) => ({
        cashflowId: cf._id,
        reference: cf.reference,
        from: cf.from,
        to: cf.to,
        amount: cf.amount,
        date: cf.date,
      }));

      return NextResponse.json({ noResult: false, result: results, error: false });
    }

    // Default: list vouchers
    const vouchers = await VoucherBank.find({ companyId: company._id, type })
      .sort({ date: -1, createdAt: -1 })
      .lean();

    return NextResponse.json({ noResult: false, result: vouchers, error: false });
  } catch (e: unknown) {
    return NextResponse.json({
      noResult: true,
      message: e instanceof Error ? e.message : "Something went wrong",
      result: null,
      error: true,
    });
  }
}

// ─── POST: create voucher ────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const {
      masterAccountId, type, contactName, voucherNumber, date, items, signatures,
      companyBankAccountId, externalBankName, externalAccountNumber
    } = body;

    const company = await Companie.findOne({ masterAccountId });
    if (!company) return NextResponse.json({ noResult: true, message: "Company not found", result: null, error: true });

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const voucher = await VoucherBank.create([{
        companyId: company._id,
        type,
        contactName,
        voucherNumber,
        date: new Date(date),
        items,
        signatures,
        companyBankAccountId: companyBankAccountId || undefined,
        externalBankName: externalBankName || undefined,
        externalAccountNumber: externalAccountNumber || undefined,
      }], { session });

      const newVoucher = voucher[0];

      // Link related items
      for (const item of (items || [])) {
        if (item.refModel === "Invoice" && item.refId && item.paymentHistoryId) {
          await Invoice.updateOne(
            { _id: new mongoose.Types.ObjectId(item.refId), "paymentHistory._id": new mongoose.Types.ObjectId(item.paymentHistoryId) },
            { $set: { "paymentHistory.$.bankVoucherId": newVoucher._id } },
            { session }
          );
        } else if (item.refModel === "Cashflow" && item.refId) {
          await Cashflow.updateOne(
            { _id: new mongoose.Types.ObjectId(item.refId) },
            { $set: { bankVoucherId: newVoucher._id } },
            { session }
          );
        } else if ((item.refModel === "Purchase" || item.refModel === "Debt") && item.paymentHistoryId) {
          await Log.updateOne(
            { _id: new mongoose.Types.ObjectId(item.paymentHistoryId) },
            { $set: { bankVoucherId: newVoucher._id } },
            { session }
          );
        }
      }

      await session.commitTransaction();
      session.endSession();

      return NextResponse.json({ noResult: false, result: newVoucher, error: false });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  } catch (e: unknown) {
    return NextResponse.json({
      noResult: true,
      message: e instanceof Error ? e.message : "Something went wrong",
      result: null,
      error: true,
    });
  }
}
