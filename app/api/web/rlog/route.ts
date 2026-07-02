import Batche from "@/models/Batche";
import Purchase from "@/models/Purchase";
import Product from "@/models/Product";
import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const url = new URL(request.url)
    const so = url.searchParams.get("so")

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let matchCondition: any = {};
    if (so && so !== 'null') {
      matchCondition = { purchaseOrderNumber: so };
    } else {
      matchCondition = { purchaseOrderNumber: { $exists: true, $ne: null } };
    }

    const batches = await Batche.aggregate([
      {
        $match: matchCondition
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
          from: 'locations',
          localField: 'locationId',
          foreignField: '_id',
          as: 'location'
        }
      },
      {
        $unwind: {
          path: '$location',
          preserveNullAndEmptyArrays: true
        }
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
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: {
          path: '$user',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'lastEditedBy',
          foreignField: '_id',
          as: 'editor'
        }
      },
      {
        $unwind: {
          path: '$editor',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'lastApprovedBy',
          foreignField: '_id',
          as: 'approver'
        }
      },
      {
        $unwind: {
          path: '$approver',
          preserveNullAndEmptyArrays: true
        }
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
    const { _id, qty, expiryDate, approvalCode, editingUserId } = body;

    if (!approvalCode) {
      throw new Error("Approval code is required");
    }

    const User = (await import("@/models/User")).default;
    const approver = await User.findOne({ approvalCode });
    if (!approver) {
      throw new Error("Invalid approval code");
    }

    if (!_id) {
      throw new Error("Batch ID is required");
    }

    const batch = await Batche.findById(_id);
    if (!batch) {
      throw new Error("Batch not found");
    }

    const newQty = parseInt(qty);
    if (isNaN(newQty) || newQty <= 0) {
      throw new Error("Invalid quantity");
    }

    const diff = newQty - batch.qty;
    const isAccumulativeAffected = batch.accumulative !== undefined;

    // Also update Purchase received properties and recalculate stockValue
    let ratio = 1;
    if (batch.purchaseOrderNumber) {
      const purchase = await Purchase.findOne({ purchaseOrderNumber: batch.purchaseOrderNumber, productId: batch.productId });
      if (purchase) {
        if (purchase.measurementId) {
          const Measurement = (await import("@/models/Measurement")).default;
          const config = await Measurement.findById(purchase.measurementId);
          if (config) ratio = config.ratio;
        }

        await Purchase.findByIdAndUpdate(purchase._id, {
          $inc: { receivedQty: diff }
        });

        const product = await Product.findById(purchase.productId);
        if (product && product.stockValue !== undefined) {
          const unitCost = purchase.finalPrice / purchase.quantity;
          const valChange = unitCost * diff;
          await Product.findByIdAndUpdate(product._id, {
            $inc: { stockValue: valChange }
          });
        }
      }
    }

    const diffQty = diff * ratio;
    const InboundLog = (await import("@/models/InboundLog")).default;
    let inboundLog = await InboundLog.findOne({ sourceId: batch._id });
    if (!inboundLog) {
      const batchDate = batch._id.getTimestamp();
      inboundLog = await InboundLog.findOne({
        productId: batch.productId,
        warehouseId: batch.warehouseId,
        date: {
          $gte: new Date(batchDate.getTime() - 10000),
          $lte: new Date(batchDate.getTime() + 10000)
        }
      });
    }

    if (inboundLog) {
      await InboundLog.findByIdAndUpdate(inboundLog._id, {
        $inc: { quantity: diffQty },
        $set: { sourceId: batch._id, sourceType: 'PURCHASE' }
      });
    }


    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updatePayload: any = {
      qty: newQty,
      lastEditedBy: editingUserId,
      lastApprovedBy: approver._id,
      editedAt: new Date()
    };
    if (isAccumulativeAffected) {
      updatePayload.accumulative = batch.accumulative + (diff * ratio);
    }
    if (expiryDate) {
      updatePayload.expiryDate = new Date(expiryDate);
    }

    const updatedBatch = await Batche.findByIdAndUpdate(_id, updatePayload, { new: true });

    return NextResponse.json({
      noResult: false,
      message: "Batch updated successfully",
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