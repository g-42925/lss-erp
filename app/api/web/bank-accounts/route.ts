import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

import Companie from "@/models/Companie";
import BankAccount from "@/models/BankAccount";
import User from "@/models/User";

export async function POST(request: NextRequest) {
  const body = await request.json();
  try {
    await connectToDatabase();

    const company = await Companie.find({ masterAccountId: body.id });

    const account = await BankAccount.create({
      bank: body.bank,
      accountNumber: body.accountNumber,
      accountName: body.accountName,
      addedBy: company[0]._id,
      balance: body.balance,
    });

    return NextResponse.json({
      noResult: false,
      message: "",
      result: account,
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

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { _id, approval, ...rest } = body;

  try {
    await connectToDatabase();
    const user = await User.findOne({ approvalCode: approval });
    if (!user) return NextResponse.json({
      noResult: true,
      message: "Invalid manager code",
      result: null,
      error: true,
    });

    const updated = await BankAccount.findByIdAndUpdate(_id, rest, { new: true });
    return NextResponse.json({
      noResult: false,
      message: "",
      result: updated,
      error: false,
    });
  }
  catch (e: unknown) {
    return NextResponse.json({
      noResult: true,
      message: e instanceof Error ? e.message : "Something went wrong",
      result: null,
      error: true,
    });
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  try {
    await connectToDatabase();
    const company = await Companie.find({ masterAccountId: id });

    const accounts = await BankAccount.find({ addedBy: company[0]._id }).sort({ createdAt: -1 });

    return NextResponse.json({
      noResult: false,
      message: "",
      result: accounts,
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

export async function DELETE(request: NextRequest) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  try {
    await connectToDatabase();
    await BankAccount.findByIdAndDelete(id);
    return NextResponse.json({
      noResult: false,
      message: "",
      result: id,
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
