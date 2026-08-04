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
    if (!company) return NextResponse.json({ error: true, message: "Company not found", result: null });

    const assets = await Asset.find({ companyId: company._id })
      .populate("category", "name")
      .sort({ createdAt: -1 });

    return NextResponse.json({ error: false, message: "", result: assets });
  } catch (e: unknown) {
    return NextResponse.json({ error: true, message: e instanceof Error ? e.message : "Server error", result: null });
  }
}

// POST — create a new asset
export async function POST(request: NextRequest) {
  const body = await request.json();
  try {
    await connectToDatabase();
    const company = await Companie.findOne({ masterAccountId: body.masterAccountId });
    if (!company) return NextResponse.json({ error: true, message: "Company not found", result: null });

    const asset = await Asset.create({
      name:      body.name,
      category:  body.category,
      addedAt:   body.addedAt ? new Date(body.addedAt) : new Date(),
      condition: body.condition,
      status:    body.status,
      desc:      body.desc,
      companyId: company._id,
    });

    const populated = await Asset.findById(asset._id).populate("category", "name");
    return NextResponse.json({ error: false, message: "Asset created", result: populated });
  } catch (e: unknown) {
    return NextResponse.json({ error: true, message: e instanceof Error ? e.message : "Server error", result: null });
  }
}

// DELETE — delete an asset by id
export async function DELETE(request: NextRequest) {
  const id = new URL(request.url).searchParams.get("id");
  try {
    await connectToDatabase();
    await Asset.findByIdAndDelete(id);
    return NextResponse.json({ error: false, message: "Asset deleted", result: null });
  } catch (e: unknown) {
    return NextResponse.json({ error: true, message: e instanceof Error ? e.message : "Server error", result: null });
  }
}
