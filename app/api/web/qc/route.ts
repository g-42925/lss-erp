import Batche from "@/models/Batche";
import Purchase from "@/models/Purchase";
import Product from "@/models/Product";
import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const url = new URL(request.url)
    const status = url.searchParams.get("status") || "QUARANTINE";

    const batches = await Batche.aggregate([
      {
        $match: { status: status }
      },
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      {
        $unwind: '$product'
      },
      {
        $lookup: {
          from: 'suppliers',
          localField: 'supplierId',
          foreignField: '_id',
          as: 'supplier'
        }
      },
      {
        $unwind: {
          path: '$supplier',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $sort: { createdAt: -1 }
      }
    ])

    return NextResponse.json({
      noResult: false,
      message: "",
      result: batches,
      error: false
    })
  }
  catch (e: unknown) {
    return NextResponse.json(
      {
        noResult: true,
        message: e instanceof Error ? e.message : "Something went wrong",
        result: null,
        error: true
      }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { _id, action, userId } = body;

    if (!_id) throw new Error("Batch ID is required");

    const batch = await Batche.findById(_id);
    if (!batch) throw new Error("Batch not found");
    if (batch.status !== 'QUARANTINE') throw new Error(`Batch cannot be processed (status: ${batch.status})`);

    let updatedBatch;

    if (action === 'approve') {
      // 1. Calculate stock value addition if necessary
      if (batch.purchaseOrderNumber) {
        const purchase = await Purchase.findOne({ purchaseOrderNumber: batch.purchaseOrderNumber, productId: batch.productId });
        if (purchase) {
          const product = await Product.findById(batch.productId);
          
          if (product && product.stockValue !== undefined) {
            const landedCost = (purchase.finalPrice || 0) + (purchase.shippingCost || 0) + (purchase.taxAmount || 0);
            
            let valChange = 0;
            const unitCost = landedCost / purchase.quantity;
            valChange = unitCost * batch.qty;

            await Product.findByIdAndUpdate(product._id, {
              $inc: { stockValue: valChange }
            });
          }
        }
      }

      // 2. Change status to ACTIVE
      updatedBatch = await Batche.findByIdAndUpdate(_id, { 
        status: 'ACTIVE',
        lastApprovedBy: userId,
        editedAt: new Date()
      }, { new: true });

    } else if (action === 'reject') {
      // Change status to REJECTED
      updatedBatch = await Batche.findByIdAndUpdate(_id, { 
        status: 'REJECTED',
        lastApprovedBy: userId,
        editedAt: new Date()
      }, { new: true });
    } else {
      throw new Error("Invalid action");
    }

    return NextResponse.json({
      noResult: false,
      message: `Batch ${action}d successfully`,
      result: updatedBatch,
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
