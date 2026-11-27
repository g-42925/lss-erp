import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

import Companie from "@/models/Companie";
import Contract from "@/models/Contract";
import Customer from "@/models/Customer";
import Product from "@/models/Product";

const ROMAN_MONTHS = [
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "XI",
  "XII",
];

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();

    if (!body.masterAccountId) {
      throw new Error("Master account ID is required");
    }

    if (!body.productId) {
      throw new Error("Product ID is required");
    }

    const [company, product] = await Promise.all([
      Companie.findOne({ masterAccountId: body.masterAccountId }).lean(),
      Product.findById(body.productId).lean<{
        alias?: string;
        productId?: string;
      } | null>(),
    ]);

    if (!company) {
      throw new Error("Company not found");
    }

    if (!product) {
      throw new Error("Product not found");
    }

    const existingContracts = await Contract.find({
      companyId: company._id,
    })
      .select("contractNumber")
      .lean<{ contractNumber?: string }[]>();

    let maxNumber = existingContracts.length;
    for (const item of existingContracts) {
      const match = item.contractNumber?.match(/^(\d+)\//);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!Number.isNaN(num) && num > maxNumber) {
          maxNumber = num;
        }
      }
    }

    const date = new Date();
    const romanMonth = ROMAN_MONTHS[date.getMonth()];
    const year = date.getFullYear();
    const productAlias = product.alias?.trim() || product.productId || "-";
    const contractNumber = `${maxNumber + 1}/${company.invoiceCode}/${productAlias}/${romanMonth}/${year}`;

    const { masterAccountId: _remove, ...rest } = body;

    const contract = await Contract.create({
      ...rest,
      contractNumber,
      companyId: company._id,
    });

    return NextResponse.json({
      noResult: false,
      message: "Contract created successfully",
      result: contract,
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

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const url = new URL(request.url);
    const masterAccountId = url.searchParams.get("id");
    const customerName = url.searchParams.get("customerName")?.trim();
    const contractNumber = url.searchParams.get("contractNumber")?.trim();

    if (!masterAccountId) {
      throw new Error("Master account ID is required");
    }

    const company = await Companie.findOne({ masterAccountId });

    if (!company) {
      return NextResponse.json({
        noResult: true,
        message: "Company not found",
        result: [],
        error: false,
      });
    }

    const filter: Record<string, any> = {
      companyId: company._id,
    };

    if (contractNumber) {
      filter.contractNumber = contractNumber;
    }

    if (customerName) {
      const regex = new RegExp(
        customerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i"
      );

      const customers = await Customer.find({
        $or: [{ name: regex }, { bussinessName: regex }],
      }).select("_id");

      filter.customerId = { $in: customers.map((c) => c._id) };
    }

    const contracts = await Contract.find(filter)
      .populate({ path: "customerId", model: Customer })
      .populate({ path: "productId", model: Product })
      .sort({ _id: -1 });

    return NextResponse.json({
      noResult: contracts.length === 0,
      message: "",
      result: contracts,
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

