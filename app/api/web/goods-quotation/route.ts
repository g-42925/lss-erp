/* eslint-disable @typescript-eslint/no-explicit-any */
import { connectToDatabase } from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import Companie from '@/models/Companie';
import GoodsQuotation from '@/models/GoodsQuotation';
import Customer from '@/models/Customer';
import Product from '@/models/Product';
import SalesCatalog from '@/models/SalesCatalog';

// ─── GET /api/web/goods-quotation?id=<masterAccountId> ───────────────────────
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const url = new URL(request.url);
    const masterAccountId = url.searchParams.get('id');
    const customerName = url.searchParams.get('customerName')?.trim();
    const status = url.searchParams.get('status')?.trim();
    const catalogId = url.searchParams.get('catalogId')?.trim();

    if (!masterAccountId) {
      return NextResponse.json({ error: true, message: 'id wajib diisi', result: [], noResult: true });
    }

    const company = await Companie.findOne({ masterAccountId });
    if (!company) {
      return NextResponse.json({ error: true, message: 'Company not found', result: [], noResult: true });
    }

    const filter: Record<string, any> = { companyId: company._id };

    if (status) filter.status = status;

    if (catalogId) {
      filter['items.catalogId'] = catalogId;
    }

    if (customerName) {
      const regex = new RegExp(
        customerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'i'
      );
      const customers = await Customer.find({
        $or: [{ name: regex }, { bussinessName: regex }],
        customerOf: company._id,
      }).select('_id');
      filter.$or = [
        { customerId: { $in: customers.map((c: any) => c._id) } },
        { 'customCustomer.name': regex },
      ];
    }

    const quotations = await GoodsQuotation.find(filter)
      .populate({ path: 'customerId', model: Customer })
      .populate({ path: 'items.productId', model: Product })
      .populate({ path: 'items.catalogId', model: SalesCatalog })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ error: false, message: '', result: quotations, noResult: quotations.length === 0 });
  } catch (e: any) {
    return NextResponse.json({ error: true, message: e.message, result: [], noResult: true });
  }
}

// ─── POST /api/web/goods-quotation ───────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { masterAccountId } = body;

    if (!masterAccountId) {
      return NextResponse.json({ error: true, message: 'masterAccountId wajib diisi', result: null, noResult: true });
    }

    const company = await Companie.findOne({ masterAccountId });
    if (!company) {
      return NextResponse.json({ error: true, message: 'Company not found', result: null, noResult: true });
    }

    // Generate quotation number
    const count = await GoodsQuotation.countDocuments({ companyId: company._id });
    const date = new Date();
    const prefix = `${company.invoiceCode ?? 'GQ'}-GQU-${date.getFullYear().toString().slice(-2)}${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    const quotationNumber = `${prefix}-${(count + 1).toString().padStart(4, '0')}`;

    const {
      customerId,
      customCustomer,
      items,
      discountType,
      discountValue,
      subtotal,
      totalDiscount,
      totalTax,
      grandTotal,
      note,
      termsConditions,
      validUntil,
      status,
      createdBy,
    } = body;

    const quotation = await GoodsQuotation.create({
      quotationNumber,
      companyId: company._id,
      customerId: customerId || undefined,
      customCustomer: customCustomer || { name: '', address: '', phone: '', email: '' },
      date,
      validUntil: validUntil ? new Date(validUntil) : undefined,
      items: items || [],
      discountType: discountType || 'none',
      discountValue: discountValue || 0,
      subtotal: subtotal || 0,
      totalDiscount: totalDiscount || 0,
      totalTax: totalTax || 0,
      grandTotal: grandTotal || 0,
      note: note || '',
      termsConditions: termsConditions || '',
      status: status || 'draft',
      createdBy: createdBy || undefined,
    });

    return NextResponse.json({ error: false, message: 'Quotation berhasil dibuat', result: quotation, noResult: false });
  } catch (e: any) {
    return NextResponse.json({ error: true, message: e.message, result: null, noResult: true });
  }
}
