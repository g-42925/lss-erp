import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import Quotation from "@/models/Quotation";

export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const quotation = await Quotation.findByIdAndUpdate(
      body._id,
      { locked: true },
      { new: true }
    );

    if (!quotation) {
      return NextResponse.json({
        noResult: true,
        message: "Quotation not found",
        result: null,
        error: false,
      });
    }

    return NextResponse.json({
      noResult: false,
      message: "Quotation updated successfully",
      result: quotation,
      error: false,
    });
  }
  catch (e: unknown) {
    return NextResponse.json({
      noResult: true,
      message: e instanceof Error ? e.message : "Something went wrong",
      result: null,
      error: true,
    });
  }
}