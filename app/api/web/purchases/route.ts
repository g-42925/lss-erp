/* eslint-disable @typescript-eslint/no-explicit-any */

import { Types } from 'mongoose'
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
import BankAccount from '@/models/BankAccount'
import { getAvailableBalance } from '@/lib/finance/balance'
import Cashflow from '@/models/Cashflow'
import ProcurementReceivingLog from '@/models/ProcurementReceivingLog'

// Helper: ambil data bank untuk Log (reference: "BANK-NOMORREKENING", bankAccountId sebagai ObjectId)
async function getBankInfo(paymentMethod: string | undefined | null, bankAccountId: string | undefined | null)
  : Promise<{ reference: string | undefined, bankAccountId: any }> {
  if (!paymentMethod || paymentMethod === 'Cash' || !bankAccountId) {
    return { reference: undefined, bankAccountId: undefined }
  }
  const bankAcc = await BankAccount.findById(bankAccountId).lean() as any
  if (!bankAcc) return { reference: undefined, bankAccountId: undefined }
  return {
    reference: `${bankAcc.bank}-${bankAcc.accountNumber}`,
    bankAccountId: bankAcc._id
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase()
    const body = await request.json()
    const { _id, ...rest } = body

    if (rest.action) {
      switch (rest.action) {
        case "edit_pr":
          const editPrData: any = {
            quantity: rest.quantity,
            finalPrice: rest.finalPrice,
            productId: rest.productId
          };
          if (rest.date) editPrData.date = new Date(rest.date);
          if (rest.customSupplier !== undefined) editPrData.customSupplier = rest.customSupplier;
          await Purchase.findByIdAndUpdate(_id, editPrData);
          return NextResponse.json({ noResult: false, message: "PR updated", result: true, error: false });
        case "apply_pph_tax":
          await Purchase.findByIdAndUpdate(_id, {
            finalPrice: rest.finalPrice,
            grossFinalPrice: rest.grossFinalPrice,
            appliedTaxes: rest.appliedTaxes,
          });
          return NextResponse.json({ noResult: false, message: "Tax applied", result: true, error: false });
        case "edit_noncash_dst":
          await Purchase.findByIdAndUpdate(_id, {
            "nonCashDst.accountNumber": rest.accountNumber,
            "nonCashDst.description": rest.description,
          });
          return NextResponse.json({ noResult: false, message: "nonCashDst updated", result: true, error: false });
        case "approve_pr":
          await Purchase.findByIdAndUpdate(_id, { status: "approved", approvedBy: rest.userId, approvedAt: new Date() });
          return NextResponse.json({ noResult: false, message: "PR approved", result: true, error: false });
        case "reject_pr":
          await Purchase.findByIdAndUpdate(_id, { status: "rejected" });
          return NextResponse.json({ noResult: false, message: "PR rejected", result: true, error: false });
        case "convert_to_po":
          const prForBal = await Purchase.findById(_id);
          if (rest.payAmount && rest.payAmount > 0 && prForBal) {
            const txDate = rest.date || new Date().toISOString();
            const balance = await getAvailableBalance(prForBal.companyId, rest.paymentMethod, rest.bankAccountId, txDate);
            if (balance < rest.payAmount) {
              return NextResponse.json({ noResult: true, message: `Saldo tidak mencukupi. Saldo tersedia pada tanggal tersebut: Rp ${balance.toLocaleString('id-ID')}`, result: null, error: true });
            }
          }

          const updateData: any = {
            status: "ordered",
            finalPrice: rest.finalPrice,
            payAmount: rest.payAmount || 0,
            quantity: rest.quantity,
            shippingCost: rest.shippingCost || 0,
            taxAmount: rest.taxAmount || 0,
            appliedTaxes: rest.appliedTaxes,
            grossFinalPrice: rest.grossFinalPrice,
            nonCashDst: {
              accountNumber: rest.nonCashDstNumber,
              description: rest.nonCashDstDescription
            }
          };
          if (rest.purchaseType === 'product') {
            updateData.supplierId = rest.supplierId;
          }
          else if (rest.purchaseType === 'procurement') {
            updateData.customSupplier = rest.customSupplier;
          }
          await Purchase.findByIdAndUpdate(_id, updateData);

          if (rest.payAmount && rest.payAmount > 0) {
            const bankInfo1 = await getBankInfo(rest.paymentMethod, rest.bankAccountId)
            await Log.create({
              purchaseId: _id,
              date: new Date(),
              amount: rest.payAmount,
              initial: true,
              paymentNumber: `PL-${String(Date.now()).slice(-5)}`,
              type: 'payment',
              paymentMethod: rest.paymentMethod || 'Cash',
              createdBy: rest.userId,
              reference: bankInfo1.reference,
              bankAccountId: bankInfo1.bankAccountId,
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

        // Ambil Purchase untuk mendapatkan companyId (dipakai untuk pencatatan cashflow)
        const purchaseForCashflow = await Purchase.findById(_id).lean() as any
        const companyIdForCashflow = purchaseForCashflow?.companyId ?? null

        if (rest.purchaseType === 'product' || rest.purchaseType === 'procurement' || rest.purchaseType === 'service') {

          const bankInfo2 = await getBankInfo(rest.paymentMethod, rest.bankAccountId)
          await Log.create({
            purchaseId: _id,
            date: rest.date || new Date(),
            amount: amt,
            initial: false,
            paymentNumber: `PL-${String(Date.now()).slice(-5)}`,
            type: rest.type,
            reference: bankInfo2.reference || reference,
            paymentMethod: rest.paymentMethod,
            createdBy: rest.userId,
            bankAccountId: bankInfo2.bankAccountId,
            nonCashDst: rest.paymentMethod != 'Cash' ? {
              accountNumber: rest.destinationAccountNumber,
              description: rest.destinationDescription,
            } : undefined,
          })

          if (rest.type === "payment") {
            await Purchase.findByIdAndUpdate(
              _id, {
              payAmount: rest.payAmount,
              editable: false
            }
            )

            let rf = ''

            const px = await Purchase.findByIdAndUpdate(
              _id, {
              payAmount: rest.payAmount,
              editable: false
            }
            )

            console.log({ px2: px })

            if (px.purchaseType == "procurement") {
              const _px = await Purchase.findById(_id)
              const paymentCode = _px.purchaseOrderNumber.split("-")[1].trim()
              const inv = await InvItem.findOne({ _id: new Types.ObjectId(px.productId) })
              rf = `pl ${paymentCode} | pembayaran procurement ${inv.name} ${_px.quantity} ${inv.unit} senilai ${_px.payAmount}`
            }

            rf = px.purchaseType === "procurement" ? rf : reference

            // ─── Catat Cashflow ───────────────────────────────────────────────
            if (companyIdForCashflow) {
              const isCash = !rest.paymentMethod || rest.paymentMethod === 'Cash'
              await Cashflow.create({
                companyId: companyIdForCashflow,
                accountType: isCash ? 'Cash' : 'Bank',
                bankAccountId: isCash ? null : (rest.bankAccountId || null),
                type: 'out',
                amount: amt,
                reference: rf,
                date: rest.date ? new Date(rest.date) : new Date(),
                recordedBy: rest.userId || null,
                to: rest.to || undefined,
                source: 'purchase_payment',
                time: rest.time,
                nonCashDst: rest.paymentMethod != 'Cash' ? {
                  accountNumber: rest.destinationAccountNumber,
                  description: rest.destinationDescription,
                } : undefined,
              })
            }
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

          const bankInfo3 = await getBankInfo(rest.paymentMethod, rest.bankAccountId)
          await Log.create({
            purchaseId: _id,
            date: rest.date || new Date(),
            amount: amt,
            initial: false,
            paymentNumber: `PL- ${String(Date.now()).slice(-5)
              } `,
            type: rest.type,
            reference: bankInfo3.reference || reference,
            paymentMethod: rest.paymentMethod,
            createdBy: rest.userId,
            to: { name: rest.to },
            bankAccountId: bankInfo3.bankAccountId,
          })

          if (rest.type === "payment") {
            let rf = ''

            const px = await Purchase.findByIdAndUpdate(
              _id, {
              payAmount: rest.payAmount,
              editable: false
            }
            )

            console.log({ px1: px })

            if (px.purchaseType == "procurement") {
              const _px = await Purchase.findById(_id)
              const paymentCode = _px.purchaseOrderNumber.split("-")[1].trim()
              const inv = await InvItem.findOne({ _id: new Types.ObjectId(px.productId) })
              rf = `pl ${paymentCode} | pembayaran procurement ${inv.name} ${_px.quantity} ${inv.unit} senilai ${_px.payAmount} `
            }

            rf = px.purchaseType === "procurement" ? rf : reference

            // ─── Catat Cashflow ───────────────────────────────────────────────
            if (companyIdForCashflow) {
              const isCash = !rest.paymentMethod || rest.paymentMethod === 'Cash'
              await Cashflow.create({
                companyId: companyIdForCashflow,
                accountType: isCash ? 'Cash' : 'Bank',
                bankAccountId: isCash ? null : (rest.bankAccountId || null),
                type: 'out',
                amount: amt,
                reference: rf,
                date: rest.date ? new Date(rest.date) : new Date(),
                recordedBy: rest.userId || null,
                to: rest.to || undefined,
                source: 'purchase_payment',
                time: rest.time,
                nonCashDst: rest.paymentMethod === 'Bank' ? {
                  accountNumber: rest.destinationAccountNumber,
                  description: rest.destinationDescription,
                } : undefined,
              })
            }
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

        if (rest.payAmount && rest.payAmount > 0) {
          const prForBal = await Purchase.findById(_id);
          if (prForBal) {
            const txDate = rest.date || new Date().toISOString();
            const balance = await getAvailableBalance(prForBal.companyId, rest.paymentMethod, rest.bankAccountId, txDate);
            if (balance < rest.payAmount) {
              return NextResponse.json({ noResult: true, message: `Saldo tidak mencukupi.Saldo tersedia pada tanggal tersebut: Rp ${balance.toLocaleString('id-ID')} `, result: null, error: true });
            }
          }
        }

        const bankInfo4 = await getBankInfo(rest.paymentMethod, rest.bankAccountId)

        await Log.create({
          purchaseId: _id,
          date: rest.date || new Date(),
          amount: rest.payAmount,
          initial: true,
          paymentNumber: `PL - ${String(Date.now()).slice(-5)} `,
          type: 'payment',
          paymentMethod: rest.paymentMethod,
          createdBy: rest.userId,
          reference: bankInfo4.reference,
          bankAccountId: bankInfo4.bankAccountId,
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
        const receivedDate = rest.receivedDate ? new Date(rest.receivedDate) : new Date();
        await Purchase.findByIdAndUpdate(_id, {
          $inc: { receivedQty: received }
        });

        if (rest.saveAs === 'asset') {
          // Create Asset records (1 per received qty since qty field was removed)
          const companyId = purchase.companyId;

          if (companyId) {
            const invItem = await InvItem.findById(purchase.productId);
            const assetPromises = [];
            for (let i = 0; i < received; i++) {
              assetPromises.push(Asset.create({
                name: invItem?.name || "Received Asset",
                category: rest.assetCategoryId,
                addedAt: receivedDate,
                condition: "good",
                status: "active",
                desc: "Received from PO: " + purchase.purchaseOrderNumber,
                companyId: companyId
              }));
            }
            await Promise.all(assetPromises);
          }
        }
        else {
          // Save as inventory
          await InvItem.findByIdAndUpdate(purchase.productId, {
            $inc: { currentStock: received }
          });
        }

        // Create a receiving log for audit/listing purposes
        await ProcurementReceivingLog.create({
          purchaseOrderNumber: purchase.purchaseOrderNumber,
          purchaseId: purchase._id,
          itemId: purchase.productId,
          qty: received,
          saveAs: rest.saveAs || 'inventory',
          assetCategoryId: rest.assetCategoryId || undefined,
          receivedDate: receivedDate,
          receivedBy: rest.userId || undefined,
          createdAt: new Date(),
        });

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
          batchNumber: `B - ${String(Date.now()).slice(-5)} `,
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
        }
        else if (product.packagingId) {
          // Packaging: 1 pack = packaging.qty units
          const packaging = await Packaging.findById(product.packagingId)
          if (packaging && packaging.qty) {
            accumulativeQty = packaging.qty * parseInt(rest.qty)
          }
        }

        const batchCreated = await Batche.create({
          ...rest,
          status: 'QUARANTINE',
          batchNumber: `B - ${String(Date.now()).slice(-5)} `,
          accumulative: accumulativeQty,
          reserved: 0,
          locationId: resolvedLocationId,
          createdAt: new Date()
        }) as any


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

    // Only check for duplicate product PRs (service has no productId)
    if (params.purchaseType !== 'service' && params.productId) {
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
    }

    console.log({ p: params })

    if (params.vendorId === "") delete params.vendorId;
    if (params.supplierId === "") delete params.supplierId;

    // ─── Cek kenaikan harga dibanding pembelian sebelumnya ───────────────────
    let priceAlert = undefined;
    const currentPrice = parseFloat(params.finalPrice) || 0;

    if (
      params.purchaseType !== 'service' &&
      params.productId &&
      currentPrice > 0
    ) {
      const lastPurchase = await Purchase.findOne({
        companyId: company._id,
        productId: params.productId,
        purchaseType: params.purchaseType,
        status: { $in: ['ordered', 'completed'] },
      })
        .sort({ date: -1 })
        .lean() as any;

      if (lastPurchase) {
        const previousPrice = parseFloat(lastPurchase.finalPrice) || 0;
        if (previousPrice > 0 && currentPrice > previousPrice) {
          const priceDiff = currentPrice - previousPrice;
          const priceDiffPct = Math.round((priceDiff / previousPrice) * 100 * 10) / 10;
          priceAlert = {
            previousPrice,
            currentPrice,
            priceDiff,
            priceDiffPct,
          };
        }
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    const result = await Purchase.create({
      ...params,
      companyId: company._id,
      editable: true,
      receivedQty: 0,
      purchaseOrderNumber: `PO - ${String(Date.now()).slice(-5)} `,
      ...(priceAlert ? { priceAlert } : {}),
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