import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Coa from "@/models/Coa";
import Companie from "@/models/Companie";

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const url = new URL(request.url);
    const id = url.searchParams.get("id"); // masterAccountId

    if (!id) {
      return NextResponse.json({
        noResult: true,
        message: "Missing masterAccountId",
        result: null,
        error: true,
      });
    }

    const company = await Companie.findOne({ masterAccountId: id });
    if (!company) {
      return NextResponse.json({
        noResult: true,
        message: "Company not found",
        result: null,
        error: true,
      });
    }

    const coas = await Coa.find({ companyId: company._id }).sort({ accountCode: 1 });

    return NextResponse.json({
      noResult: false,
      message: "success",
      result: coas,
      error: false,
    });
  } catch (e: any) {
    console.error("GET COA Error:", e);
    return NextResponse.json({
      noResult: true,
      message: e.message || "Something went wrong",
      result: null,
      error: true,
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
    let masterAccountId = "";
    let accountCode = "";
    let accountName = "";
    let category = "";

    try {
      const data = await request.json();
      masterAccountId = data.id;
      accountCode = data.accountCode;
      accountName = data.accountName;
      category = data.category;
    } catch (err) {
      // Fallback for form-data if needed
      const formData = await request.formData();
      masterAccountId = formData.get("id") as string;
      accountCode = formData.get("accountCode") as string;
      accountName = formData.get("accountName") as string;
      category = formData.get("category") as string;
    }

    if (!masterAccountId || !accountCode || !accountName || !category) {
      return NextResponse.json({
        noResult: true,
        message: "Missing required fields",
        result: null,
        error: true,
      });
    }

    const company = await Companie.findOne({ masterAccountId });
    if (!company) {
      return NextResponse.json({
        noResult: true,
        message: "Company not found",
        result: null,
        error: true,
      });
    }

    // Check for duplicate accountCode
    const existing = await Coa.findOne({ companyId: company._id, accountCode });
    if (existing) {
      return NextResponse.json({
        noResult: true,
        message: `Account Code ${accountCode} already exists`,
        result: null,
        error: true,
      });
    }

    const coa = await Coa.create({
      accountCode,
      accountName,
      category,
      companyId: company._id
    });

    const coas = await Coa.find({ companyId: company._id }).sort({ accountCode: 1 });

    return NextResponse.json({
      noResult: false,
      message: "COA created successfully",
      result: coas,
      error: false,
    });

  } catch (e: any) {
    console.error("POST COA Error:", e);
    return NextResponse.json({
      noResult: true,
      message: e.message || "Something went wrong",
      result: null,
      error: true,
    });
  }
}
