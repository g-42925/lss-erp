import { connectToDatabase } from "@/lib/mongodb";
import Feature from "@/models/feature";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const features = await Feature.aggregate([
      {
        $group: {
          _id: "$group",
          features: {
            $push: {
              _id: "$_id",
              name: "$name",
              link: "$link"
            }
          }
        }
      }
    ]);

    return NextResponse.json({
      noResult: false,
      message: '',
      result: features,
      error: false
    });
  }
  catch (error) {
    return NextResponse.json({ noResult: true, message: (error as Error).message, result: null, error: true });
  }
}