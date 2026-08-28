/* eslint-disable @typescript-eslint/no-explicit-any */
import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

import Measurement from '@/models/Measurement'
import Product from '@/models/Product'
import Batche from '@/models/Batche'
import Asset from '@/models/Asset'
import Purchase from '@/models/Purchase'
import Companie from '@/models/Companie'
import Supplier from "@/models/Supplier";
import Vendor from "@/models/Vendor";
import Log from '@/models/Log'
import Warehouse from '@/models/Warehouse'
import Location from '@/models/Location'
import InvItem from '@/models/InvItem'
import InboundLog from '@/models/InboundLog'
import Packaging from '@/models/Packaging'

export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase()
    const body = await request.json()
    const { _id, ...rest } = body

    if (rest.action) {
      switch (rest.action) {
        case "edit_pr":
          await Purchase.findByIdAndUpdate(_id, {
            quantity: rest.quantity,
            estimatedPrice: rest.estimatedPrice,
            productId: rest.productId
          });
          return NextResponse.json({ noResult: false, message: "PR updated", result: true, error: false });
        case "approve_pr":
          await Purchase.findByIdAndUpdate(_id, { status: "approved", approvedBy: rest.userId, approvedAt: new Date() });
          return NextResponse.json({ noResult: false, message: "PR approved", result: true, error: false });
        case "reject_pr":
          await Purchase.findByIdAndUpdate(_id, { status: "rejected" });
          return NextResponse.json({ noResult: false, message: "PR rejected", result: true, error: false });
        case "convert_to_po":
          const updateData: any = {
            status: "ordered",
            finalPrice: rest.finalPrice,
            payAmount: rest.payAmount || 0,
            quantity: rest.quantity,
            shippingCost: rest.shippingCost || 0,
            taxAmount: rest.taxAmount || 0,
          };
          if (rest.purchaseType === 'product') {
            updateData.supplierId = rest.supplierId;
          } else if (rest.purchaseType === 'procurement') {
            updateData.customSupplier = rest.customSupplier;
          }
          await Purchase.findByIdAndUpdate(_id, updateData);

          if (rest.payAmount && rest.payAmount > 0) {
            await Log.create({
              purchaseId: _id,
              date: new Date(),
              amount: rest.payAmount,
              initial: true,
              paymentNumber: `PL-${String(Date.now()).slice(-5)}`,
              type: 'payment',
              paymentMethod: rest.paymentMethod || 'Cash',
              createdBy: rest.userId,
            });
          }
          return NextResponse.json({ noResult: false, message: "PO created", result: true, error: false });
      }
    }

    if (rest.status != 'ordered') {

      const status = rest.status === '_approved' || rest.status === '__approved' || rest.status === '___approved' ? 'ordered' : rest.status

      await Purchase.findById(_id)

      // memberikan approvel atau menolak (oleh module finance)

      if (status != 'ordered') {
        await Purchase.findByIdAndUpdate(
          _id, {
          ...rest,
          status
        }
        )
      }

      // merubah supplier (melalui module purchase)

      if (rest.status == '__approved') {

        const first = await Log.findOne({
          purchaseId: _id,
          initial: true
        })

        if (first) {
          await Log.findByIdAndUpdate(
            first._id, {
            amount: rest.payAmount
          }
          )
        }

        if (rest.purchaseType === 'procurement') {
          // procurement does not involve a supplier
          await Purchase.findByIdAndUpdate(
            _id, {
            finalPrice: rest.finalPrice,
            payAmount: rest.payAmount,
            quantity: rest.quantity,
            customSupplier: rest.customSupplier
          }
          )
          return NextResponse.json(
            {
              noResult: false,
              message: "",
              result: body,
              error: false
            }
          )
        }

        if (rest.purchaseType === 'product') {
          const spl = await Supplier.findById(rest.supplierId)
          const result = { ...body, spl }
          await Purchase.findByIdAndUpdate(
            _id, {
            finalPrice: rest.finalPrice,
            payAmount: rest.payAmount,
            supplierId: rest.supplierId,
            quantity: rest.quantity
          }
          )

          return NextResponse.json(
            {
              noResult: false,
              message: "",
              result: result,
              error: false
            }
          )
        }
        else {
          const vnd = await Vendor.findById(rest.vendorId)
          const result = { ...body, vnd }
          await Purchase.findByIdAndUpdate(
            _id, {
            finalPrice: rest.finalPrice,
            payAmount: rest.payAmount,
            vendorId: rest.vendorId
          }
          )
          return NextResponse.json(
            {
              noResult: false,
              message: "",
              result: result,
              error: false
            }
          )
        }
      }

      // merubah pay amount (melalui module finance)

      if (rest.status === '___approved') {
        if (rest.type === 'adjustment') {
          const ref = await Log.findOne({ paymentNumber: rest.reference })
          if (rest.newPayAmt > ref.amount || ref.type === "adjustment") {
            return NextResponse.json({
              noResult: true,
              message: "correction amount is invalid",
              result: true,
              error: false
            })
          }
          else {
            await Purchase.findByIdAndUpdate(
              _id, {
              $inc: {
                payAmount: -rest.newPayAmt
              }
            },
            )
          }
        }

        const reference = rest.reference ?? null

        const amt = rest.type === "adjustment" ? rest.newPayAmt - (rest.newPayAmt * 2) : rest.newPayAmt

        if (rest.purchaseType === 'product' || rest.purchaseType === 'procurement') {

          await Log.create({
            purchaseId: _id,
            date: rest.date || new Date(),
            amount: amt,
            initial: false,
            paymentNumber: `PL-${String(Date.now()).slice(-5)}`,
            type: rest.type,
            reference,
            paymentMethod: rest.paymentMethod,
            createdBy: rest.userId,
          })

          if (rest.type === "payment") {
            await Purchase.findByIdAndUpdate(
              _id, {
              payAmount: rest.payAmount,
              editable: false
            }
            )
          }
          return NextResponse.json(
            {
              noResult: false,
              message: "",
              result: body,
              error: false
            }
          )
        }
        else {

          // code type x2

          await Log.create({
            purchaseId: _id,
            date: rest.date || new Date(),
            amount: amt,
            initial: false,
            paymentNumber: `PL-${String(Date.now()).slice(-5)}`,
            type: rest.type,
            reference,
            paymentMethod: rest.paymentMethod,
            createdBy: rest.userId,
            to: { name: rest.to }
          })

          if (rest.type === "payment") {
            await Purchase.findByIdAndUpdate(
              _id, {
              payAmount: rest.payAmount,
              editable: false
            }
            )
          }

          return NextResponse.json(
            {
              noResult: false,
              message: "",
              result: body,
              error: false
            }
          )
        }
      }

      // melakukan order (melalui module purchase)

      if (rest.status === '_approved') {


        await Log.create({
          purchaseId: _id,
          date: rest.date || new Date(),
          amount: rest.payAmount,
          initial: true,
          paymentNumber: `PL-${String(Date.now()).slice(-5)}`,
          type: 'payment',
          paymentMethod: rest.paymentMethod,
          createdBy: rest.userId,
        })

        if (rest.purchaseType === 'procurement') {
          // procurement does not involve a supplier
          await Purchase.findByIdAndUpdate(_id, {
            ...rest,
            status: 'ordered',
          })

          return NextResponse.json(
            {
              noResult: false,
              message: "",
              result: body,
              error: false
            }
          )
        }

        if (rest.purchaseType === 'product') {
          let splMeasurementConfig = {}
          const spl = await Supplier.findById(rest.supplierId)

          const product = await Product.findById(rest.productId)

          if (product && product.toObject().conversionRatioX != product.toObject().conversionRatioY) {
            // Measurement config is no longer supplier-specific; search by productId only
            const config = await Measurement.findOne({
              productId: rest.productId,
            })

            if (config) {
              splMeasurementConfig = {
                measurementId: config._id
              }
            }
            // If no config found, proceed without it (no error)
          }

          await Purchase.findByIdAndUpdate(_id, {
            ...rest,
            status: 'ordered',
            ...splMeasurementConfig
          })

          const result = { ...body, spl }

          return NextResponse.json(
            {
              noResult: false,
              message: "",
              result: result,
              error: false
            }
          )
        }
        else {
          const vnd = await Vendor.findById(rest.vendorId)


          await Purchase.findByIdAndUpdate(_id, {
            ...rest,
            status: 'ordered'
          })

          const result = { ...body, vnd }

          return NextResponse.json(
            {
              noResult: false,
              message: "",
              result: result,
              error: false
            }
          )
        }
      }
      else {
        return NextResponse.json(
          {
            noResult: false,
            message: "",
            result: body,
            error: false
          }
        )
      }
    }

    // rumus unit cost
    // (total semua harga purchase sebelumnya + harga beli terbaru) / (total stock + jumlah beli)

    if (rest.status === "ordered") {
      const purchase = await Purchase.findById(_id)
      const landedCost = (purchase.finalPrice || 0) + (purchase.shippingCost || 0) + (purchase.taxAmount || 0);

      if (purchase.purchaseType === 'procurement') {
        const received = parseInt(rest.qty);
        await Purchase.findByIdAndUpdate(_id, {
          $inc: { receivedQty: received }
        });
        
        if (rest.saveAs === 'asset') {
          // Create Asset records (1 per received qty since qty field was removed)
          let companyId = purchase.companyId;

          if (companyId) {
             const invItem = await InvItem.findById(purchase.productId);
             const assetPromises = [];
             for (let i = 0; i < received; i++) {
               assetPromises.push(Asset.create({
                 name: invItem?.name || "Received Asset",
                 category: rest.assetCategoryId,
                 addedAt: new Date(),
                 condition: "good",
                 status: "active",
                 desc: "Received from PO: " + purchase.purchaseOrderNumber,
                 companyId: companyId
               }));
             }
             await Promise.all(assetPromises);
          }
        } else {
          // Save as inventory
          await InvItem.findByIdAndUpdate(purchase.productId, {
            $inc: { currentStock: received }
          });
        }
        
        return NextResponse.json({
          noResult: false,
          message: "",
          result: {},
          error: false
        })
      }

      if (purchase.toObject().hasOwnProperty('measurementId')) {
        const config = await Measurement.findById(purchase.measurementId)

        const product = await Product.findById(purchase.productId)


        // stockValue update deferred to QC approval
        const warehouse = await Warehouse.findById(rest.warehouseId)

        let resolvedLocationId = warehouse?.locationId || rest.locationId;
        if (!resolvedLocationId) {
          const defaultLoc = await Location.findOne();
          resolvedLocationId = defaultLoc?._id;
        }


        const batchCreated = await Batche.create({
          ...rest,
          status: 'QUARANTINE',
          batchNumber: `B-${String(Date.now()).slice(-5)}`,
          accumulative: config.ratio * rest.qty,
          reserved: 0,
          locationId: resolvedLocationId,
          createdAt: new Date()
        }) as any

        console.log(rest)

        await InboundLog.create({
          warehouseId: rest.warehouseId,
          productId: purchase.productId,
          date: new Date(),
          quantity: config.ratio * rest.qty,
          sourceId: batchCreated._id,
          sourceType: 'PURCHASE'
        })

      }
      else {
        // ─── No Measurement config: handle conversionType "value" or packaging ───
      const product = await Product.findById(purchase.productId)
      const warehouse = await Warehouse.findById(rest.warehouseId)

      // stockValue update deferred to QC approval

      let resolvedLocationId = warehouse?.locationId || rest.locationId;
      if (!resolvedLocationId) {
        const defaultLoc = await Location.findOne();
        resolvedLocationId = defaultLoc?._id;
      }

      // Determine accumulative qty based on conversionType
      let accumulativeQty = parseInt(rest.qty)

      if (product.conversionType === 'value' && product.conversionValue) {
        // conversionValue: 1 unit of conversionRatioX = conversionValue units of conversionRatioY
        accumulativeQty = product.conversionValue * parseInt(rest.qty)
      } else if (product.packagingId) {
        // Packaging: 1 pack = packaging.qty units
        const packaging = await Packaging.findById(product.packagingId)
        if (packaging && packaging.qty) {
          accumulativeQty = packaging.qty * parseInt(rest.qty)
        }
      }

      const batchCreated = await Batche.create({
        ...rest,
        status: 'QUARANTINE',
        batchNumber: `B-${String(Date.now()).slice(-5)}`,
        accumulative: accumulativeQty,
        reserved: 0,
        locationId: resolvedLocationId,
        createdAt: new Date()
      }) as any

      console.log(rest)

      await InboundLog.create({
        warehouseId: rest.warehouseId,
        productId: purchase.productId,
        date: new Date(),
        quantity: accumulativeQty,
        sourceId: batchCreated._id,
        sourceType: 'PURCHASE'
      })

        console.log(rest)
      }

      return NextResponse.json({
        noResult: false,
        message: "",
        result: {},
        error: false
      })
    }
  }
  catch (e: any) {
    return NextResponse.json({
      noResult: true,
      message: e.message,
      result: null,
      error: true
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase()
    const params = await request.json()
    const company = await Companie.findOne({
      masterAccountId: params.id
    })

    const p = await Purchase.findOne({
      companyId: company._id,
      productId: params.productId,
      status: 'requested'
    })

    if (p) {
      return NextResponse.json({
        noResult: true,
        message: "product already ordered",
        result: null,
        error: true
      })
    }

    console.log({ p: params })

    const result = await Purchase.create({
      ...params,
      companyId: company._id,
      editable: true,
      receivedQty: 0,
      purchaseOrderNumber: `PO-${String(Date.now()).slice(-5)}`
    })

    const requested = (result as any)._doc

    const [agg] = await Purchase.aggregate(
      [
        {
          $match: {
            _id: requested._id
          }
        },
        {
          $lookup: {
            from: params.purchaseType === 'procurement' ? 'invitems' : 'products',
            localField: 'productId',
            foreignField: '_id',
            as: 'product'
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'createdBy',
            foreignField: '_id',
            as: 'createdBy'
          }
        },
        {
          $unwind: '$createdBy'
        },
        {
          $unwind: {
            path: '$product',
            preserveNullAndEmptyArrays: true
          }
        },
      ]
    )

    console.log({ agg })

    const r = {
      ...requested,
      ...((params.purchaseType === 'product' || params.purchaseType === 'procurement') && { product: agg?.product }),
      createdBy: agg?.createdBy
    }


    return NextResponse.json(
      {
        noResult: false,
        message: "",
        result: r,
        error: false
      }
    )
  }
  catch (e: any) {
    return NextResponse.json(
      {
        noResult: true,
        message: e.message,
        result: null,
        error: true
      }
    )
  }
}


export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const type = url.searchParams.get("type");

  try {
    await connectToDatabase()
    const cmp = await Companie.findOne({
      masterAccountId: id
    })

    const prs = await Purchase.aggregate(
      [
        {
          $match: {
            companyId: cmp._id,
            purchaseType: type
          }
        },
        {
          $lookup: {
            from: type === 'procurement' ? 'invitems' : 'products',
            localField: 'productId',
            foreignField: '_id',
            as: 'product'
          }
        },
        {
          $unwind: {
            path: '$product',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            'productId': 0,
            'companyId': 0
          }
        },
        {
          $lookup: {
            from: 'vendors',
            localField: 'vendorId',
            foreignField: '_id',
            as: 'vendor'
          }
        },
        {
          $unwind: {
            path: '$vendor',
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
            from: 'batches',
            localField: 'purchaseOrderNumber',
            foreignField: 'purchaseOrderNumber',
            as: 'batches'
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'createdBy',
            foreignField: '_id',
            as: 'createdBy'
          }
        },
        {
          $unwind: '$createdBy'
        },
        {
          $lookup: {
            from: 'users',
            localField: 'approvedBy',
            foreignField: '_id',
            as: 'approvedBy'
          }
        },
        {
          $unwind: {
            path: '$approvedBy',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'voidedBy',
            foreignField: '_id',
            as: 'voidedBy'
          }
        },
        {
          $unwind: {
            path: '$voidedBy',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $addFields: {
            receivedQty: {
              $cond: {
                if: { $eq: ["$purchaseType", "procurement"] },
                then: { $ifNull: ["$receivedQty", 0] },
                else: { $sum: "$batches.qty" }
              }
            }
          }
        },
        {
          $project: {
            'batches': 0
          }
        }
      ]
    )

    return NextResponse.json(
      {
        noResult: false,
        message: "",
        result: prs,
        error: false
      }
    )
  }
  catch (e: any) {
    return NextResponse.json(
      {
        noResult: true,
        message: e.message,
        result: null,
        error: true
      }
    )
  }
}