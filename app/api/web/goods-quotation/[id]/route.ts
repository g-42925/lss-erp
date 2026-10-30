/* eslint-disable @typescript-eslint/no-explicit-any */
import { connectToDatabase } from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import GoodsQuotation from '@/models/GoodsQuotation';
import Customer from '@/models/Customer';
import Product from '@/models/Product';
import SalesCatalog from '@/models/SalesCatalog';

// ─── GET /api/web/goods-quotation/[id] ───────────────────────────────────────
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const quotation = await GoodsQuotation.findById(id)
      .populate({ path: 'customerId', model: Customer })
      .populate({ path: 'items.productId', model: Product })
      .populate({ path: 'items.catalogId', model: SalesCatalog })
      .lean();

    if (!quotation) {
      return NextResponse.json({ error: true, message: 'Quotation tidak ditemukan', result: null, noResult: true });
    }

    return NextResponse.json({ error: false, message: '', result: quotation, noResult: false });
  } catch (e: any) {
    return NextResponse.json({ error: true, message: e.message, result: null, noResult: true });
  }
}

// ─── PUT /api/web/goods-quotation/[id] ───────────────────────────────────────
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await request.json();

    const quotation = await GoodsQuotation.findByIdAndUpdate(
      id,
      { ...body, updatedAt: new Date() },
      { new: true }
    )
      .populate({ path: 'customerId', model: Customer })
      .populate({ path: 'items.productId', model: Product })
      .populate({ path: 'items.catalogId', model: SalesCatalog });

    if (!quotation) {
      return NextResponse.json({ error: true, message: 'Quotation tidak ditemukan', result: null, noResult: true });
    }

    return NextResponse.json({ error: false, message: 'Quotation berhasil diupdate', result: quotation, noResult: false });
  } catch (e: any) {
    return NextResponse.json({ error: true, message: e.message, result: null, noResult: true });
  }
}

// ─── DELETE /api/web/goods-quotation/[id] ────────────────────────────────────
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const quotation = await GoodsQuotation.findById(id);
    if (!quotation) {
      return NextResponse.json({ error: true, message: 'Quotation tidak ditemukan', result: null, noResult: true });
    }
    if (quotation.locked) {
      return NextResponse.json({ error: true, message: 'Quotation terkunci, tidak bisa dihapus', result: null, noResult: true });
    }

    await GoodsQuotation.findByIdAndDelete(id);

    return NextResponse.json({ error: false, message: 'Quotation berhasil dihapus', result: null, noResult: false });
  } catch (e: any) {
    return NextResponse.json({ error: true, message: e.message, result: null, noResult: true });
  }
}
