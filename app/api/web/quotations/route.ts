import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

import Companie from "@/models/Companie";
import Quotation from "@/models/Quotation";

export async function POST(request: NextRequest) {
  const body = await request.json();
  try {
    await connectToDatabase();

    const company = await Companie.find({
      masterAccountId: body.masterAccountId,
    });

    if (!company || company.length === 0) {
      throw new Error("Company not found");
    }

    const count = await Quotation.countDocuments({ companyId: company[0]._id });
    const date = new Date();
    const prefix = `QUO-${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    const quotationNumber = `${prefix}-${(count + 1).toString().padStart(4, '0')}`;

    const quotation = await Quotation.create({
      ...body,
      quotationNumber,
      companyId: company[0]._id,
      date: date,
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
  const url = new URL(request.url);
  const masterAccountId = url.searchParams.get("id");

  try {
    await connectToDatabase();
    
    const company = await Companie.find({
      masterAccountId: masterAccountId,
    });

    if (!company || company.length === 0) {
      return NextResponse.json({
        noResult: true,
        message: "Company not found",
        result: [],
        error: false,
      });
    }

    const quotations = await Quotation.find({
      companyId: company[0]._id,
    }).populate('customerId').populate('productId').sort({ createdAt: -1 });

    return NextResponse.json({
      noResult: false,
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
