import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import Invoice from "@/models/Invoice";
import Companie from "@/models/Companie";
import Product from "@/models/Product";
import BankAccount from "@/models/BankAccount";

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

    // 1. Fetch all Invoices with non-empty paymentHistory
    const invoices = await Invoice.find({
      companyId: company._id,
      paymentHistory: { $exists: true, $not: { $size: 0 } },
    }).populate({
      path: 'salesOrderId',
      model: 'Order'
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cashLog: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bankLog: any[] = [];
    let cashTotal = 0;
    let bankTotal = 0;

    invoices.forEach((inv) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      inv.paymentHistory.forEach((payment: any) => {
        if (payment.reverted) return;

        const logEntry = {
          date: payment.date,
          amount: payment.amount,
          method: payment.method,
          invoiceNumber: inv.invoiceNumber,
          salesOrderNumber: inv.salesOrderNumber,
        };

        if (payment.method.toLowerCase() === "cash") {
          cashLog.push(logEntry);
          cashTotal += payment.amount;
        } else if (payment.method.toLowerCase().startsWith("transfer to")) {
          bankLog.push(logEntry);
          bankTotal += payment.amount;
        }
      });
    });

    // 2. Fetch Bank Accounts to group bank logs
    const bankAccounts = await BankAccount.find({ addedBy: company._id });
    const bankStats = bankAccounts.map((account) => {
      const accountLogs = bankLog.filter((log) =>
        log.method.toLowerCase().includes(account.bank.toLowerCase())
      );
      const accountTotal = accountLogs.reduce((sum, log) => sum + log.amount, 0);
      return {
        bankName: account.bank,
        accountName: account.accountName,
        accountNumber: account.accountNumber,
        total: accountTotal,
        logs: accountLogs,
      };
    });

    // 3. Inventory Valuation
    const products = await Product.find({ productOf: company._id });
    const inventoryValuation = products.reduce((sum, p) => sum + (p.stockValue || 0), 0);

    // 4. Receivables
    // We need to calculate 'value' for each invoice to find out how much is remaining
    // Reusing logic from app/api/web/receivable/product/route.ts but simplified
    const receivableInvoices = await Invoice.aggregate([
      { $match: { companyId: company._id } },
      {
        $lookup: {
          from: 'orders',
          localField: 'salesOrderId',
          foreignField: '_id',
          as: 'order'
        }
      },
      { $unwind: '$order' },
      {
        $addFields: {
          value: {
            $cond: {
              if: { $eq: ["$order.productType", "good"] },
              then: '$order.total',
              else: {
                $cond: {
                  if: { $eq: ["$order.frequency", "Week"] },
                  then: {
                    $subtract: [
                      { $multiply: [{ $getField: { field: "qty", input: { $arrayElemAt: ["$order.cart", 0] } } }, { $getField: { field: "subTotal", input: { $arrayElemAt: ["$order.cart", 0] } } }, 4] },
                      { $multiply: [{ $getField: { field: "subTotal", input: { $arrayElemAt: ["$order.cart", 0] } } }, { $ifNull: ["$missing", 0] }] }
                    ]
                  },
                  else: {
                    $subtract: [
                      { $multiply: [{ $getField: { field: "qty", input: { $arrayElemAt: ["$order.cart", 0] } } }, { $getField: { field: "subTotal", input: { $arrayElemAt: ["$order.cart", 0] } } }] },
                      { $multiply: [{ $getField: { field: "subTotal", input: { $arrayElemAt: ["$order.cart", 0] } } }, { $ifNull: ["$missing", 0] }] }
                    ]
                  }
                }
              }
            }
          }
        }
      },
      {
        $addFields: {
          remaining: { $subtract: ["$value", "$payAmount"] }
        }
      },
      { $match: { remaining: { $gt: 0 } } },
      {
        $lookup: {
          from: 'customers',
          localField: 'order.customerId',
          foreignField: '_id',
          as: 'customer'
        }
      },
      { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } }
    ]);

    const receivableTotal = receivableInvoices.reduce((sum, inv) => sum + inv.remaining, 0);

    return NextResponse.json({
      noResult: false,
      message: "success",
      result: {
        cash: {
          total: cashTotal,
          logs: cashLog.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        },
        bank: {
          total: bankTotal,
          accounts: bankStats,
        },
        inventory: {
          total: inventoryValuation,
        },
        receivable: {
          total: receivableTotal,
          logs: receivableInvoices.map((inv) => ({
            date: inv.date,
            invoiceNumber: inv.invoiceNumber,
            salesOrderNumber: inv.salesOrderNumber,
            customerName: inv.customer?.bussinessName || inv.order?.customCustomer?.name || 'Unknown',
            value: inv.value,
            paid: inv.payAmount,
            remaining: inv.remaining,
          })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        },
      },
      error: false,
    });
  }
  catch (e: unknown) {
    console.error("COA Assets API Error:", e);
    return NextResponse.json({
      noResult: true,
      message: e instanceof Error ? e.message : "Something went wrong",
      result: null,
      error: true,
    });
  }
}
