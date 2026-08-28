import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Journal from "@/models/Journal";
import Companie from "@/models/Companie";
import User from "@/models/User";
import Coa from "@/models/Coa";

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

    const journals = await Journal.find({ companyId: company._id })
      .populate('lines.accountId', 'accountCode accountName category')
      .populate('createdBy', 'name')
      .sort({ date: -1, createdAt: -1 });

    return NextResponse.json({
      noResult: false,
      message: "success",
      result: journals,
      error: false,
    });
  } catch (e: any) {
    console.error("GET Journal Error:", e);
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
    let dateStr = "";
    let description = "";
    let linesStr = "";
    let userId = "";

    try {
      const data = await request.json();
      masterAccountId = data.id;
      dateStr = data.date;
      description = data.description;
      linesStr = data.lines;
      userId = data.userId;
    } catch (err) {
      const formData = await request.formData();
      masterAccountId = formData.get("id") as string;
      dateStr = formData.get("date") as string;
      description = formData.get("description") as string;
      linesStr = formData.get("lines") as string; // JSON string of lines
      userId = formData.get("userId") as string;
    }

    if (!masterAccountId || !dateStr || !description || !linesStr) {
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

    let lines = [];
    try {
      lines = JSON.parse(linesStr);
    } catch (e) {
      return NextResponse.json({
        noResult: true,
        message: "Invalid lines format",
        result: null,
        error: true,
      });
    }

    if (!lines || lines.length === 0) {
      return NextResponse.json({
        noResult: true,
        message: "Journal must have at least one line",
        result: null,
        error: true,
      });
    }

    let totalDebit = 0;
    let totalCredit = 0;

    for (const line of lines) {
      totalDebit += (Number(line.debit) || 0);
      totalCredit += (Number(line.credit) || 0);
    }

    // Floating point precision fix
    totalDebit = Math.round(totalDebit * 100) / 100;
    totalCredit = Math.round(totalCredit * 100) / 100;

    if (totalDebit !== totalCredit) {
      return NextResponse.json({
        noResult: true,
        message: `Journal is not balanced. Debit: ${totalDebit}, Credit: ${totalCredit}`,
        result: null,
        error: true,
      });
    }

    // Generate Journal Number JRN-YYMM-XXXX
    const now = new Date();
    const shortYear = String(now.getFullYear()).slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, '0');
    
    const count = await Journal.countDocuments({ companyId: company._id });
    const journalNumber = `JRN-${shortYear}${month}-${String(count + 1).padStart(4, '0')}`;

    await Journal.create({
      journalNumber,
      date: new Date(dateStr),
      description,
      lines,
      companyId: company._id,
      createdBy: userId || null
    });

    const journals = await Journal.find({ companyId: company._id })
      .populate('lines.accountId', 'accountCode accountName category')
      .populate('createdBy', 'name')
      .sort({ date: -1, createdAt: -1 });

    return NextResponse.json({
      noResult: false,
      message: "Journal created successfully",
      result: journals,
      error: false,
    });

  } catch (e: any) {
    console.error("POST Journal Error:", e);
    return NextResponse.json({
      noResult: true,
      message: e.message || "Something went wrong",
      result: null,
      error: true,
    });
  }
}
