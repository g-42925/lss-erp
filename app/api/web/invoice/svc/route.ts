
import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

import Companie from '@/models/Companie'
import Invoice from '@/models/Invoice'
import ServiceOrder from '@/models/ServiceOrder'

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const type = url.searchParams.get("type");
  try {
    await connectToDatabase()
    const cmp = await Companie.findOne({
      masterAccountId: id
    })

    const invoices = await Invoice.aggregate([
      {
        $match: {
          companyId: cmp._id,
          invoiceType: "service",
          status: "active"
        }
      },
      {
        $lookup: {
          from: 'serviceorders',
          localField: 'salesOrderId',
          foreignField: '_id',
          as: 'order'
        }
      },
      {
        $unwind: '$order'
      },
      {
        $lookup: {
          from: "customers",
          localField: "order.customerId",
          foreignField: "_id",
          as: "order.customer",
        },
      },
      {
        $unwind: {
          path: "$order.customer",
          preserveNullAndEmptyArrays: true,
        }
      },
      {
        $lookup: {
          from: "products",
          localField: "order.productId",
          foreignField: "_id",
          as: "order.product",
        },
      },
      {
        $unwind: {
          path: "$order.product",
          preserveNullAndEmptyArrays: true,
        }
      },
    ])

    return NextResponse.json({
      noResult: false,
      message: "",
      result: invoices,
      error: false
    })
  }
  catch (e: unknown) {
    return NextResponse.json({
      noResult: true,
      message: e.message,
      result: null,
      error: true
    })
  }
}

export async function PUT(request: NextRequest) {

  function formatNumber(x: number) {
    return String(x).padStart(4, '0');
  }

  try {
    await connectToDatabase()
    const params = await request.json()

    const so = await ServiceOrder.findOne({ salesOrderNumber: params.salesOrderNumber })

    if (!so) throw new Error("Service Order not found")

    const company = await Companie.findOne({ _id: so.companyId })

    const existingInvoice = await Invoice.findOne({
      salesOrderId: so._id,
      invoiceType: 'service'
    })

    if (existingInvoice) {
      if (so.billed < so.range) {
        await ServiceOrder.updateOne(
          {
            _id: so._id
          },
          {
            $inc: {
              billed: 1
            }
          }
        )
      }
      else {
        return NextResponse.json({
          noResult: true,
          message: "Request invalid",
          result: null,
          error: true
        })
      }

      existingInvoice.status = params.status
      if (params.missing !== undefined) {
        existingInvoice.missing = params.missing
      }
      if (params.payAmount !== undefined && params.payAmount > 0) {
        existingInvoice.payAmount = params.payAmount
        existingInvoice.paymentHistory = [
          ...(existingInvoice.paymentHistory || []),
          {
            amount: params.payAmount,
            method: 'Cash',
            date: new Date()
          }
        ]
      }
      await existingInvoice.save()
      return NextResponse.json({
        noResult: false,
        message: "Invoice activated",
        result: existingInvoice,
        error: false
      })
    }
    else {
      const orders = await ServiceOrder.find({
        companyId: company._id,
      })

      const now = new Date();
      const shortYear = String(now.getFullYear()).slice(-2);
      const month = String(now.getMonth() + 1).padStart(2, '0');

      const invoiceNumber = `${company.invoiceCode}${shortYear}${month}${formatNumber(orders.length + 1)}`

      await ServiceOrder.updateOne(
        {
          _id: so._id
        },
        {
          $inc: {
            billed: 1
          }
        }
      )

      const newInvoice = await Invoice.create({
        companyId: company._id,
        salesOrderId: so._id,
        date: params.date ? new Date(params.date) : new Date(),
        invoiceNumber: invoiceNumber,
        salesOrderNumber: so.salesOrderNumber,
        paid: false,
        payAmount: params.payAmount ?? 0,
        status: params.status,
        missing: params.missing,
        invoiceType: 'service',
        paymentHistory: params.payAmount > 0 ? [
          {
            amount: params.payAmount,
            method: 'Cash',
            date: new Date()
          }
        ] : []
      })

      return NextResponse.json({
        noResult: false,
        message: "Invoice created and activated",
        result: newInvoice,
        error: false
      })
    }

  }
  catch (e: unknown) {
    return NextResponse.json({
      noResult: true,
      message: e instanceof Error ? e.message : 'Unknown error',
      result: null,
      error: true
    })
  }
}