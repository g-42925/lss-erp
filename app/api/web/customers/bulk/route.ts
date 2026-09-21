import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

import Companie from "@/models/Companie";
import Customer from "@/models/Customer";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { masterAccountId, customers } = body;

  try {
    await connectToDatabase();

    const company = await Companie.find({
      masterAccountId: masterAccountId,
    });

    if (!company || company.length === 0) {
      return NextResponse.json({
        noResult: true,
        message: "Company not found",
        result: null,
        error: true,
      });
    }

    const companyId = company[0]._id;

    // Prepare customers data
    const customersToInsert = customers.map((c: any) => ({
      ...c,
      customerOf: companyId,
      addedOn: new Date(),
      active: c.active || 'yes',
      name: c.name || c.bussinessName,
    }));

    const result = await Customer.insertMany(customersToInsert);

    return NextResponse.json({
      noResult: false,
      message: `${result.length} customers imported successfully`,
      result: result,
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
