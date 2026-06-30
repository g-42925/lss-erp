import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import mongoose from "mongoose";

import ProductQuotation from '@/models/ProductQuotation'
import ServiceQuotation from '@/models/ServiceQuotation'
import Order from '@/models/Order'
import Companie from '@/models/Companie'
import Invoice from '@/models/Invoice'
import Batche from '@/models/Batche'
import Reservation from '@/models/Reservation'
import Deliverie from '@/models/Deliverie'
import OutboundLog from '@/models/OutboundLog'


export async function POST(request: NextRequest) {
  function formatNumber(x: number) {
    return String(x).padStart(4, '0');
  }

  try {
    await connectToDatabase()
    let contractUploadUrl: string | null = null
    let attachmentUploadUrl: string | null = null
    const formData = await request.formData()
    const contractFile = formData.get("contract") as File
    const attachmentFile = formData.get("attachment") as File
    const payTerm = formData.get("payTerm") as string
    const qNumber = formData.get("qNumber") as string
    const id = formData.get("id") as string
    const paymentMethod = formData.get("paymentMethod") as string || "Cash"
    const pickupDateStr = formData.get("pickupDate") as string | null
    const userId = formData.get("userId") as string | null

    const company = await Companie.findOne({
      masterAccountId: id
    })

    const s3 = new S3Client({
      region: "us-east-1",
      endpoint: "https://s3.filebase.com",
      credentials: {
        accessKeyId: "B8F0135956143AE0685E",
        secretAccessKey: "gKrbIZJnzLWBXZ0VGQvnlAumvngpBH35PsXN5zUp",
      },
    });

    if (contractFile) {
      const contractFileName = contractFile.name;
      const contractFileBuffer = Buffer.from(await contractFile.arrayBuffer());

      const contractUploadCmd = new PutObjectCommand({
        Bucket: "leryn-storage",
        Key: contractFileName,
        Body: contractFileBuffer,
        ContentType: contractFile.type,
        Metadata: {
          cid: "true", // 👈 sama seperti PHP
        },
      });

      await s3.send(contractUploadCmd);

      const h1 = await s3.send(
        new HeadObjectCommand({
          Bucket: "leryn-storage",
          Key: contractFileName,
        })
      );

      contractUploadUrl = `https://wooden-plum-woodpecker.myfilebase.com/ipfs/${h1.Metadata?.cid}`
    }
    if (attachmentFile) {
      const attachmentFileName = attachmentFile.name;
      const attachmentFileBuffer = Buffer.from(await attachmentFile.arrayBuffer());

      const attachmentUploadCmd = new PutObjectCommand({
        Bucket: "leryn-storage",
        Key: attachmentFileName,
        Body: attachmentFileBuffer,
        ContentType: attachmentFile.type,
        Metadata: {
          cid: "true", // 👈 sama seperti PHP
        },
      });

      await s3.send(attachmentUploadCmd);

      const h2 = await s3.send(
        new HeadObjectCommand({
          Bucket: "leryn-storage",
          Key: attachmentFileName,
        })
      );

      attachmentUploadUrl = `https://wooden-plum-woodpecker.myfilebase.com/ipfs/${h2.Metadata?.cid}`
    }

    // ─── DIRECT SERVICE ORDER (no quotation) ─────────────────────────────
    const directOrder = formData.get("directOrder") as string
    if (directOrder === "true") {
      const productRaw = formData.get("productId") as string // "id/sellingPrice"
      const [, defaultPrice] = productRaw ? productRaw.split("/") : ["", "0"]
      const customerName = formData.get("customerName") as string
      const price = parseFloat(formData.get("price") as string) || parseFloat(defaultPrice) || 0
      const contractType = formData.get("contractType") as string
      const frequency = formData.get("frequency") as string
      const range = parseInt(formData.get("range") as string) || 0
      const so = `SO-${String(Date.now()).slice(-5)}`
      const cart = JSON.parse(formData.get("cart") as string)

      const _cart = cart.map((item: any) => {
        return {
          productId: new ObjectId(item.productId.split('/')[0]),
          qty: item.qty,
          subTotal: item.subTotal,
        }
      })

      const order = await Order.create({
        salesOrderId: Date.now(),
        salesOrderNumber: so,
        saleDate: new Date(),
        companyId: company._id,
        customerName: customerName,
        productType: "service",
        contractType,
        frequency,
        range,
        payTerm: parseInt(payTerm) || 0,
        total: price,
        taxValue: 0,
        discountType: "none",
        discountValue: 0,
        contract: contractUploadUrl,
        attachment: attachmentUploadUrl,
        type: "direct",
        cart: _cart,
        createdBy: userId ? new mongoose.Types.ObjectId(userId) : null
      })

      const [_o] = await Order.aggregate([
        { $match: { _id: new ObjectId(order._id) } },
        {
          $lookup: {
            from: "products",
            localField: "cart.productId",
            foreignField: "_id",
            as: "productArr"
          }
        },
        {
          $addFields: {
            product: { $arrayElemAt: ["$productArr", 0] }
          }
        },
        {
          $lookup: {
            from: "customers",
            localField: "customerId",
            foreignField: "_id",
            as: "customerArr"
          }
        },
        {
          $addFields: {
            customer: { $arrayElemAt: ["$customerArr", 0] }
          }
        },
        {
          $project: { productArr: 0, customerArr: 0 }
        }
      ])

      return NextResponse.json({
        noResult: false,
        message: "",
        result: _o,
        error: false
      })
    }
    // ─────────────────────────────────────────────────────────────────────

    // ─── Helper: create reservations if pickupDate is in the future ───────
    async function createReservationsIfNeeded(
      cartItems: Array<{ productId: ObjectId | string; warehouseId?: ObjectId | string; qty: number }>,
      salesOrderNumber: string,
      orderId: ObjectId | string,
      pickupDate: Date | null
    ) {
      if (!pickupDate) return
      const now = new Date()
      // Strip time from both for a pure date comparison
      const pickupDay = new Date(pickupDate.getFullYear(), pickupDate.getMonth(), pickupDate.getDate())
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      if (pickupDay <= today) return // pickup today or earlier → no reservation needed

      for (const item of cartItems) {
        const productObjId = new mongoose.Types.ObjectId(item.productId.toString())
        const warehouseObjId = item.warehouseId
          ? new mongoose.Types.ObjectId(item.warehouseId.toString())
          : null

        // Find batches FIFO to allocate reserved qty
        const batchQuery: Record<string, unknown> = {
          productId: productObjId,
          status: 'ACTIVE',
        }
        if (warehouseObjId) batchQuery.warehouseId = warehouseObjId

        const batches = await Batche.find(batchQuery).sort({ createdAt: 1 })

        let remainingToReserve = item.qty
        for (const batch of batches) {
          if (remainingToReserve <= 0) break
          const freeQty = batch.accumulative - batch.outQty - (batch.reserved || 0)
          if (freeQty <= 0) continue
          const toReserve = Math.min(freeQty, remainingToReserve)

          await Batche.findByIdAndUpdate(batch._id, { $inc: { reserved: toReserve } })

          await Reservation.create({
            batchId: batch._id,
            salesOrderNumber,
            salesOrderId: orderId,
            productId: productObjId,
            warehouseId: warehouseObjId,
            qty: toReserve,
            pickupDate,
            status: 'ACTIVE',
          })

          remainingToReserve -= toReserve
        }
      }
    }

    // ─── Helper: langsung potong stock untuk order biasa (pickup hari ini / tidak ada pickup date) ─
    async function deductStockImmediately(
      cartItems: Array<{ productId: ObjectId | string; warehouseId?: ObjectId | string; qty: number }>,
      salesOrderNumber: string,
      orderId: ObjectId | string,
      createdBy: ObjectId | string | null,
      companyId: ObjectId | string,
    ) {
      const deliveryNumber = `D-${String(Date.now()).slice(-5)}`
      // Kumpulkan semua item yang benar-benar dipotong untuk shipping log
      const deliveryItems: Array<{ productId: mongoose.Types.ObjectId; qty: number; batchNumber: string; locationId: mongoose.Types.ObjectId }> = []

      for (const item of cartItems) {
        const productObjId = new mongoose.Types.ObjectId(item.productId.toString())
        const warehouseObjId = item.warehouseId
          ? new mongoose.Types.ObjectId(item.warehouseId.toString())
          : null

        // Ambil batch FIFO (oldest first) yang masih aktif dan masih ada stok
        const batchQuery: Record<string, unknown> = {
          productId: productObjId,
          status: 'ACTIVE',
        }
        if (warehouseObjId) batchQuery.warehouseId = warehouseObjId

        const batches = await Batche.find(batchQuery).sort({ createdAt: 1 })

        let remainingToDeduct = item.qty
        for (const batch of batches) {
          if (remainingToDeduct <= 0) break
          // Stok bebas = accumulative - outQty - reserved
          const freeQty = batch.accumulative - batch.outQty - (batch.reserved || 0)
          if (freeQty <= 0) continue
          const toDeduct = Math.min(freeQty, remainingToDeduct)

          // Langsung potong outQty
          await Batche.findByIdAndUpdate(batch._id, { $inc: { outQty: toDeduct } })

          // Buat marker IMMEDIATE agar delivery tidak double-deduct
          await Reservation.create({
            batchId: batch._id,
            salesOrderNumber,
            salesOrderId: orderId,
            productId: productObjId,
            warehouseId: warehouseObjId,
            qty: toDeduct,
            pickupDate: null,
            status: 'IMMEDIATE',
          })

          // Kumpulkan item ke delivery log
          // batch.warehouseId adalah required field di schema Batche, selalu ada
          const batchWarehouseId = batch.warehouseId
            ? new mongoose.Types.ObjectId(batch.warehouseId.toString())
            : null
          // Gunakan warehouseId dari batch sebagai prioritas utama, fallback ke cart item
          const effectiveWarehouseId = batchWarehouseId || warehouseObjId

          deliveryItems.push({
            productId: productObjId,
            qty: toDeduct,
            batchNumber: batch.batchNumber,
            locationId: batch.locationId || effectiveWarehouseId,
          })

          // Catat OutboundLog — selalu dicoba, tidak bergantung pada kondisi optional
          if (effectiveWarehouseId) {
            try {
              await OutboundLog.create({
                warehouseId: effectiveWarehouseId,
                productId: productObjId,
                quantity: toDeduct,
                referenceNumber: deliveryNumber,
                date: new Date()
              })
              console.log(`[deductStockImmediately] OutboundLog created: SO=${salesOrderNumber}, product=${productObjId}, qty=${toDeduct}, warehouse=${effectiveWarehouseId}`)
            } catch (logErr: any) {
              console.error('[deductStockImmediately] OutboundLog.create failed:', logErr.message, {
                warehouseId: effectiveWarehouseId?.toString(),
                productId: productObjId?.toString(),
                quantity: toDeduct,
                referenceNumber: salesOrderNumber,
              })
            }
          } else {
            console.error('[deductStockImmediately] Cannot create OutboundLog: warehouseId not found.', {
              batchId: batch._id?.toString(),
              batchWarehouseId: batch.warehouseId?.toString(),
              cartWarehouseId: item.warehouseId?.toString(),
              salesOrderNumber,
            })
          }

          remainingToDeduct -= toDeduct
        }
      }

      // Buat satu Deliverie document sebagai shipping log
      if (deliveryItems.length > 0) {
        await Deliverie.create({
          companyId: new mongoose.Types.ObjectId(companyId.toString()),
          salesOrderNumber,
          deliveryNumber,
          items: deliveryItems,
          date: new Date(),
          createdBy: createdBy ? new mongoose.Types.ObjectId(createdBy.toString()) : null,
        })
      }
    }

    let quotation = await ProductQuotation.findOne({
      quotationNumber: qNumber
    })

    if (!quotation) {
      quotation = await ServiceQuotation.findOne({
        quotationNumber: qNumber
      })
    }


    if (!quotation) {
      return NextResponse.json(
        {
          noResult: true,
          message: "quotation not found",
          result: null,
          error: true
        }
      )
    }
    else {
      const { ...rest } = quotation._doc

      let total = 0
      let cart = rest.cart || []

      if (rest.productType === 'service' && !rest.cart) {
        // Map ServiceQuotation (flattened) to Order structure (cart-based)
        cart = [{
          productId: rest.productId,
          qty: rest.qty,
          subTotal: rest.price,
          taxes: rest.taxes || []
        }]
        total = rest.price
      } else {
        total = rest.cart.reduce((acc: number, item: any) => acc + item.subTotal, 0)
      }

      const so = `SO-${String(Date.now()).slice(-5)}`

      const order = {
        ...rest,
        cart: cart,
        salesOrderId: Date.now(),
        saleDate: new Date(),
        contract: contractUploadUrl,
        attachment: attachmentUploadUrl,
        salesOrderNumber: so,
        type: 'withQuotation',
        payTerm,
        total: total,
        taxValue: rest.taxValue || 0,
        createdBy: userId ? new mongoose.Types.ObjectId(userId) : null
      }

      const _order = await Order.create(order)

      // ─── Stock management berdasarkan tipe order ────────────────────
      if (rest.productType === 'good') {
        const cartForStock = (rest.cart || []).map((c: any) => ({
          productId: c.productId,
          warehouseId: c.warehouseId,
          qty: c.qty,
        }))

        if (pickupDateStr) {
          const pickupDate = new Date(pickupDateStr)
          const now = new Date()
          const pickupDay = new Date(pickupDate.getFullYear(), pickupDate.getMonth(), pickupDate.getDate())
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

          if (pickupDay > today) {
            // Order reserved: pickup di masa depan → tandai reserved qty di batch
            await createReservationsIfNeeded(cartForStock, so, _order._id, pickupDate)
          } else {
            // Pickup hari ini → langsung potong stock + catat shipping log
            await deductStockImmediately(cartForStock, so, _order._id, _order.createdBy ?? null, company._id)
          }
        } else {
          // Tidak ada pickupDate → order biasa, langsung potong stock + catat shipping log
          await deductStockImmediately(cartForStock, so, _order._id, _order.createdBy ?? null, company._id)
        }
      }
      // ─────────────────────────────────────────────────────────────────

      const orders = await Order.find({
        companyId: company._id,
      })

      const [_o] = await Order.aggregate([
        {
          $match: { _id: new ObjectId(_order._id) }
        },
        {
          $lookup: {
            from: "products",
            let: { productId: { $arrayElemAt: ["$cart.productId", 0] } },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ["$_id", "$$productId"]
                  }
                }
              }
            ],
            as: "p"
          }
        },
        {
          $addFields: {
            product: {
              $cond: [
                { $gt: [{ $size: "$cart" }, 1] },
                "various items",
                { $arrayElemAt: ["$p", 0] }
              ]
            }
          }
        },
        {
          $addFields: {
            variousItem: {
              $cond: [
                { $gt: [{ $size: "$cart" }, 1] },
                true,
                false
              ]
            }
          }
        },
        {
          $lookup: {
            from: "customers",
            localField: "customerId",
            foreignField: "_id",
            as: "customer"
          }
        },
        {
          $unwind: {
            path: '$customer',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: { 'p': 0 }
        }
      ])

      const paid = formData.get("debt") === 'yes' ? false : true
      const payAmtString = formData.get("payAmt") as string
      const payAmt = parseFloat(payAmtString) || 0
      const method = formData.get("method") as string

      const now = new Date();
      const shortYear = String(now.getFullYear()).slice(-2);
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const invoiceNumber = `${company.invoiceCode}${shortYear}${month}${formatNumber(orders.length + 1)}`

      await Invoice.create({
        companyId: company._id,
        invoiceNumber: invoiceNumber,
        invoiceType: rest.productType === "good" ? "product" : "service",
        salesOrderId: _order._id,
        salesOrderNumber: so,
        payAmount: payAmt,
        paid: paid,
        date: formData.get("invoiceDate") ? new Date(formData.get("invoiceDate") as string) : new Date(),
        paymentHistory: payAmt > 0 ? [
          {
            amount: payAmt,
            method: paymentMethod || method || "Cash",
            date: new Date()
          }
        ] : []
      })

      return NextResponse.json(
        {
          noResult: false,
          message: "",
          result: _o,
          error: false
        }
      )
    }
  }
  catch (e: any) {
    console.log(e)
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
  try {
    await connectToDatabase()
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const type = url.searchParams.get("type")
    const company = await Companie.findOne({
      masterAccountId: id
    })
    const orders = await Order.aggregate(
      [
        {
          $match: {
            companyId: company._id,
            productType: type
          }
        },
        {
          $lookup: {
            from: "products",
            let: {
              productId: { $arrayElemAt: ["$cart.productId", 0] }
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ["$_id", "$$productId"]
                  }
                }
              }
            ],
            as: "p"
          }
        },
        {
          $lookup: {
            from: 'deliveries',
            let: {
              orderNumber: "$salesOrderNumber",
              productId: "$p._id"
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ["$salesOrderNumber", "$$orderNumber"]
                  }
                },
              }
            ],
            as: "delivered"
          }
        },
        {
          $unwind: {
            path: "$delivered",
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $addFields: {
            product: {
              $cond: [
                { $gt: [{ $size: "$cart" }, 1] },
                "various items",
                { $arrayElemAt: ["$p", 0] }
              ]
            }
          }
        },
        {
          $addFields: {
            variousItem: {
              $cond: [
                { $gt: [{ $size: "$cart" }, 1] },
                true,
                false
              ]
            }
          }
        },
        {
          $lookup: {
            from: "customers",
            localField: "customerId",
            foreignField: "_id",
            as: "customer"
          }
        },
        {
          $unwind: {
            path: '$customer',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $lookup: {
            from: "users",
            localField: "createdBy",
            foreignField: "_id",
            as: "u"
          }
        },
        {
          $unwind: {
            path: '$u',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $lookup: {
            from: "users",
            localField: "lastEditedBy",
            foreignField: "_id",
            as: "editor"
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
            from: "users",
            localField: "lastApprovedBy",
            foreignField: "_id",
            as: "approver"
          }
        },
        {
          $unwind: {
            path: '$approver',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            'p': 0
          }
        }
      ]
    )
    return NextResponse.json(
      {
        noResult: false,
        message: "",
        result: orders,
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

export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { _id, items, approvalCode, editingUserId, discountType, discountValue, taxes } = body;

    if (!approvalCode) {
      throw new Error("Approval code is required");
    }

    const User = (await import("@/models/User")).default;
    const approver = await User.findOne({ approvalCode });
    if (!approver) {
      throw new Error("Invalid approval code");
    }

    if (!_id || !items) {
      throw new Error("Order ID and items are required");
    }

    const order = await Order.findById(_id);
    if (!order) throw new Error("Order not found");
    if (order.productType !== "good") throw new Error("Editing only enabled for physical goods orders");

    const Deliverie = (await import("@/models/Deliverie")).default;
    const existingDeliveries = await Deliverie.find({ salesOrderNumber: order.salesOrderNumber });

    // Map existing shipped qty by product Id
    const deliveredMap: Record<string, number> = {};
    existingDeliveries.forEach(d => {
      d.items.forEach((di: any) => {
        const pId = di.productId.toString();
        deliveredMap[pId] = (deliveredMap[pId] || 0) + parseFloat(di.qty);
      });
    });

    // Use new discount values from payload, fall back to existing
    const newDiscountType: string = discountType ?? order.discountType ?? "none";
    const newDiscountValue: number = discountValue ?? order.discountValue ?? 0;

    // Build a map of per-item tax defs from the items payload
    // Each item may carry its own `taxes: [{taxName, taxValue}]`
    const itemTaxDefsMap: Record<string, { taxName: string; taxValue: number }[]> = {};
    items.forEach((i: any) => {
      const pId = i.productId?.toString();
      itemTaxDefsMap[pId] = Array.isArray(i.taxes) ? i.taxes : [];
    });

    const newCart: any[] = order.cart.map((c: any) => c.toObject ? c.toObject() : { ...c });
    for (const c of newCart) {
      const pId = c.productId.toString();
      const updatedItem = items.find((i: any) => i.productId === pId);

      if (updatedItem) {
        const newQty = parseInt(updatedItem.qty);
        if (isNaN(newQty) || newQty <= 0) throw new Error(`Invalid quantity for product`);

        const delivered = deliveredMap[pId] || 0;
        if (newQty < delivered) {
          throw new Error(`Cannot reduce quantity below delivered amount (${delivered}) for a targeted product.`);
        }

        const unitPrice = c.subTotal / c.qty;
        c.qty = newQty;
        c.subTotal = unitPrice * newQty;
      }
    }

    // Recalculate with new discount + per-item taxes
    const overallSubtotal = newCart.reduce((sum: number, c: any) => sum + c.subTotal, 0);
    let totalTaxAmount = 0;

    newCart.forEach((c: any) => {
      const pId = c.productId.toString();
      const itemTaxDefs = itemTaxDefsMap[pId] || [];

      let taxableAmount = 0;
      if (newCart.length === 1) {
        if (newDiscountType === "percent") {
          taxableAmount = overallSubtotal - (overallSubtotal * (newDiscountValue / 100));
        } else if (newDiscountType === "fixed") {
          taxableAmount = overallSubtotal - newDiscountValue;
        } else {
          taxableAmount = overallSubtotal;
        }
      } else {
        if (newDiscountType === "percent") {
          taxableAmount = c.subTotal - (c.subTotal * (newDiscountValue / 100));
        } else if (newDiscountType === "fixed") {
          const proportion = overallSubtotal !== 0 ? c.subTotal / overallSubtotal : 0;
          taxableAmount = c.subTotal - (newDiscountValue * proportion);
        } else {
          taxableAmount = c.subTotal;
        }
      }

      // Apply THIS item's own tax definitions
      c.taxes = itemTaxDefs.map((t: any) => ({
        taxName: t.taxName,
        taxValue: t.taxValue,
        taxAmount: Math.round(taxableAmount * (t.taxValue / 100))
      }));
      c.taxes.forEach((t: any) => { totalTaxAmount += t.taxAmount; });
    });

    let overallDiscount = 0;
    if (newDiscountType === "percent") {
      overallDiscount = overallSubtotal * (newDiscountValue / 100);
    } else if (newDiscountType === "fixed") {
      overallDiscount = newDiscountValue;
    }

    const newTotal = overallSubtotal - overallDiscount + totalTaxAmount;

    // Build order-level taxes summary (aggregated across all cart items)
    const orderTaxesSummary: Record<string, { total: number; value: number }> = {};
    newCart.forEach((c: any) => {
      c.taxes.forEach((t: any) => {
        if (!orderTaxesSummary[t.taxName]) orderTaxesSummary[t.taxName] = { total: 0, value: t.taxValue };
        orderTaxesSummary[t.taxName].total += t.taxAmount;
      });
    });
    const orderTaxesArray = Object.keys(orderTaxesSummary).map(name => ({
      taxName: name,
      taxValue: orderTaxesSummary[name].value
    }));

    const updatedOrder = await Order.findByIdAndUpdate(_id, {
      cart: newCart,
      total: newTotal,
      taxValue: totalTaxAmount,
      discountType: newDiscountType,
      discountValue: newDiscountValue,
      taxes: orderTaxesArray,
      lastEditedBy: editingUserId,
      lastApprovedBy: approver._id,
      editedAt: new Date()
    }, { new: true });

    // ─── Sinkronisasi stock & shipping log untuk order IMMEDIATE ─────────────
    // Cek apakah order ini termasuk "immediate": pickup hari ini atau tanpa pickupDate
    const isImmediateOrder = (() => {
      if (!order.pickupDate) return true; // tidak ada pickup date → langsung potong
      const pd = new Date(order.pickupDate);
      const pickupDay = new Date(pd.getFullYear(), pd.getMonth(), pd.getDate());
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return pickupDay <= today; // pickup hari ini atau sudah lewat
    })();

    if (isImmediateOrder) {
      // Bangun map qty lama dari cart sebelum edit
      const oldQtyMap: Record<string, number> = {};
      order.cart.forEach((c: any) => {
        oldQtyMap[c.productId.toString()] = c.qty;
      });

      // Cari Deliverie yang sudah ada untuk order ini
      const existingDelivery = await Deliverie.findOne({ salesOrderNumber: order.salesOrderNumber });

      for (const c of newCart) {
        const pId = c.productId.toString();
        const oldQty = oldQtyMap[pId] || 0;
        const delta = c.qty - oldQty;

        if (delta <= 0) continue; // tidak ada peningkatan, skip

        const productObjId = new mongoose.Types.ObjectId(pId);
        const warehouseObjId = c.warehouseId
          ? new mongoose.Types.ObjectId(c.warehouseId.toString())
          : null;

        // Potong stock batch FIFO sebesar delta
        const batchQuery: Record<string, unknown> = {
          productId: productObjId,
          status: 'ACTIVE',
        };
        if (warehouseObjId) batchQuery.warehouseId = warehouseObjId;

        const batches = await Batche.find(batchQuery).sort({ createdAt: 1 });
        let remainingToDeduct = delta;

        for (const batch of batches) {
          if (remainingToDeduct <= 0) break;
          const freeQty = batch.accumulative - batch.outQty - (batch.reserved || 0);
          if (freeQty <= 0) continue;
          const toDeduct = Math.min(freeQty, remainingToDeduct);

          // Potong outQty di batch
          await Batche.findByIdAndUpdate(batch._id, { $inc: { outQty: toDeduct } });

          // Catat OutboundLog untuk edit order IMMEDIATE
          const editEffectiveWarehouseId = batch.warehouseId
            ? new mongoose.Types.ObjectId(batch.warehouseId.toString())
            : warehouseObjId;
          if (editEffectiveWarehouseId) {
            try {
              await OutboundLog.create({
                warehouseId: editEffectiveWarehouseId,
                productId: productObjId,
                quantity: toDeduct,
                referenceNumber: existingDelivery ? existingDelivery.deliveryNumber : order.salesOrderNumber,
                date: new Date()
              });
            } catch (logErr: any) {
              console.error('[PUT order] OutboundLog.create failed:', logErr.message);
            }
          } else {
            console.warn('[PUT order] Skipping OutboundLog: warehouseId not found for batch', batch._id);
          }

          // Buat Reservation IMMEDIATE untuk jejak delta
          await Reservation.create({
            batchId: batch._id,
            salesOrderNumber: order.salesOrderNumber,
            salesOrderId: order._id,
            productId: productObjId,
            warehouseId: warehouseObjId,
            qty: toDeduct,
            pickupDate: null,
            status: 'IMMEDIATE',
          });

          // Perbarui Deliverie yang sudah ada
          if (existingDelivery) {
            // Cari apakah item dengan productId + batchNumber ini sudah ada
            const existingItemIdx = existingDelivery.items.findIndex(
              (di: any) =>
                di.productId.toString() === pId &&
                di.batchNumber === batch.batchNumber
            );

            if (existingItemIdx >= 0) {
              // Tambah qty pada item yang sudah ada
              existingDelivery.items[existingItemIdx].qty += toDeduct;
            } else {
              // Tambahkan item baru ke delivery
              existingDelivery.items.push({
                productId: productObjId,
                qty: toDeduct,
                batchNumber: batch.batchNumber,
                locationId: batch.locationId || warehouseObjId || batch.warehouseId,
              });
            }
          }

          remainingToDeduct -= toDeduct;
        }
      }

      // Simpan perubahan Deliverie jika ada
      if (existingDelivery) {
        existingDelivery.editedBy = editingUserId ? new mongoose.Types.ObjectId(editingUserId.toString()) : undefined;
        existingDelivery.editedAt = new Date();
        await existingDelivery.save();
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    return NextResponse.json({
      noResult: false,
      message: "Order items updated successfully",
      result: updatedOrder,
      error: false
    });
  } catch (e: any) {
    return NextResponse.json({
      noResult: true,
      message: e.message,
      result: null,
      error: true
    });
  }
}

// ─── PATCH: Void a sales order ────────────────────────────────────────────────
export async function PATCH(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { _id, approvalCode, voidingUserId } = body;

    if (!approvalCode) throw new Error("Approval code is required");
    if (!_id) throw new Error("Order ID is required");

    // Validate approval code
    const User = (await import("@/models/User")).default;
    const approver = await User.findOne({ approvalCode });
    if (!approver) throw new Error("Invalid approval code");

    // Find and validate the order
    const order = await Order.findById(_id);
    if (!order) throw new Error("Order not found");
    if (order.void) throw new Error("Order is already voided");

    // ─── Mark order as void ───────────────────────────────────────────────
    await Order.findByIdAndUpdate(_id, {
      void: true,
      voidedBy: voidingUserId ? new mongoose.Types.ObjectId(voidingUserId) : approver._id,
      voidedAt: new Date(),
    });

    // ─── Process each related delivery → void + reverse outQty ───────────
    const deliveries = await Deliverie.find({
      salesOrderNumber: order.salesOrderNumber,
      void: { $ne: true }, // only non-voided ones
    });

    for (const delivery of deliveries) {
      for (const item of delivery.items) {
        const batchNumber = item.batchNumber;
        const qty = Number(item.qty);
        if (!batchNumber || qty <= 0) continue;

        // Reduce outQty on the matching batch (identified by batchNumber and productId)
        await Batche.findOneAndUpdate(
          { batchNumber: batchNumber, productId: item.productId },
          { $inc: { outQty: -qty } }
        );
      }

      // Mark this delivery as void
      await Deliverie.findByIdAndUpdate(delivery._id, {
        void: true,
      });
    }

    // ─── Delete OutboundLogs linked to this order ─────────────────────────
    await OutboundLog.deleteMany({
      referenceNumber: order.salesOrderNumber
    });

    // ─── Cancel active reservations for this order ────────────────────────
    // First read ACTIVE reservations (pickup future) so we can release reserved qty
    const futureReservations = await Reservation.find({
      salesOrderNumber: order.salesOrderNumber,
      status: 'ACTIVE',
      pickupDate: { $ne: null }, // ACTIVE (future pickup) have a pickupDate; IMMEDIATE have null
    });
    for (const res of futureReservations) {
      await Batche.findByIdAndUpdate(res.batchId, {
        $inc: { reserved: -res.qty }
      });
    }

    // Now cancel all remaining ACTIVE / IMMEDIATE reservations
    await Reservation.updateMany(
      {
        salesOrderNumber: order.salesOrderNumber,
        status: { $in: ['ACTIVE', 'IMMEDIATE'] },
      },
      { $set: { status: 'CANCELLED' } }
    );

    return NextResponse.json({
      noResult: false,
      message: "Order voided successfully",
      result: { orderId: _id, deliveriesVoided: deliveries.length },
      error: false,
    });
  } catch (e: any) {
    return NextResponse.json({
      noResult: true,
      message: e.message,
      result: null,
      error: true,
    });
  }
}