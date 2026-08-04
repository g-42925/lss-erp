import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Packaging from '@/models/Packaging';
import Companie from '@/models/Companie';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const masterAccountId = searchParams.get('id')

  try {
    await connectToDatabase();

    const company = await Companie.findOne({ masterAccountId })
    if (!company) {
      return NextResponse.json({ noResult: true, message: 'Company not found', result: null, error: true }, { status: 404 });
    }

    const packagings = await Packaging.find({ addedBy: company._id }).sort({ _id: -1 });
    return NextResponse.json({ noResult: false, message: '', result: packagings, error: false });
  } catch (error) {
    return NextResponse.json({ noResult: true, message: 'Error fetching packagings', error: error?.toString(), result: null }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    await connectToDatabase();

    const company = await Companie.findOne({ masterAccountId: data.id })
    if (!company) {
      return NextResponse.json({ noResult: true, message: 'Company not found', result: null, error: true }, { status: 404 });
    }

    const newPackaging = new Packaging({
      name: data.name,
      qty: data.qty,
      addedBy: company._id,
      mainUnit: data.mainUnit
    });

    const savedPackaging = await newPackaging.save();
    return NextResponse.json({ noResult: false, message: '', result: savedPackaging, error: false }, { status: 201 });
  }
  catch (error) {
    return NextResponse.json({ noResult: true, message: 'Error saving packaging', error: error?.toString(), result: null }, { status: 500 });
  }
}
