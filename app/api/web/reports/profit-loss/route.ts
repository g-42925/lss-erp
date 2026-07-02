import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

import Order from '@/models/Order';
import Product from '@/models/Product';
import Companie from '@/models/Companie';

// We implement an aggregation just like GET /api/web/products to get current stock and calculate approximate unit cost
async function getProductsUnitCostMap(companyId: string) {
  const byType = await Product.aggregate([
    {
      $match: {
        productOf: companyId,
        productType: 'good'
      }
    },
    {
      $lookup: {
        from: "batches",
        localField: "_id",
        foreignField: "productId",
        as: "batches",
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$status", "ACTIVE"] }
                ]
              }
            }
          }
        ]
      }
    },
    {
      $unwind: {
        path: "$batches",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $group: {
        _id: "$_id",
        doc: { $first: "$$ROOT" },
        accumulative: { $sum: "$batches.accumulative" },
        out: { $sum: "$batches.outQty" }
      }
    },
    {
      $addFields: {
        remain: {
          $subtract: ["$accumulative", "$out"]
        }
      }
    },
    {
      $replaceRoot: {
        newRoot: {
          $mergeObjects: [
            "$doc",
            {
              remain: "$remain",
            }
          ]
        }
      }
    },
    {
      $project: {
        batches: 0,
      }
    },
    {
      $lookup: {
        from: "allocations",
        localField: "_id",
        foreignField: "productId",
        as: "allocations"
      }
    },
    {
      $addFields: {
        allocated: {
          $sum: {
            $map: {
              input: "$allocations",
              as: "a",
              in: "$$a.qty"
            }
          }
        }
      }
    },
    {
      $project: {
        allocations: 0,
      }
    }
  ]);

  const unitCostMap = new Map();

  for (const product of byType) {
    const totalQty = Math.max(1, (product.remain || 0) + (product.allocated || 0));
    // If unitCostStock exists and is manually set, we could use it, but usually stockValue is more reliable for average cost
    const stockValue = product.stockValue || 0;
    const unitCost = Math.round(stockValue / totalQty);
    unitCostMap.set(product._id.toString(), unitCost);
  }

  // Also handle services which might have a different structure or 0 cost
  const services = await Product.find({ productOf: companyId, productType: 'service' });
  for (const service of services) {
    unitCostMap.set(service._id.toString(), service.unitCostStock || 0); // Services usually have 0 or manual unit cost
  }

  return unitCostMap;
}

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: true, message: "Company Master Account ID is required", noResult: true, result: null });
    }

    const company = await Companie.findOne({ masterAccountId: id });
    if (!company) {
      return NextResponse.json({ error: true, message: "Company not found", noResult: true, result: null });
    }

    // 1. Fetch Orders with populated fields
    const orders = await Order.find({ companyId: company._id })
      .populate('customerId', 'customerName')
      .populate('cart.productId', 'productName')
      .populate('cart.warehouseId', 'name')
      .sort({ saleDate: -1 });

    // 2. Fetch current unit costs map
    const unitCostMap = await getProductsUnitCostMap(company._id);

    // 3. Process data into transactions per item
    const reportData = [];

    for (const order of orders) {
      if (!order.cart || order.cart.length === 0) continue;

      for (const item of order.cart) {
        if (!item.productId) continue;

        const productIdStr = item.productId._id ? item.productId._id.toString() : item.productId.toString();

        // Modal Cost (per unit)
        const unitCost = unitCostMap.get(productIdStr) || 0;

        // Selling Price (per unit) - handled safely to avoid NaN
        const subTotal = item.subTotal || 0;
        const qty = item.qty || 1;
        const sellingPricePerUnit = subTotal / qty;

        // Profit / Loss calculation
        const totalCost = unitCost * qty;
        const totalProfitOrLoss = subTotal - totalCost;

        const isProfit = totalProfitOrLoss >= 0;

        reportData.push({
          id: `${order._id}-${productIdStr}`,
          orderId: order._id,
          salesOrderNumber: order.salesOrderNumber,
          saleDate: order.saleDate,
          customerName: order.customerId?.customerName || order.customCustomer?.name || 'Walk-in Customer',
          productName: item.productId.productName || 'Unknown Product',
          warehouseName: item.warehouseId?.name || '-',
          qty: qty,
          sellingPricePerUnit: sellingPricePerUnit,
          unitCost: unitCost,
          subTotal: subTotal,
          totalCost: totalCost,
          profitLossAmount: Math.abs(totalProfitOrLoss), // Just absolute value, use isProfit for sign
          status: isProfit ? 'Profit' : 'Loss',
          rawDifference: totalProfitOrLoss
        });
      }
    }

    return NextResponse.json({
      noResult: false,
      message: "Success",
      result: reportData,
      error: false
    });

  } catch (e: unknown) {
    return NextResponse.json({
      noResult: true,
      message: e instanceof Error ? e.message : "Something went wrong",
      result: null,
      error: true
    });
  }
}
