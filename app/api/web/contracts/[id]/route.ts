import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import Contract from "@/models/Contract";
import Customer from "@/models/Customer";
import Product from "@/models/Product";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const contract = await Contract.findById(id)
      .populate({ path: "customerId", model: Customer })
      .populate({ path: "productId", model: Product });

    if (!contract) {
      return NextResponse.json({
        noResult: true,
        message: "Contract not found",
        result: null,
        error: false,
      });
    }

    return NextResponse.json({
      noResult: false,
      message: "",
      result: contract,
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
    const { id } = await params;
    const body = await request.json();

    const contract = await Contract.findByIdAndUpdate(
      id,
      { ...body },
      { new: true }
    );

    if (!contract) {
      return NextResponse.json({
        noResult: true,
        message: "Contract not found",
        result: null,
        error: false,
      });
    }

    return NextResponse.json({
      noResult: false,
      message: "Contract updated successfully",
      result: contract,
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
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const contract = await Contract.findByIdAndDelete(id);

    return NextResponse.json({
      noResult: false,
      message: "Contract deleted",
      result: contract,
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

