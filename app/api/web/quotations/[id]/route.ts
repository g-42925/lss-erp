import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import Quotation from "@/models/Quotation";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    
    // In Next.js 15, params is a Promise
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const quotation = await Quotation.findById(id).populate('customerId').populate('productId');

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
      message: "",
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    
    // In Next.js 15, params is a Promise
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const quotation = await Quotation.findByIdAndDelete(id);

    return NextResponse.json({
      noResult: false,
      message: "Quotation deleted",
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const body = await request.json();

    const quotation = await Quotation.findByIdAndUpdate(
      id,
      {
        ...body,
        updatedAt: new Date(),
      },
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
  } catch (e: unknown) {
    return NextResponse.json({
      noResult: true,
      message: e instanceof Error ? e.message : "Something went wrong",
      result: null,
      error: true,
    });
  }
}
