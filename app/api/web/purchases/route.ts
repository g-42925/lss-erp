/* eslint-disable @typescript-eslint/no-explicit-any */

import { Types, PipelineStage } from 'mongoose'
import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { getAvailableBalance } from '@/lib/finance/balance'


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
import Cashflow from '@/models/Cashflow'
import ProcurementReceivingLog from '@/models/ProcurementReceivingLog'
import PredefinedUnit from '@/models/PredefinedUnit'

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
          const editPrData: any = {};
          if (rest.date) editPrData.date = new Date(rest.date);
          if (rest.customSupplier !== undefined) editPrData.customSupplier = rest.customSupplier;
          if (Array.isArray(rest.items) && rest.items.length > 0) {
            // Multi-item: update items array and total finalPrice
            editPrData.items = rest.items;
            editPrData.finalPrice = rest.finalPrice;
          }
          else {
            // Legacy single-item (service / backward compat)
            if (rest.quantity !== undefined) editPrData.quantity = rest.quantity;
            if (rest.finalPrice !== undefined) editPrData.finalPrice = rest.finalPrice;
            if (rest.productId !== undefined) editPrData.productId = rest.productId;
          }
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
            updateData.link = rest.link
          }
          else if (rest.purchaseType === 'procurement') {
            updateData.customSupplier = rest.customSupplier;
            updateData.link = rest.link
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

        const cashflowTo = purchaseForCashflow?.purchaseType === 'procurement'
          ? purchaseForCashflow?.customSupplier
          : rest.to

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
              const paymentCode = _px?.purchaseOrderNumber?.split("-")[1]?.trim() || ''
              const itemParts = await Promise.all(
                (_px?.items || []).map(async (i: any) => {
                  const item = await InvItem.findById(i.productId)
                  const unit = await PredefinedUnit.findById(item.unit)
                  return item ? `${item.name} ${i.quantity} ${unit.symbol || ''}`.trim() : ''
                })
              )
              const message = itemParts.filter(Boolean).join(', ')
              rf = `pl ${paymentCode} | ${message} | ${_px?.payAmount || ''} `
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
                to: cashflowTo || undefined,
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
              const paymentCode = _px?.purchaseOrderNumber?.split("-")[1]?.trim() || ''
              const itemParts = await Promise.all(
                (_px?.items || []).map(async (i: any) => {
                  const item = await InvItem.findById(i.productId)
                  const unit = await PredefinedUnit.findById(item.unit)
                  return item ? `${item.name} ${i.quantity} ${unit.symbol || ''}`.trim() : ''
                })
              )
              const message = itemParts.filter(Boolean).join(', ')
              rf = `pl ${paymentCode} | ${message} | ${_px?.payAmount || ''} `
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
                to: cashflowTo || undefined,
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

      // ── Resolve productId: untuk multi-item gunakan dari item yang dipilih ──
      const isMultiItemPr = Array.isArray(purchase.items) && purchase.items.length > 0
      const itemIndex = rest.itemIndex !== undefined ? parseInt(rest.itemIndex) : -1
      const resolvedProductId = (isMultiItemPr && itemIndex >= 0)
        ? purchase.items[itemIndex]?.productId
        : purchase.productId

      if (purchase.purchaseType === 'procurement') {
        const received = parseInt(rest.qty);
        const receivedDate = rest.receivedDate ? new Date(rest.receivedDate) : new Date();

        // ── Multi-item vs single-item ─────────────────────────────────────
        const isMultiItem = Array.isArray(purchase.items) && purchase.items.length > 0;
        const itemIndex = rest.itemIndex !== undefined ? parseInt(rest.itemIndex) : -1;
        const targetItem = (isMultiItem && itemIndex >= 0 && itemIndex < purchase.items.length)
          ? purchase.items[itemIndex]
          : null;
        const itemProductId = targetItem ? targetItem.productId : purchase.productId;
        const isAssetItem = (targetItem && targetItem.itemType === 'asset') ||
          purchase.itemType === 'asset' ||
          rest.saveAs === 'asset' ||
          (await Asset.exists({ _id: itemProductId }));

        if (isAssetItem) {
          const companyId = purchase.companyId;
          // Determine target Asset entity
          let targetAsset = await Asset.findById(itemProductId);
          if (!targetAsset && rest.assetId) {
            targetAsset = await Asset.findById(rest.assetId);
          }
          if (!targetAsset && rest.assetCategoryId) {
            const invItem = await InvItem.findById(itemProductId);
            targetAsset = await Asset.create({
              name: invItem?.name || "Received Asset",
              category: rest.assetCategoryId,
              units: [],
              companyId
            });
          }

          if (!targetAsset) {
            return NextResponse.json({
              noResult: true,
              message: "Asset entity tidak ditemukan untuk item ini",
              result: null,
              error: true
            }, { status: 400 });
          }

          // Extract unit labels
          const rawUnits = Array.isArray(rest.units) ? rest.units : [];
          let labels: string[] = [];

          if (rawUnits.length > 0) {
            labels = rawUnits.map((u: any) => String(u.label || "").trim());
          } else if (Array.isArray(rest.unitLabels)) {
            labels = rest.unitLabels.map((lbl: any) => String(lbl || "").trim());
          }

          // Check if any provided label is empty
          if (labels.length > 0 && labels.some(lbl => !lbl)) {
            return NextResponse.json({
              noResult: true,
              message: "Semua label unit harus diisi",
              result: null,
              error: true
            }, { status: 400 });
          }

          // Fill any missing labels if count < received
          while (labels.length < received) {
            const num = (targetAsset.units?.length || 0) + labels.length + 1;
            labels.push(`${targetAsset.name.replace(/\s+/g, '-').toUpperCase()}-${String(num).padStart(3, '0')}`);
          }

          // Slice to received qty in case more were sent
          labels = labels.slice(0, received);

          // Check duplicate within the batch
          const lowerLabels = labels.map(l => l.toLowerCase());
          if (new Set(lowerLabels).size !== labels.length) {
            return NextResponse.json({
              noResult: true,
              message: "Terdapat label unit yang duplikat dalam daftar penerimaan",
              result: null,
              error: true
            }, { status: 400 });
          }

          // Check duplicate with existing asset units in this company
          const duplicateInDb = await Asset.findOne({
            companyId,
            "units.label": { $in: labels }
          }).collation({ locale: "en", strength: 2 });

          if (duplicateInDb) {
            return NextResponse.json({
              noResult: true,
              message: `Label unit sudah digunakan pada aset lain di perusahaan ini`,
              result: null,
              error: true
            }, { status: 409 });
          }

          // Create receiving log record first
          const receivingLog = await ProcurementReceivingLog.create({
            purchaseOrderNumber: purchase.purchaseOrderNumber,
            purchaseId: purchase._id,
            itemId: itemProductId,
            qty: received,
            saveAs: 'asset',
            assetId: targetAsset._id,
            assetCategoryId: targetAsset.category || rest.assetCategoryId || undefined,
            unitLabels: labels,
            receivedDate: receivedDate,
            receivedBy: rest.userId || undefined,
            createdAt: new Date(),
          });

          // Construct new units
          const newUnits = labels.map((lbl, idx) => {
            const uObj = rawUnits[idx] || {};
            return {
              _id: new Types.ObjectId(),
              label: lbl,
              condition: uObj.condition || 'good',
              status: uObj.status || 'active',
              purchaseId: purchase._id,
              receivingId: receivingLog._id,
              addedAt: receivedDate
            };
          });

          // Push units to Asset
          await Asset.findByIdAndUpdate(targetAsset._id, {
            $push: { units: { $each: newUnits } }
          });
        } else {
          // Inventory item
          if (itemProductId) {
            await InvItem.findByIdAndUpdate(itemProductId, {
              $inc: { currentStock: received }
            });
          }

          await ProcurementReceivingLog.create({
            purchaseOrderNumber: purchase.purchaseOrderNumber,
            purchaseId: purchase._id,
            itemId: itemProductId,
            qty: received,
            saveAs: 'inventory',
            receivedDate: receivedDate,
            receivedBy: rest.userId || undefined,
            createdAt: new Date(),
          });
        }

        // Increment receivedQty on Purchase
        if (isMultiItem && itemIndex >= 0 && itemIndex < purchase.items.length) {
          const updatePath = `items.${itemIndex}.receivedQty`;
          await Purchase.findByIdAndUpdate(_id, {
            $inc: { [updatePath]: received, receivedQty: received }
          });
        } else {
          await Purchase.findByIdAndUpdate(_id, {
            $inc: { receivedQty: received }
          });
        }

        // Check completion
        const updatedPurchase = await Purchase.findById(_id);
        const isComplete = Array.isArray(updatedPurchase.items) && updatedPurchase.items.length > 0
          ? updatedPurchase.items.every((it: any) => (it.receivedQty || 0) >= (it.quantity || 0))
          : (updatedPurchase.receivedQty || 0) >= (updatedPurchase.quantity || 0);

        if (isComplete) {
          await Purchase.findByIdAndUpdate(_id, { status: 'completed' });
        }

        return NextResponse.json({
          noResult: false,
          message: "Barang berhasil diterima",
          result: {},
          error: false
        });
      }

      if (purchase.toObject().hasOwnProperty('measurementId')) {
        const config = await Measurement.findById(purchase.measurementId)

        const product = await Product.findById(resolvedProductId)

        // stockValue update deferred to QC approval
        const warehouse = await Warehouse.findById(rest.warehouseId)

        let resolvedLocationId = warehouse?.locationId || rest.locationId;
        if (!resolvedLocationId) {
          const defaultLoc = await Location.findOne();
          resolvedLocationId = defaultLoc?._id;
        }

        const batchCreated = await Batche.create({
          ...rest,
          productId: resolvedProductId,
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
          productId: resolvedProductId,
          date: new Date(),
          quantity: config.ratio * rest.qty,
          sourceId: batchCreated._id,
          sourceType: 'PURCHASE'
        })

        // Increment receivedQty per item jika multi-item
        if (isMultiItemPr && itemIndex >= 0 && itemIndex < purchase.items.length) {
          const updatePath = `items.${itemIndex}.receivedQty`
          await Purchase.findByIdAndUpdate(_id, {
            $inc: { [updatePath]: parseInt(rest.qty), receivedQty: parseInt(rest.qty) }
          })
        } else {
          await Purchase.findByIdAndUpdate(_id, { $inc: { receivedQty: parseInt(rest.qty) } })
        }

      }
      else {
        // ─── No Measurement config: handle conversionType "value" or packaging ───
        const product = await Product.findById(resolvedProductId)
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
          accumulativeQty = product.conversionValue * parseInt(rest.qty)
        }
        else if (product.packagingId) {
          const packaging = await Packaging.findById(product.packagingId)
          if (packaging && packaging.qty) {
            accumulativeQty = packaging.qty * parseInt(rest.qty)
          }
        }

        const batchCreated = await Batche.create({
          ...rest,
          productId: resolvedProductId,
          status: 'QUARANTINE',
          batchNumber: `B - ${String(Date.now()).slice(-5)} `,
          accumulative: accumulativeQty,
          reserved: 0,
          locationId: resolvedLocationId,
          createdAt: new Date()
        }) as any

        await InboundLog.create({
          warehouseId: rest.warehouseId,
          productId: resolvedProductId,
          date: new Date(),
          quantity: accumulativeQty,
          sourceId: batchCreated._id,
          sourceType: 'PURCHASE'
        })

        // Increment receivedQty per item jika multi-item
        if (isMultiItemPr && itemIndex >= 0 && itemIndex < purchase.items.length) {
          const updatePath = `items.${itemIndex}.receivedQty`
          await Purchase.findByIdAndUpdate(_id, {
            $inc: { [updatePath]: parseInt(rest.qty), receivedQty: parseInt(rest.qty) }
          })
        } else {
          await Purchase.findByIdAndUpdate(_id, { $inc: { receivedQty: parseInt(rest.qty) } })
        }

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

    const isMultiItem = Array.isArray(params.items) && params.items.length > 0

    if (!isMultiItem) {
      // ── Legacy single-item: cek duplikasi produk yang sama ──────────────────
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
    }

    console.log({ p: params })

    if (params.vendorId === "") delete params.vendorId;
    if (params.supplierId === "") delete params.supplierId;

    // ─── Cek kenaikan harga dibanding pembelian sebelumnya ───────────────────
    let priceAlert = undefined;

    if (!isMultiItem) {
      const currentPrice = parseFloat(params.finalPrice) || 0;

      if (params.purchaseType !== 'service' && params.productId && currentPrice > 0) {
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
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Hitung total finalPrice dari items jika multi-item dan finalPrice belum di-set manual
    let resolvedFinalPrice = parseFloat(params.finalPrice) || 0;

    if (isMultiItem && params.finalPriceOverride !== undefined) {
      resolvedFinalPrice = parseFloat(params.finalPriceOverride) || 0;
    }
    else if (isMultiItem && !params.finalPrice) {
      resolvedFinalPrice = (params.items as any[]).reduce(
        (sum: number, item: any) =>
          sum + (parseFloat(item.finalPrice) || 0),
        0
      );
    }


    // if (isMultiItem && !params.finalPriceOverride) {
    //   resolvedFinalPrice = (params.items as any[]).reduce(
    //     (sum: number, item: any) => sum + (parseFloat(item.finalPrice) || 0) * (parseFloat(item.quantity) || 1),
    //     0
    //   );
    //   // Jika semua item tidak memiliki price, biarkan 0
    // } else if (isMultiItem && params.finalPriceOverride) {
    //   resolvedFinalPrice = parseFloat(params.finalPriceOverride) || 0;
    // }

    const createPayload: any = {
      ...params,
      finalPrice: resolvedFinalPrice,
      companyId: company._id,
      editable: true,
      receivedQty: 0,
      purchaseOrderNumber: `PO - ${String(Date.now()).slice(-5)} `,
      ...(priceAlert ? { priceAlert } : {}),
    }

    // Bersihkan field yang tidak relevan untuk multi-item
    if (isMultiItem) {
      delete createPayload.finalPriceOverride
      // productId & quantity di root tidak dipakai (ada di items)
      delete createPayload.productId
      delete createPayload.quantity
    }

    if (createPayload.purchaseType === 'service') delete createPayload.productId

    const result = await Purchase.create(createPayload)

    const requested = (result as any)._doc

    // ── Build aggregation untuk populate product(s) ──────────────────────────
    const aggPipeline: any[] = [
      { $match: { _id: requested._id } },
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
      { $unwind: '$createdBy' },
      {
        $unwind: {
          path: '$product',
          preserveNullAndEmptyArrays: true
        }
      },
    ]

    // Untuk multi-item, populate setiap item.productId via $lookup tambahan
    if (isMultiItem) {
      aggPipeline.push({
        $lookup: {
          from: params.purchaseType === 'procurement' ? 'invitems' : 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: '_itemProducts'
        }
      })
    }

    if (params.purchaseType === 'procurement') {
      aggPipeline.push(
        {
          $lookup: {
            from: 'assets',
            localField: 'productId',
            foreignField: '_id',
            as: '_mainAsset'
          }
        },
        {
          $lookup: {
            from: 'assets',
            localField: 'items.productId',
            foreignField: '_id',
            as: '_itemAssets'
          }
        }
      )
    }

    const [agg] = await Purchase.aggregate(aggPipeline)

    console.log({ agg })

    // Jika multi-item, gabungkan product info ke setiap item
    let itemsWithProduct: any[] | undefined = undefined
    if (isMultiItem && (agg?._itemProducts || agg?._itemAssets)) {
      itemsWithProduct = (requested.items || []).map((item: any) => {
        const prod = (agg._itemProducts || []).find(
          (p: any) => String(p._id) === String(item.productId)
        ) || (agg._itemAssets || []).find(
          (p: any) => String(p._id) === String(item.productId)
        )
        return { ...item, product: prod }
      })
    }

    const mainProduct = agg?.product || (agg?._mainAsset && agg._mainAsset[0])

    const r = {
      ...requested,
      ...((params.purchaseType === 'product' || params.purchaseType === 'procurement') && { product: mainProduct }),
      ...(itemsWithProduct ? { items: itemsWithProduct } : {}),
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

    const productCollection = type === 'procurement' ? 'invitems' : 'products';

    const getProductIds = (root: string) => ({
      $setUnion: [
        {
          $cond: [
            { $ne: [`${root}.productId`, null] },
            [{ $toString: `${root}.productId` }],
            []
          ]
        },
        {
          $map: {
            input: { $ifNull: [`${root}.items`, []] },
            as: "item",
            in: {
              $cond: [
                { $ne: ["$$item.productId", null] },
                { $toString: "$$item.productId" },
                null
              ]
            }
          }
        }
      ]
    })

    const historyProductMatch = {
      $gt: [
        {
          $size: {
            $setIntersection: [
              "$$currentProductIds",
              getProductIds("$$ROOT")
            ]
          }
        },
        0
      ]
    }

    type LookupPipeline = NonNullable<
      Extract<PipelineStage, { $lookup: unknown }>["$lookup"]["pipeline"]
    >

    const historyPipeline = [
      {
        $match: {
          $expr: {
            $and: [
              { $ne: ["$_id", "$$currentId"] },
              { $eq: ["$companyId", "$$currentCompanyId"] },
              { $in: ["$purchaseType", ["product", "procurement"]] },
              { $ne: ["$status", "rejected"] },
              { $lte: ["$date", "$$currentDate"] },
              historyProductMatch
            ]
          }
        }
      },
      {
        $sort: {
          date: -1,
          _id: -1
        }
      }
    ] satisfies LookupPipeline

    const historyLookup: PipelineStage = {
      $lookup: {
        from: "purchases",
        let: {
          currentId: "$_id",
          currentDate: "$date",
          currentCompanyId: "$companyId",
          currentProductIds: getProductIds("$$ROOT")
        },
        pipeline: historyPipeline,
        as: "_historyCandidates"
      }
    }

    const getLastHistory = (productId: string) => ({
      $let: {
        vars: {
          previousPurchases: {
            $filter: {
              input: "$_historyCandidates",
              as: "purchase",
              cond: {
                $or: [
                  {
                    $eq: [
                      { $toString: "$$purchase.productId" },
                      { $toString: productId }
                    ]
                  },
                  {
                    $in: [
                      { $toString: productId },
                      {
                        $map: {
                          input: {
                            $ifNull: ["$$purchase.items", []]
                          },
                          as: "item",
                          in: {
                            $toString: "$$item.productId"
                          }
                        }
                      }
                    ]
                  }
                ]
              }
            }
          }
        },
        in: {
          $map: {
            input: {
              $slice: ["$$previousPurchases", 0, 3]
            },
            as: "purchase",
            in: {
              $let: {
                vars: {
                  previousItem: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: {
                            $ifNull: ["$$purchase.items", []]
                          },
                          as: "item",
                          cond: {
                            $eq: [
                              { $toString: "$$item.productId" },
                              { $toString: productId }
                            ]
                          }
                        }
                      },
                      0
                    ]
                  }
                },
                in: {
                  $mergeObjects: [
                    {
                      $ifNull: [
                        "$$previousItem",
                        {
                          productId: "$$purchase.productId",
                          pricePerUnit: "$$purchase.pricePerUnit",
                          finalPrice: "$$purchase.finalPrice",
                          payAmount: "$$purchase.payAmount",
                          quantity: "$$purchase.quantity",
                          price: "$$purchase.price"
                        }
                      ]
                    },
                    {
                      purchaseId: "$$purchase._id",
                      date: "$$purchase.date",
                      purchaseType: "$$purchase.purchaseType"
                    }
                  ]
                }
              }
            }
          }
        }
      }
    })

    const attachHistory: PipelineStage = {
      $addFields: {
        items: {
          $map: {
            input: { $ifNull: ["$items", []] },
            as: "currentItem",
            in: {
              $mergeObjects: [
                "$$currentItem",
                {
                  history: getLastHistory("$$currentItem.productId")
                }
              ]
            }
          }
        },
        history: {
          $cond: [
            { $eq: ["$productId", null] },
            null,
            getLastHistory("$productId")
          ]
        }
      }
    }

    const prs = await Purchase.aggregate([
      {
        $match: {
          companyId: cmp._id,
          purchaseType: type,
        }
      },
      {
        $sort: {
          date: -1
        }
      },

      // 1. Lookup produk utama
      {
        $lookup: {
          from: productCollection,
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

      // 1b. Fallback asset untuk produk utama jika procurement dan tidak ditemukan di invitems
      {
        $lookup: {
          from: 'assets',
          localField: 'productId',
          foreignField: '_id',
          as: '_mainAsset'
        }
      },
      {
        $unwind: {
          path: '$_mainAsset',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $addFields: {
          product: { $ifNull: ['$product', '$_mainAsset'] }
        }
      },

      // 2. Fallback: lookup produk items hanya jika produk utama tidak ditemukan
      {
        $lookup: {
          from: productCollection,
          let: {
            mainProduct: '$product',
            itemProductIds: '$items.productId'
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: [{ $ifNull: ['$$mainProduct', null] }, null] },
                    {
                      $in: [
                        '$_id',
                        { $ifNull: ['$$itemProductIds', []] }
                      ]
                    }
                  ]
                }
              }
            }
          ],
          as: '_itemProducts'
        }
      },

      // 2b. Lookup asset items untuk procurement
      {
        $lookup: {
          from: 'assets',
          let: {
            itemProductIds: '$items.productId'
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ['$_id', { $ifNull: ['$$itemProductIds', []] }]
                }
              }
            },
            {
              $lookup: {
                from: 'assetcategories',
                localField: 'category',
                foreignField: '_id',
                as: 'categoryDoc'
              }
            },
            {
              $unwind: {
                path: '$categoryDoc',
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $addFields: {
                category: '$categoryDoc'
              }
            }
          ],
          as: '_itemAssets'
        }
      },

      // 3. Lookup unit produk fallback
      {
        $lookup: {
          from: 'predefinedunits',
          localField: '_itemProducts.unit',
          foreignField: '_id',
          as: '_itemUnits'
        }
      },

      // 4. Lookup factor to base produk fallback
      {
        $lookup: {
          from: 'predefinedunits',
          localField: '_itemProducts.ftb',
          foreignField: '_id',
          as: '_itemFtbs'
        }
      },

      // 5. Masukkan produk beserta unit dan ftb ke items
      {
        $addFields: {
          items: {
            $map: {
              input: { $ifNull: ['$items', []] },
              as: 'itm',
              in: {
                $mergeObjects: [
                  '$$itm',
                  {
                    product: {
                      $let: {
                        vars: {
                          p: {
                            $arrayElemAt: [
                              {
                                $filter: {
                                  input: '$_itemProducts',
                                  as: 'p',
                                  cond: {
                                    $eq: [
                                      { $toString: '$$p._id' },
                                      { $toString: '$$itm.productId' }
                                    ]
                                  }
                                }
                              },
                              0
                            ]
                          },
                          a: {
                            $arrayElemAt: [
                              {
                                $filter: {
                                  input: '$_itemAssets',
                                  as: 'a',
                                  cond: {
                                    $eq: [
                                      { $toString: '$$a._id' },
                                      { $toString: '$$itm.productId' }
                                    ]
                                  }
                                }
                              },
                              0
                            ]
                          }
                        },
                        in: {
                          $cond: [
                            { $ne: ['$$p', null] },
                            {
                              $mergeObjects: [
                                '$$p',
                                {
                                  unit: {
                                    $arrayElemAt: [
                                      {
                                        $filter: {
                                          input: '$_itemUnits',
                                          as: 'u',
                                          cond: {
                                            $eq: ['$$u._id', '$$p.unit']
                                          }
                                        }
                                      },
                                      0
                                    ]
                                  },
                                  ftb: {
                                    $arrayElemAt: [
                                      {
                                        $filter: {
                                          input: '$_itemFtbs',
                                          as: 'u',
                                          cond: {
                                            $eq: ['$$u._id', '$$p.ftb']
                                          }
                                        }
                                      },
                                      0
                                    ]
                                  }
                                }
                              ]
                            },
                            {
                              $cond: [
                                { $ne: ['$$a', null] },
                                {
                                  $mergeObjects: [
                                    '$$a',
                                    {
                                      unit: { symbol: 'Unit', name: 'Unit' }
                                    }
                                  ]
                                },
                                null
                              ]
                            }
                          ]
                        }
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      },

      // Attach purchase history (if type !== 'service')
      ...(type !== 'service' ? [historyLookup, attachHistory] : []),

      // 6. Bersihkan field sementara
      {
        $project: {
          _itemProducts: 0,
          _itemAssets: 0,
          _mainAsset: 0,
          _itemUnits: 0,
          _itemFtbs: 0,
          _historyCandidates: 0,
          productId: 0,
          companyId: 0
        }
      },

      // 7. Lookup vendor
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

      // 8. Lookup supplier
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

      // 9. Lookup batches
      {
        $lookup: {
          from: 'batches',
          localField: 'purchaseOrderNumber',
          foreignField: 'purchaseOrderNumber',
          as: 'batches'
        }
      },

      // 10. Lookup createdBy
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

      // 11. Lookup approvedBy
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

      // 12. Lookup voidedBy
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

      // 13. Hitung receivedQty
      {
        $addFields: {
          receivedQty: {
            $cond: {
              if: { $eq: ['$purchaseType', 'procurement'] },
              then: { $ifNull: ['$receivedQty', 0] },
              else: { $sum: '$batches.qty' }
            }
          }
        }
      },

      // 14. Hapus batches
      {
        $project: {
          batches: 0
        }
      }
    ]);


    // const prs = await Purchase.aggregate(
    //   [
    //     {
    //       $match: {
    //         companyId: cmp._id,
    //         purchaseType: type,
    //         purchaseOrderNumber:'PO-39026'
    //       }
    //     },
    //     {
    //       $sort: {
    //         date: -1
    //       }
    //     },
    //     {
    //       $lookup: {
    //         from: type === 'procurement' ? 'invitems' : 'products',
    //         localField: 'productId',
    //         foreignField: '_id',
    //         as: 'product'
    //       }
    //     },
    //     {
    //       $unwind: {
    //         path: '$product',
    //         preserveNullAndEmptyArrays: true
    //       }
    //     },
    //     {
    //       $lookup: {
    //         from: type === 'procurement' ? 'invitems' : 'products',
    //         localField: 'items.productId',
    //         foreignField: '_id',
    //         as: 'product'
    //       }
    //     },
    //     {
    //       $unwind: {
    //         path: '$product',
    //         preserveNullAndEmptyArrays: true
    //       }
    //     },
    //     {
    //       $lookup: {
    //         from: 'predefinedunits',
    //         localField: 'product.unit',
    //         foreignField: '_id',
    //         as: 'product.unit'
    //       }
    //     },
    //     {
    //       $unwind: {
    //         path: '$product.unit',
    //         preserveNullAndEmptyArrays: true
    //       }
    //     },
    //     {
    //       $lookup: {
    //         from: 'predefinedunits',
    //         localField: 'product.ftb',
    //         foreignField: '_id',
    //         as: 'product.ftb'
    //       }
    //     },
    //     {
    //       $unwind: {
    //         path: '$product.ftb',
    //         preserveNullAndEmptyArrays: true
    //       }
    //     },
    //     {
    //       $addFields: {
    //         _itemProductIds: {
    //           $ifNull: [
    //             { $map: { input: { $ifNull: ['$items', []] }, as: 'itm', in: '$$itm.productId' } },
    //             []
    //           ]
    //         }
    //       }
    //     },
    //     {
    //       $addFields: {
    //         items: {
    //           $map: {
    //             input: { $ifNull: ['$items', []] },
    //             as: 'itm',
    //             in: {
    //               $mergeObjects: [
    //                 '$$itm',
    //                 {
    //                   product: {
    //                     $let: {
    //                       vars: {
    //                         p: {
    //                           $arrayElemAt: [
    //                             {
    //                               $filter: {
    //                                 input: '$_itemProducts',
    //                                 as: 'p',
    //                                 cond: {
    //                                   $eq: [
    //                                     { $toString: '$$p._id' },
    //                                     { $toString: '$$itm.productId' }
    //                                   ]
    //                                 }
    //                               }
    //                             },
    //                             0
    //                           ]
    //                         }
    //                       },
    //                       in: {
    //                         $mergeObjects: [
    //                           '$$p',
    //                           {
    //                             unit: {
    //                               $arrayElemAt: [
    //                                 {
    //                                   $filter: {
    //                                     input: '$_itemUnits',
    //                                     as: 'u',
    //                                     cond: { $eq: ['$$u._id', '$$p.unit'] }
    //                                   }
    //                                 },
    //                                 0
    //                               ]
    //                             },
    //                             ftb: {
    //                               $arrayElemAt: [
    //                                 {
    //                                   $filter: {
    //                                     input: '$_itemFtbs',
    //                                     as: 'u',
    //                                     cond: { $eq: ['$$u._id', '$$p.ftb'] }
    //                                   }
    //                                 },
    //                                 0
    //                               ]
    //                             }
    //                           }
    //                         ]
    //                       }
    //                     }
    //                   }
    //                 }
    //               ]
    //             }
    //           }
    //         }
    //       }
    //     },
    //     {
    //       $project: {
    //         '_itemProductIds': 0,
    //         'productId': 0,
    //         'companyId': 0
    //       }
    //     },
    //     {
    //       $lookup: {
    //         from: 'vendors',
    //         localField: 'vendorId',
    //         foreignField: '_id',
    //         as: 'vendor'
    //       }
    //     },
    //     {
    //       $unwind: {
    //         path: '$vendor',
    //         preserveNullAndEmptyArrays: true
    //       }
    //     },
    //     {
    //       $lookup: {
    //         from: 'suppliers',
    //         localField: 'supplierId',
    //         foreignField: '_id',
    //         as: 'supplier'
    //       }
    //     },
    //     {
    //       $unwind: {
    //         path: '$supplier',
    //         preserveNullAndEmptyArrays: true
    //       }
    //     },
    //     {
    //       $lookup: {
    //         from: 'batches',
    //         localField: 'purchaseOrderNumber',
    //         foreignField: 'purchaseOrderNumber',
    //         as: 'batches'
    //       }
    //     },
    //     {
    //       $lookup: {
    //         from: 'users',
    //         localField: 'createdBy',
    //         foreignField: '_id',
    //         as: 'createdBy'
    //       }
    //     },
    //     {
    //       $unwind: '$createdBy'
    //     },
    //     {
    //       $lookup: {
    //         from: 'users',
    //         localField: 'approvedBy',
    //         foreignField: '_id',
    //         as: 'approvedBy'
    //       }
    //     },
    //     {
    //       $unwind: {
    //         path: '$approvedBy',
    //         preserveNullAndEmptyArrays: true
    //       }
    //     },
    //     {
    //       $lookup: {
    //         from: 'users',
    //         localField: 'voidedBy',
    //         foreignField: '_id',
    //         as: 'voidedBy'
    //       }
    //     },
    //     {
    //       $unwind: {
    //         path: '$voidedBy',
    //         preserveNullAndEmptyArrays: true
    //       }
    //     },
    //     {
    //       $addFields: {
    //         receivedQty: {
    //           $cond: {
    //             if: { $eq: ["$purchaseType", "procurement"] },
    //             then: { $ifNull: ["$receivedQty", 0] },
    //             else: { $sum: "$batches.qty" }
    //           }
    //         }
    //       }
    //     },
    //     {
    //       $project: {
    //         'batches': 0
    //       }
    //     },
    //   ]
    // )

    console.log(JSON.stringify(prs, null, 2))

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