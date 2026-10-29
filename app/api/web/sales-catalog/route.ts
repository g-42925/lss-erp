/* eslint-disable @typescript-eslint/no-explicit-any */
import { connectToDatabase } from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import Companie from '@/models/Companie';
import SalesCatalog from '@/models/SalesCatalog';
import Product from '@/models/Product';

// ─── GET /api/web/sales-catalog?id=<masterAccountId> ─────────────────────────
// Returns all catalog items for the company, with variant count per catalog.
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const url = new URL(request.url);
    const masterAccountId = url.searchParams.get('id');

    if (!masterAccountId) {
      return NextResponse.json({ noResult: true, message: 'Missing id param', result: null, error: true });
    }

    const company = await Companie.findOne({ masterAccountId });
    if (!company) {
      return NextResponse.json({ noResult: true, message: 'Company not found', result: null, error: true });
    }

    const catalogs = await SalesCatalog.find({ companyId: company._id }).sort({ name: 1 }).lean();

    // Attach variant count to each catalog
    const catalogIds = catalogs.map((c: any) => c._id);
    const variantCounts = await Product.aggregate([
      { $match: { catalogId: { $in: catalogIds } } },
      { $group: { _id: '$catalogId', count: { $sum: 1 } } },
    ]);

    const countMap: Record<string, number> = {};
    for (const vc of variantCounts) {
      countMap[String(vc._id)] = vc.count;
    }

    const result = catalogs.map((c: any) => ({
      ...c,
      variantCount: countMap[String(c._id)] ?? 0,
    }));

    return NextResponse.json({ noResult: false, message: '', result, error: false });
  } catch (e: any) {
    return NextResponse.json({ noResult: true, message: e.message, result: null, error: true });
  }
}

// ─── POST /api/web/sales-catalog ─────────────────────────────────────────────
// Creates a new catalog item.
// Body: { id, name, category?, subCategory?, brand?, description?, unit?, image? }
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { id, name, category, subCategory, brand, description, unit, image } = body;

    if (!id || !name) {
      return NextResponse.json({ noResult: true, message: 'id and name are required', result: null, error: true });
    }

    const company = await Companie.findOne({ masterAccountId: id });
    if (!company) {
      return NextResponse.json({ noResult: true, message: 'Company not found', result: null, error: true });
    }

    const catalogCode = `CAT-${String(Date.now()).slice(-7)}`;

    const catalog = await SalesCatalog.create({
      companyId: company._id,
      name: name.trim(),
      category: category?.trim() ?? '',
      subCategory: subCategory?.trim() ?? '',
      brand: brand?.trim() ?? '',
      description: description?.trim() ?? '',
      unit: unit?.trim() ?? 'pcs',
      catalogCode,
      image: image ?? '',
    });

    return NextResponse.json({ noResult: false, message: '', result: { ...catalog.toObject(), variantCount: 0 }, error: false });
  } catch (e: any) {
    return NextResponse.json({ noResult: true, message: e.message, result: null, error: true });
  }
}

// ─── PUT /api/web/sales-catalog ──────────────────────────────────────────────
// Updates an existing catalog item.
// Body: { id, catalogId, name, category?, subCategory?, brand?, description?, unit?, image? }
export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { id, catalogId, name, category, subCategory, brand, description, unit, image } = body;

    if (!id || !catalogId || !name) {
      return NextResponse.json({ noResult: true, message: 'id, catalogId, and name are required', result: null, error: true });
    }

    const company = await Companie.findOne({ masterAccountId: id });
    if (!company) {
      return NextResponse.json({ noResult: true, message: 'Company not found', result: null, error: true });
    }

    const catalog = await SalesCatalog.findOneAndUpdate(
      { _id: catalogId, companyId: company._id },
      {
        name: name.trim(),
        category: category?.trim() ?? '',
        subCategory: subCategory?.trim() ?? '',
        brand: brand?.trim() ?? '',
        description: description?.trim() ?? '',
        unit: unit?.trim() ?? 'pcs',
        ...(image !== undefined ? { image } : {}),
      },
      { new: true }
    );

    if (!catalog) {
      return NextResponse.json({ noResult: true, message: 'Catalog not found', result: null, error: true });
    }

    const variantCount = await Product.countDocuments({ catalogId: catalog._id });

    return NextResponse.json({ noResult: false, message: '', result: { ...catalog.toObject(), variantCount }, error: false });
  } catch (e: any) {
    return NextResponse.json({ noResult: true, message: e.message, result: null, error: true });
  }
}
