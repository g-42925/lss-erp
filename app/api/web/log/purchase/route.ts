import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import Log from '@/models/Log'

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const purchaseId = url.searchParams.get("purchaseId");

  try {
    await connectToDatabase()

    if (!purchaseId) {
       return NextResponse.json({
         noResult: true,
         message: "purchaseId is required",
         result: null,
         error: true
       })
    }

    const logs = await Log.find({ purchaseId }).sort({ date: 1 });

    return NextResponse.json({
      noResult: logs.length === 0,
      message: "",
      result: logs,
      error: false
    })
  }
  catch (e: any) {
    return NextResponse.json({
      noResult: true,
      message: e.message,
      result: null,
      error: true
    })
  }
}
