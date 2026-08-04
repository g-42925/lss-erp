import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Companie from "@/models/Companie";
import AssetCategory from "@/models/AssetCategory";

// GET — fetch all categories for a company
export async function GET(request: NextRequest) {
  const id = new URL(request.url).searchParams.get("id");
  try {
    await connectToDatabase();
    const company = await Companie.findOne({ masterAccountId: id });
    if (!company) return NextResponse.json({ error: true, message: "Company not found", result: null });

    const categories = await AssetCategory.find({ companyId: company._id }).sort({ name: 1 });
    return NextResponse.json({ error: false, message: "", result: categories });
  } catch (e: unknown) {
    return NextResponse.json({ error: true, message: e instanceof Error ? e.message : "Server error", result: null });
  }
}

// POST — create a new category
export async function POST(request: NextRequest) {
  const body = await request.json();
  try {
    await connectToDatabase();
    const company = await Companie.findOne({ masterAccountId: body.masterAccountId });
    if (!company) return NextResponse.json({ error: true, message: "Company not found", result: null });

    const category = await AssetCategory.create({ name: body.name, companyId: company._id });
    return NextResponse.json({ error: false, message: "Category created", result: category });
  } catch (e: unknown) {
    return NextResponse.json({ error: true, message: e instanceof Error ? e.message : "Server error", result: null });
  }
}

// DELETE — delete a category by id
export async function DELETE(request: NextRequest) {
  const id = new URL(request.url).searchParams.get("id");
  try {
    await connectToDatabase();
    await AssetCategory.findByIdAndDelete(id);
    return NextResponse.json({ error: false, message: "Category deleted", result: null });
  } catch (e: unknown) {
    return NextResponse.json({ error: true, message: e instanceof Error ? e.message : "Server error", result: null });
  }
}
