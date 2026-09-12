import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

import Companie from "@/models/Companie";
import Quotation from "@/models/Quotation";
import Customer from "@/models/Customer";

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();

    if (!body.masterAccountId) {
      throw new Error("Master account ID is required");
    }

    const company = await Companie.findOne({
      masterAccountId: body.masterAccountId,
    });

    if (!company) {
      throw new Error("Company not found");
    }

    const count = await Quotation.countDocuments({
      companyId: company._id,
    });

    const date = new Date();

    const prefix = `${company.invoiceCode}-QUO-${date.getFullYear().toString().slice(-2)}${(date.getMonth() + 1).toString().padStart(2, "0")}`;

    const quotationNumber = `${prefix}-${(count + 1)
      .toString()
      .padStart(3, "0")}`;

    const quotation = await Quotation.create({
      ...body,
      quotationNumber,
      companyId: company._id,
      date,
    });

    return NextResponse.json({
      noResult: false,
      message: "Quotation created successfully",
      result: quotation,
      error: false,
    });
  } catch (e: unknown) {
    return NextResponse.json({
      noResult: true,
      message: e instanceof Error ? e.message : "Something went wrong",
      result: null,
      error: true,
    });
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const url = new URL(request.url);

    const masterAccountId = url.searchParams.get("id");
    const customerName = url.searchParams.get("customerName")?.trim();

    if (!masterAccountId) {
      throw new Error("Master account ID is required");
    }

    const company = await Companie.findOne({
      masterAccountId,
    });

    if (!company) {
      return NextResponse.json({
        noResult: true,
        message: "Company not found",
        result: [],
        error: false,
      });
    }

    const filter: Record<string, any> = {
      companyId: company._id,
    };

    if (customerName) {
      const regex = new RegExp(
        customerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i"
      );

      const customers = await Customer.find({
        $or: [
          { name: regex },
          { bussinessName: regex },
        ],
      }).select("_id");

      filter.$or = [
        {
          customerId: {
            $in: customers.map((customer) => customer._id),
          },
        },
        {
          "customCustomer.name": regex,
        },
      ];
    }

    const quotations = await Quotation.find(filter)
      .populate("customerId")
      .populate("productId")
      .sort({ createdAt: -1 });

    return NextResponse.json({
      noResult: quotations.length === 0,
      message: "",
      result: quotations,
      error: false,
    });
  } catch (e: unknown) {
    return NextResponse.json({
      noResult: true,
      message: e instanceof Error ? e.message : "Something went wrong",
      result: null,
      error: true,
    });
  }
}
