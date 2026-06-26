import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import Companie from "@/models/Companie";
import BankAccount from "@/models/BankAccount";
import Invoice from "@/models/Invoice";
import Purchase from "@/models/Purchase";
import Log from "@/models/Log";

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const url = new URL(request.url);
    const id = url.searchParams.get("id"); // masterAccountId

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

    // 1. Fetch Bank Accounts
    const bankAccounts = await BankAccount.find({ addedBy: company._id });
    
    // 2. Fetch Money IN (Invoices)
    const invoices = await Invoice.find({
      companyId: company._id,
      paymentHistory: { $exists: true, $not: { $size: 0 } },
    }).populate({
        path: 'salesOrderId',
        model: 'Order'
    }).lean();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allBankIns: any[] = [];
    
    invoices.forEach((inv) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      inv.paymentHistory?.forEach((payment: any) => {
        if (payment.reverted) return;

        allBankIns.push({
          date: payment.date,
          amount: payment.amount,
          method: payment.method,
          reference: inv.invoiceNumber,
          source: 'Sales Invoice',
          type: 'in'
        });
      });
    });

    // 3. Fetch Money OUT (Purchases / Log)
    const purchases = await Purchase.find({ companyId: company._id }).select('_id purchaseOrderNumber').lean();
    const purchaseIds = purchases.map((p) => p._id);

    const logs = await Log.find({ purchaseId: { $in: purchaseIds } }).lean();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allBankOuts: any[] = [];
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    
    logs.forEach((log) => {
      // In Log, type: 'payment' handles normal payments, 'adjustment' handles adjustments.
      const isBankTxn = log.paymentMethod && log.paymentMethod.toLowerCase().startsWith('transfer');
      if (isBankTxn) {
          // find the matching purchase to grab the po number
          const relatedPurchase = purchases.find(p => p._id.toString() === log.purchaseId.toString());
          
          allBankOuts.push({
            date: log.date,
            amount: log.type === 'adjustment' ? log.amount : Math.abs(log.amount),
            method: log.paymentMethod,
            reference: log.paymentNumber + (relatedPurchase ? ` (${relatedPurchase.purchaseOrderNumber})` : ''),
            source: 'Purchase Payment',
            type: 'out'
          });
      }
    });

    // 4. Group by Bank Account
    const result = bankAccounts.map((account) => {
      const bankNameLower = account.bank.toLowerCase();
      
      // Money In
      const bankIns = allBankIns.filter((txn) => 
        txn.method.toLowerCase().includes(bankNameLower)
      );
      const totalIn = bankIns.reduce((sum, txn) => sum + txn.amount, 0);

      // Money Out
      const bankOuts = allBankOuts.filter((txn) => 
        txn.method.toLowerCase().includes(bankNameLower)
      );
      const totalOut = bankOuts.reduce((sum, txn) => sum + txn.amount, 0);

      return {
        _id: account._id,
        bankName: account.bank,
        accountName: account.accountName,
        accountNumber: account.accountNumber,
        totalIn,
        totalOut,
        balance: totalIn - totalOut,
        logs: [...bankIns, ...bankOuts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      };
    });

    return NextResponse.json({
      noResult: result.length === 0,
      message: "success",
      result: result,
      error: false,
    });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    console.error("Bank Report API Error:", e);
    return NextResponse.json({
      noResult: true,
      message: e.message,
      result: null,
      error: true,
    });
  }
}
