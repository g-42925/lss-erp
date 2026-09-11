import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

import Companie from "@/models/Companie";
import Invoice from "@/models/Invoice";
import ServiceOrder from "@/models/ServiceOrder";

function formatNumber(x: number) {
  return String(x).padStart(4, "0");
}

function getInvoiceNumber(invoiceCode: string, count: number) {
  const now = new Date();
  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");

  return `${invoiceCode}${year}${month}${formatNumber(count + 1)}`;
}

function getPphDeduction(taxes: any[] = []) {
  return taxes.reduce(
    (total, tax) => total + (tax.isPPh ? tax.taxValue : 0),
    0
  );
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  try {
    await connectToDatabase();

    const company = await Companie.findOne({
      masterAccountId: id
    });

    if (!company) throw new Error("Company not found");

    const invoices = await Invoice.aggregate([
      {
        $match: {
          companyId: company._id,
          invoiceType: "service",
          status: "active"
        }
      },
      {
        $lookup: {
          from: "serviceorders",
          localField: "salesOrderId",
          foreignField: "_id",
          as: "order"
        }
      },
      {
        $unwind: "$order"
      },
      {
        $lookup: {
          from: "customers",
          localField: "order.customerId",
          foreignField: "_id",
          as: "order.customer"
        }
      },
      {
        $unwind: {
          path: "$order.customer",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "products",
          localField: "order.productId",
          foreignField: "_id",
          as: "order.product"
        }
      },
      {
        $unwind: {
          path: "$order.product",
          preserveNullAndEmptyArrays: true
        }
      }
    ]);

    return NextResponse.json({
      noResult: false,
      message: "",
      result: invoices,
      error: false
    });
  }
  catch (e: unknown) {
    return NextResponse.json({
      noResult: true,
      message: e instanceof Error ? e.message : "Unknown error",
      result: null,
      error: true
    });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await connectToDatabase();

    const params = await request.json();

    const invoice = await Invoice.findOne({
      _id: params._id
    });

    if (!invoice) throw new Error("Invoice not found");

    invoice.bankVoucher = params.voucherNumber;

    await invoice.save();

    return NextResponse.json({
      noResult: false,
      message: "Invoice updated",
      result: invoice,
      error: false
    });
  }
  catch (e: unknown) {
    return NextResponse.json({
      noResult: true,
      message: e instanceof Error ? e.message : "Unknown error",
      result: null,
      error: true
    });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();

    const params = await request.json();

    const so = await ServiceOrder.findOne({
      salesOrderNumber: params.salesOrderNumber
    });

    if (!so) throw new Error("Service Order not found");

    const company = await Companie.findOne({
      _id: so.companyId
    });

    if (!company) throw new Error("Company not found");

    const existingInvoice = await Invoice.findOne({
      salesOrderId: so._id,
      invoiceType: "service",
      status: "draft"
    });

    if (existingInvoice) {
      if (so.billed >= so.range) {
        return NextResponse.json({
          noResult: true,
          message: "Request invalid",
          result: null,
          error: true
        });
      }

      await ServiceOrder.updateOne(
        { _id: so._id },
        {
          $inc: {
            billed: 1
          }
        }
      );

      if (
        existingInvoice.invoiceNumber === "xxx" ||
        !existingInvoice.invoiceNumber
      ) {
        const invoiceCount = await Invoice.countDocuments({
          companyId: company._id
        });

        existingInvoice.invoiceNumber = getInvoiceNumber(
          company.invoiceCode,
          invoiceCount
        );
      }

      existingInvoice.status = params.status;

      if (params.missing !== undefined) {
        existingInvoice.missing = params.missing;
      }

      if (params.payAmount !== undefined && params.payAmount > 0) {
        existingInvoice.payAmount = params.payAmount;

        existingInvoice.paymentHistory.push({
          amount: params.payAmount,
          method: "Cash",
          date: new Date(),
          reverted: false
        });
      }

      await existingInvoice.save();

      return NextResponse.json({
        noResult: false,
        message: "Invoice activated",
        result: existingInvoice,
        error: false
      });
    }

    const invoiceCount = await Invoice.countDocuments({
      companyId: company._id
    });

    const invoiceNumber = getInvoiceNumber(
      company.invoiceCode,
      invoiceCount
    );

    await ServiceOrder.updateOne(
      { _id: so._id },
      {
        $inc: {
          billed: 1
        }
      }
    );

    const pphDeduction = getPphDeduction(so.taxes);

    const newInvoice = await Invoice.create({
      companyId: company._id,
      salesOrderId: so._id,
      date: params.date ? new Date(params.date) : new Date(),
      invoiceNumber,
      salesOrderNumber: so.salesOrderNumber,
      paid: false,
      payAmount: params.payAmount ?? 0,
      status: params.status,
      missing: params.missing,
      invoiceType: "service",

      paymentHistory: params.payAmount > 0
        ? [
          {
            amount: params.payAmount,
            method: "Cash",
            date: new Date(),
            reverted: false
          }
        ]
        : [],

      pphDeduction,
      price: so.price,
      qty: so.qty,
      taxes: so.taxes
    });

    return NextResponse.json({
      noResult: false,
      message: "Invoice created and activated",
      result: newInvoice,
      error: false
    });
  }
  catch (e: unknown) {
    return NextResponse.json({
      noResult: true,
      message: e instanceof Error ? e.message : "Unknown error",
      result: null,
      error: true
    });
  }
}