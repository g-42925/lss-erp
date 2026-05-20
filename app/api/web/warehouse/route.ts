import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import Warehouse from '@/models/Warehouse';
import Companie from '@/models/Companie';
// Ensure models are registered for populate
import '@/models/Location';



export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const lId = url.searchParams.get("lId");

  try {
    await connectToDatabase();
    const company = await Companie.findOne({
      masterAccountId: id
    });

    if (!company) {
      return NextResponse.json({
        noResult: true,
        message: "Company not found",
        result: null,
        error: true
      });
    }

    const filter: Record<string, unknown> = { companyId: company._id };
    if (lId) filter.locationId = lId;

    const warehouses = await Warehouse.find(filter).populate('locationId');

    return NextResponse.json({
      noResult: false,
      message: "",
      result: warehouses,
      error: false
    });
  } catch (e: unknown) {
    const error = e as Error;
    return NextResponse.json({
      noResult: true,
      message: error.message,
      result: null,
      error: true
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const params = await request.json();
    const company = await Companie.findOne({
      masterAccountId: params.id
    });

    if (!company) {
      return NextResponse.json({
        noResult: true,
        message: "Company not found",
        result: null,
        error: true
      });
    }

    const isExist = await Warehouse.findOne({
      companyId: company._id,
      code: params.code,
    });

    if (isExist) {
      return NextResponse.json({
        noResult: true,
        message: "Warehouse code already exists",
        result: null,
        error: false,
      });
    } else {
      const newWarehouse = await Warehouse.create({
        name: params.name,
        code: params.code,
        locationId: params.locationId,
        companyId: company._id,
      });

      return NextResponse.json({
        noResult: false,
        message: "",
        result: newWarehouse,
        error: false
      });
    }
  } catch (e: unknown) {
    const error = e as Error;
    return NextResponse.json({
      noResult: true,
      message: error.message,
      result: null,
      error: true
    });
  }
}

export async function PUT(req: Request) {
  const body = await req.json();
  const { _id, ...rest } = body;

  try {
    await connectToDatabase();
    const updatedWarehouse = await Warehouse.findByIdAndUpdate(
      _id, rest, { new: true }
    ).populate('locationId');

    return NextResponse.json({
      noResult: false,
      message: "",
      result: updatedWarehouse,
      error: false
    });
  } catch (e: unknown) {
    const error = e as Error;
    return NextResponse.json({
      noResult: true,
      message: error.message,
      result: null,
      error: true
    });
  }
}

export async function DELETE(request: NextRequest) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id")?.trim();
  try {
    await connectToDatabase();
    await Warehouse.findByIdAndDelete(id);
    return NextResponse.json({
      noResult: false,
      message: "",
      result: id,
      error: false
    });
  } catch (e: unknown) {
    const error = e as Error;
    return NextResponse.json({
      noResult: true,
      message: error.message,
      result: null,
      error: true
    });
  }
}
