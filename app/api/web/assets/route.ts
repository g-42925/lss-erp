
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Companie from "@/models/Companie";
import Asset from "@/models/Asset";
import AssetCategory from "@/models/AssetCategory";

// GET — list all assets for a company
export async function GET(request: NextRequest) {
  const id = new URL(request.url).searchParams.get("id");

  try {
    await connectToDatabase();

    const company = await Companie.findOne({ masterAccountId: id });

    if (!company) return NextResponse.json({
      error: true,
      message: "Company not found",
      result: null
    });


    const assets = await Asset.find({ companyId: company._id })
      .populate("category", "name")
      .sort({ createdAt: -1 });

    return NextResponse.json({
      error: false,
      message: "",
      result: assets
    });
  }
  catch (e: unknown) {
    return NextResponse.json({
      error: true,
      message: e instanceof Error ? e.message : "Server error",
      result: null
    });
  }
}

// POST — create asset with individual units
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();

    const company = await Companie.findOne({
      masterAccountId: body.masterAccountId
    });

    if (!company) {
      return NextResponse.json({
        error: true,
        message: "Company not found",
        result: null
      });
    }

    const asset = await Asset.create({
      name: body.name,
      category: body.category,
      measurement: body.measurement,
      desc: body.desc ?? "",
      companyId: company._id,
    });

    const populated = await Asset.findById(asset._id)
      .populate("category", "name");

    return NextResponse.json({
      error: false,
      message: "Asset created",
      result: populated
    });

  } catch (e: unknown) {
    return NextResponse.json({
      error: true,
      message: e instanceof Error ? e.message : "Server error",
      result: null
    });
  }
}

// PUT — update an asset
export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const { _id, name, category, measurement, desc } = body;

    if (!_id) {
      return NextResponse.json({
        error: true,
        message: "Asset ID is required",
        result: null
      }, { status: 400 });
    }

    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name;
    if (category !== undefined) updateData.category = category;
    if (measurement !== undefined) updateData.measurement = measurement;
    if (desc !== undefined) updateData.desc = desc;

    const updated = await Asset.findByIdAndUpdate(
      _id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate("category", "name");

    if (!updated) {
      return NextResponse.json({
        error: true,
        message: "Asset not found",
        result: null
      }, { status: 404 });
    }

    return NextResponse.json({
      error: false,
      message: "Asset updated successfully",
      result: updated
    });
  } catch (e: unknown) {
    return NextResponse.json({
      error: true,
      message: e instanceof Error ? e.message : "Server error",
      result: null
    }, { status: 500 });
  }
}

// DELETE — delete an asset by id
export async function DELETE(request: NextRequest) {
  const id = new URL(request.url).searchParams.get("id");

  try {
    await connectToDatabase();

    await Asset.findByIdAndDelete(id);

    return NextResponse.json({
      error: false,
      message: "Asset deleted",
      result: null
    });
  } catch (e: unknown) {
    return NextResponse.json({
      error: true,
      message: e instanceof Error ? e.message : "Server error",
      result: null
    });
  }
}
