import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import Companie from "@/models/Companie";

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({
        noResult: true,
        message: "Missing required query parameter: id",
        result: null,
        error: true,
      });
    }

    const company = await Companie.find({ masterAccountId: id });

    if (!company) {
      return NextResponse.json({
        noResult: true,
        message: "Company not found",
        result: null,
        error: false,
      });
    }

    return NextResponse.json({
      noResult: false,
      message: "success",
      result: company,
      error: false,
    });
  }
  catch (e: any) {
    return NextResponse.json({
      noResult: true,
      message: e.message,
      result: null,
      error: true,
    });
  }
}
