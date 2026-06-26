"use client"

import useAuth from "@/store/auth"
import useFetch from '@/hooks/useFetch'
import Link from "next/link";
import Swal from "sweetalert2";
import * as Dialog from "@radix-ui/react-dialog";
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { useRef, useEffect, useState, useMemo } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { AddInvoiceIcon } from '@hugeicons/core-free-icons'
import { Delete01Icon } from '@hugeicons/core-free-icons';
import { Edit03Icon } from '@hugeicons/core-free-icons';

export default function Order() {
  const loggedIn = useAuth((state) => state.loggedIn)
  const isSuperAdmin = useAuth((state) => state.isSuperAdmin)
  const userId = useAuth((state) => state.userId)
  const userName = useAuth((state) => state.name)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterPickupDate, setFilterPickupDate] = useState("")
  const [filterOrderNumber, setFilterOrderNumber] = useState("")
  const modalRef = useRef<HTMLDialogElement>(null)
  const cartRef = useRef<HTMLDialogElement>(null)
  const customRef = useRef<HTMLDialogElement>(null)
  const orderCartModalRef = useRef<HTMLDialogElement>(null)
  const editOrderModalRef = useRef<HTMLDialogElement>(null)
  const markUnavailableModalRef = useRef<HTMLDialogElement>(null)
  const refundModalRef = useRef<HTMLDialogElement>(null)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [unavailableTargetOrder, setUnavailableTargetOrder] = useState<any>(null)
  const [unavailablePid, setUnavailablePid] = useState<string>("")
  const [unavailableQty, setUnavailableQty] = useState<number>(1)
  const [refundTargetOrderId, setRefundTargetOrderId] = useState<string>("")
  const [refundTargetItem, setRefundTargetItem] = useState<any>(null)
  const [refundMaxQty, setRefundMaxQty] = useState<number>(0)
  const [refundInputQty, setRefundInputQty] = useState<number>(1)
  const [refundApprovalCode, setRefundApprovalCode] = useState<string>("")
  const [editingCart, setEditingCart] = useState<any[]>([])
  const [editingDiscountType, setEditingDiscountType] = useState("none")
  const [editingDiscountValue, setEditingDiscountValue] = useState(0)
  const [editingItemTaxes, setEditingItemTaxes] = useState<Record<string, string[]>>({})
  const [editingApprovalCode, setEditingApprovalCode] = useState("")
  const [cart, setCart] = useState<any[]>([])
  const [discount, setDiscount] = useState<string>("0")
  const [directSellMode, setDirectSellMode] = useState<boolean>(false)
  const [customerName, setCustomerName] = useState<string>("")
  const [customerAddress, setCustomerAddress] = useState<string>("")
  const [debt, setDebt] = useState<string>('no')
  const [payTerm, setPayTerm] = useState<string>(new Date().toISOString().split('T')[0])
  const [payAmt, setPayAmt] = useState<number>(0)
  const [paymentMethod, setPaymentMethod] = useState<string>('cash')
  const [pickupDate, setPickupDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [attachment, setAttachment] = useState<File | null>(null)
  const [contract, setContract] = useState<File | null>(null)
  const [attachmentFileName, setAttachmentFileName] = useState<string>("")
  const [contractFileName, setContractFileName] = useState<string>("")
  const [orders, setOrders] = useState<any[]>([])
  const [unAvailableList, setUnAvailableList] = useState<any[]>([])
  const [openDialog, setOpenDialog] = useState(false);


  const newOrderForm = useForm<any>({
    defaultValues: {
      payTerm: payTerm,
      pickupDate: pickupDate,
      debt: 'no',
    }
  })


  const watchDebt = newOrderForm.watch('debt')


  const orderTaxesSummary = useMemo(() => {
    const summary: Record<string, number> = {};

    const subtotals = cart.map((c) => {
      if (c.discountType === 'percent') {
        const price = parseInt(c.product.split('/')[3])
        const qty = parseInt(c.qty)
        const _discount = parseInt(c.discountValue)
        return (price * qty) - ((_discount / 100) * (price * qty))
      }

      if (c.discountType === 'fixed') {
        const qty = parseInt(c.qty)
        const price = parseInt(c.product.split('/')[3])
        const _discount = parseInt(c.discountValue) * qty
        return (price * qty) - _discount
      }
      // 'none' or any unrecognized type: full price, no discount
      const price = parseInt(c.product.split('/')[3])
      const qty = parseInt(c.qty)
      return price * qty
    })

    const totalSubtotal = subtotals.reduce((a, b) => a + b, 0)

    cart.forEach((c, idx) => {
      if (!c.taxes || c.taxes.length === 0) return;

      let taxableAmount = 0;
      const cSubtotal = subtotals[idx];

      if (cart.length === 1) {
        if (discount.includes("%")) {
          taxableAmount = totalSubtotal - (totalSubtotal * (parseInt(discount) / 100));
        }
        else {
          taxableAmount = totalSubtotal - parseInt(discount);
        }
      }
      else {
        if (discount.includes("%")) {
          taxableAmount = cSubtotal - (cSubtotal * (parseInt(discount) / 100));
        }
        else {
          let proportion = 0;
          if (totalSubtotal !== 0) {
            proportion = cSubtotal / totalSubtotal;
          }
          const proportionValue = parseInt(discount) * proportion;
          taxableAmount = cSubtotal - proportionValue;
        }
      }

      c.taxes.forEach((t: any) => {
        const taxAmt = taxableAmount * (t.taxValue / 100);
        if (!summary[t.taxName]) summary[t.taxName] = 0;
        summary[t.taxName] += taxAmt;
      });
    });

    return Object.keys(summary).map(name => ({ taxName: name, taxValue: Math.round(summary[name]) }));
  }, [discount, cart]);

  const tax = useMemo(() => {
    return orderTaxesSummary.reduce((a, b) => a + b.taxValue, 0);
  }, [orderTaxesSummary])

  const _total = useMemo(() => {
    const subTotal = getSubTotal(cart)
    const totalDiscount = getTotalDiscount(cart, discount)
    return subTotal - totalDiscount + tax
  }, [discount, cart])

  const total = useMemo(() => {
    const subTotal = getSubTotal(cart)
    const totalDiscount = getTotalDiscount(cart, discount)
    return subTotal - totalDiscount + tax
  }, [tax])

  const payAmount = useMemo(() => tax > 0 ? total : _total
    , [total, _total])


  const getCustomersFn = useFetch<any, any>({
    url: `/api/web/customers?id=${masterAccountId}`,
    method: 'GET',
    onError: (m) => {
      alert(m)
    }
  })


  const addOrderFn = useFetch<any, any>({
    url: '/api/web/order',
    method: 'POST',
    onError: (m) => {
      alert(m)
    }
  })

  const refundFn = useFetch<any, any>({
    url: '/api/web/refund',
    method: 'POST',
    onError: (m) => alert(m)
  })

  const getRefundsFn = useFetch<any[], any>({
    url: `/api/web/refund?id=xxx`,
    method: 'GET',
    onError: () => { }
  })

  function openOrderCartModal(order: any) {
    setSelectedOrder(order)
    orderCartModalRef.current?.showModal()
  }

  function openEditOrderModal(order: any) {
    setSelectedOrder(order)
    setEditingCart(order.cart?.map((item: any) => ({ productId: item.productId, qty: item.qty })) || [])
    setEditingDiscountType(order.discountType || "none")
    setEditingDiscountValue(order.discountValue || 0)

    // Build per-product taxes map
    const taxMap: Record<string, string[]> = {}
    order.cart?.forEach((item: any) => {
      const prodId = (item.productId?._id || item.productId)?.toString()
      const taxKeys = item.taxes?.filter((t: any) => t.taxName && t.taxValue)
        .map((t: any) => `${t.taxName}|${t.taxValue}`) || []
      taxMap[prodId] = taxKeys.length ? taxKeys : ['no']
    })
    setEditingItemTaxes(taxMap)

    setEditingApprovalCode("")
    editOrderModalRef.current?.showModal()
  }

  const editOrderFn = useFetch<any, any>({
    url: '/api/web/order',
    method: 'PUT',
    onError: (m) => alert(m)
  })

  function submitEditOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!editingApprovalCode) {
      alert("Approval code required");
      return;
    }

    // items must be valid
    for (const c of editingCart) {
      if (!c.qty || c.qty <= 0) {
        alert("Quantity must be more than 0");
        return;
      }

      const originalItem = selectedOrder.cart.find((oItem: any) => (oItem.productId?._id || oItem.productId)?.toString() === c.productId);
      const productDetails = getProductsFn.result?.find((p: any) => p._id?.toString() === c.productId);

      // The maximum allowable boundary is just the remaining stock (since pending orders might not deduct stock until active).
      const maxAllowed = productDetails ? productDetails.remain : Infinity;

      if (c.qty > maxAllowed) {
        const prodName = productDetails?.productName || 'Unknown Product';
        alert(`Gagal: Quantity untuk produk "${prodName}" melebihi batas stok tersedia maksimal yaitu ${maxAllowed} unit.`);
        return;
      }
    }

    // Build per-product taxes for payload
    const itemsWithTaxes = editingCart.map(c => {
      const prodId = (c.productId?._id || c.productId)?.toString()
      const taxKeys = editingItemTaxes[prodId] || ['no']
      const taxes = taxKeys.filter(t => t !== 'no').map(t => {
        const [name, value] = t.split('|')
        return { taxName: name, taxValue: parseFloat(value) }
      })
      return { ...c, taxes }
    })

    const payload = {
      _id: selectedOrder._id,
      items: itemsWithTaxes,
      discountType: editingDiscountType,
      discountValue: editingDiscountValue,
      approvalCode: editingApprovalCode,
      editingUserId: userId
    }

    editOrderFn.fn('', JSON.stringify(payload), (res) => {
      alert("Order edited successfully!");
      editOrderModalRef.current?.close();

      // refresh orders list
      const url4 = `/api/web/order?id=${masterAccountId}&type=good`
      getOrdersFn.fn(url4, JSON.stringify({}), (_) => { })
    });
  }

  function getDeliveredQty(orderId: string, productId: string) {
    const order = getOrdersFn.result.find((o) => o._id === orderId)
    return order.delivered.items.find((i) => i.productId == productId).qty
  }

  function initiateRefund(orderId: string, item: any) {
    const deliveredQty = getDeliveredQty(orderId, item.productId);

    let alreadyRefundedQty = 0;
    if (getRefundsFn.result) {
      const prodIdStr = typeof item.productId === 'string'
        ? item.productId
        : item.productId?._id?.toString() || item.productId?.toString();

      const orderRefunds = getRefundsFn.result.filter((r: any) => {
        const rOrderId = r.salesOrderId?._id?.toString() || r.salesOrderId?.toString() || r.salesOrderNumber;
        const rProdId = r.productId?._id?.toString() || r.productId?.toString();
        // Since we don't always have _id for salesOrderId fully populated identically, 
        // fallback to comparing the raw strings matching.
        return (rOrderId === orderId.toString() || r.salesOrderNumber === selectedOrder?.salesOrderNumber) && rProdId === prodIdStr;
      });

      alreadyRefundedQty = orderRefunds.reduce((sum: number, r: any) => sum + (r.qty || 0), 0);
    }

    const availableToRefund = deliveredQty - alreadyRefundedQty;

    if (!deliveredQty || availableToRefund <= 0) {
      alert(`Tidak ada kuantitas yang dapat direfund.\nDikirim: ${deliveredQty}\nSudah Direfund: ${alreadyRefundedQty}`);
      return;
    }
    setRefundTargetOrderId(orderId);
    setRefundTargetItem(item);
    setRefundMaxQty(availableToRefund);
    setRefundInputQty(1);
    setRefundApprovalCode("");
    refundModalRef.current?.showModal();
  }

  function submitRefundModal(e: React.FormEvent) {
    e.preventDefault();
    if (!refundTargetItem || !refundTargetOrderId) return;

    if (isNaN(refundInputQty) || refundInputQty <= 0 || refundInputQty > refundMaxQty) {
      alert("Invalid quantity.");
      return;
    }

    if (!refundApprovalCode) {
      alert("Approval code is required.");
      return;
    }

    // Per-unit base subtotal (after per-item discount, stored in item.subTotal)
    const perUnitSubtotal = refundTargetItem.subTotal / refundTargetItem.qty;

    // Order-level discount per unit
    let perUnitOrderDiscount = 0;
    const orderDiscountType = selectedOrder?.discountType;
    const orderDiscountValue = selectedOrder?.discountValue || 0;
    if (orderDiscountType === 'percent' && orderDiscountValue > 0) {
      // Proportional percent discount applies uniformly per unit
      perUnitOrderDiscount = perUnitSubtotal * (orderDiscountValue / 100);
    }
    else if (orderDiscountType === 'fixed' && orderDiscountValue > 0) {
      // Fixed discount distributed proportionally across all cart items
      const allItemsSubtotal = (selectedOrder?.cart || []).reduce((s: number, c: any) => s + (c.subTotal || 0), 0);
      const proportion = allItemsSubtotal > 0 ? refundTargetItem.subTotal / allItemsSubtotal : 0;
      perUnitOrderDiscount = (orderDiscountValue * proportion) / refundTargetItem.qty;
    }

    // Per-unit tax (sum of stored taxAmount for all taxes on this item, divided by qty)
    const totalTaxOnItem = (refundTargetItem.taxes || []).reduce((s: number, t: any) => s + (t.taxAmount || 0), 0);
    const perUnitTax = totalTaxOnItem / refundTargetItem.qty;

    // Taxable base per unit after order-level discount
    const perUnitTaxable = perUnitSubtotal - perUnitOrderDiscount;

    // Refund amount = (taxable base + tax) × returned qty
    const refundAmount = Math.round((perUnitTaxable + perUnitTax) * refundInputQty);

    const params = {
      orderId: refundTargetOrderId,
      productId: refundTargetItem.productId,
      warehouseId: refundTargetItem.warehouseId,
      qty: refundInputQty,
      refundAmount: refundAmount,
      approvalCode: refundApprovalCode,
      creatorId: userId,
      creatorName: userName
    }

    if (refundInputQty > refundMaxQty) {
      alert('invalid quantity')
    }
    else {
      refundFn.fn('', JSON.stringify(params), () => {
        alert(`Refund berhasil! Kredit refund: ${refundAmount.toLocaleString('id-ID')}. Log refund telah dibuat.`);

        // Refresh refunds so next attempt will compute correctly
        const url7 = `/api/web/refund?id=${masterAccountId}`
        getRefundsFn.fn(url7, JSON.stringify({}), (_) => { })

        refundModalRef.current?.close();
        orderCartModalRef.current?.close();
      })
    }
  }

  const directSellFn = useFetch<any, any>({
    url: '/api/web/csale',
    method: 'POST',
    onError: (m) => {
      alert(m)
    }
  })
  const getLocationsFn = useFetch<any, any>({
    url: `/api/web/location?id=xxx`,
    method: 'GET',
    onError: (m) => {
      alert(m)
    }
  })
  const getOrdersFn = useFetch<any, any>({
    url: `/api/web/orders?id=xxx`,
    method: 'GET',
    onError: (m) => {
      alert(m)
    }
  })

  const getProductsFn = useFetch<any, any>({
    url: `/api/web/products?id=xxx`,
    method: 'GET',
    onError: (m) => {
      alert(m)
    }
  })
  const getDSaleStockFn = useFetch<any, any>({
    url: `/api/web/csale`,
    method: 'GET',
    onError: (m) => {
      alert(m)
    }
  })
  const getTaxesFn = useFetch<any[], any>({
    url: `/api/web/tax?id=xxx`,
    method: 'GET',
    onError: (m) => {
      alert(m)
    }
  })

  const activateInvoiceFn = useFetch<any, any>({
    url: '/api/web/invoice/product',
    method: 'PUT',
    onError: (m) => {
      alert(m)
    }
  })
  const bankAccountFn = useFetch<any, any>({
    url: `/api/web/bank-accounts?id=xxx`,
    method: 'GET',
    onError: (m) => {
      alert(m)
    }
  })
  function activateInvoice(x: any, son: string) {

    const newPrices = x.cart.map((c) => {
      const subTotal = c.subTotal
      const qty = c.qty
      if (x.discountType === 'percent') {
        let total = 0;
        total = subTotal - (subTotal * x.discountValue / 100)
        c.taxes.forEach((t: any) => {
          total = total + (total * t.taxValue / 100)
        })

        return {
          productId: c.productId,
          newPrice: total / qty
        }
      }
      else {
        // handled later
      }
    })

    const unavailable = newPrices.map((n) => {
      const [filter] = unAvailableList.filter(c => c.id == n.productId)
      return n.newPrice * filter.qty
    })


    const totalUnavailable = unavailable.reduce((acc, curr) => acc + curr, 0);

    const unavalaibleList = unAvailableList.map((u) => {
      return {
        productId: u.id,
        qty: u.qty,
      }
    })


    const params = {
      salesOrderNumber: son,
      status: 'active',
      unavailable: totalUnavailable,
      unavailableList: unavalaibleList
    }


    activateInvoiceFn.fn(``, JSON.stringify(params), (r) => {
      alert("Invoice activated successfully")
    })
  }

  async function addToCart(data: any) {
    let taxes: { taxName: string, taxValue: number }[] = []
    if (data.ppn) {
      const selectedTaxes = Array.isArray(data.ppn) ? data.ppn : [data.ppn];
      taxes = selectedTaxes
        .filter((p: string) => p !== 'no')
        .map((p: string) => {
          const [n, v] = p.split('|')
          return { taxName: n, taxValue: parseFloat(v) }
        });
    }

    const [_id, name, limit, price, discountType, discountValue] = data.product.split('/')

    const item = {
      product: data.product,
      qty: parseInt(data.qty),
      batches: data.batches,
      price: parseInt(data.qty) * parseInt(price),
      discountType: discountType,
      discountValue: parseInt(discountValue),
      taxes: taxes,
      debt: data.debt,
      warehouseId: data.warehouseId
    }


    if (data.qty > parseInt(limit)) {
      alert('stock not enough')
    }
    else {
      const [filter] = cart.filter(c => {
        return c.product.includes(`${_id}/${name}`)
      })

      if (filter) {
        const index = cart.findIndex(c => {
          return c.product.includes(`${_id}/${name}`)
        })

        const newCart = [...cart]
        newCart[index] = {
          ...item
        }
        setCart(newCart)
      }
      else {
        setCart(
          [
            item,
            ...cart
          ]
        )
      }
    }


  }

  function submit(data: any) {
    const formData = new FormData()
    formData.append("id", masterAccountId)
    formData.append("contract", contract as any)
    formData.append("attachment", attachment as any)
    formData.append("productType", "good")

    Object.keys(data).forEach((key) => {
      formData.append(key, data[key])
    })

    addOrderFn.fn('', formData, (r) => {
      modalRef.current?.close()

      setOrders(
        [
          r,
          ...orders
        ]
      )
    })
  }

  async function attachmentSubmit(e: any) {
    const file = e.target.files[0]
    setAttachment(file)
    setAttachmentFileName(file.name)
  }

  async function contractSubmit(e: any) {
    const file = e.target.files[0]
    setContract(file)
    setContractFileName(file.name)
  }

  async function onProdChg(e: any) {
    const locationId = useAuth.getState().locationId;
    const url = `/api/web/csale?&prod=${e.target.value.split('/')[0]}&locationId=${locationId}`

    getDSaleStockFn.fn(url, JSON.stringify({}), result => { })
  }

  function cartToggle(dst: string) {
    if (dst === "toCart") {
      customRef.current?.close()
      cartRef.current?.showModal()
    }
    else {
      cartRef.current?.close()
      customRef.current?.showModal()
    }
  }


  function getTotalDiscount(cart: any[], d: string) {
    const discount = cart.map((c) => {
      if (c.discountType === 'percent') {
        const price = parseInt(c.product.split('/')[3])
        const qty = parseInt(c.qty)
        const discount = parseInt(c.discountValue)
        return (discount / 100) * (price * qty)
      }

      if (c.discountType === 'fixed') {
        const qty = parseInt(c.qty)
        const price = parseInt(c.product.split('/')[3])
        const discount = parseInt(c.discountValue)
        return discount * qty
      }

      return 0
    })

    const subtotals = cart.map((c) => {
      if (c.discountType === 'percent') {
        const price = parseInt(c.product.split('/')[3])
        const qty = parseInt(c.qty)
        const _discount = parseInt(c.discountValue)
        return (price * qty) - ((_discount / 100) * (price * qty))
      }

      if (c.discountType === 'fixed') {
        const qty = parseInt(c.qty)
        const price = parseInt(c.product.split('/')[3])
        const _discount = parseInt(c.discountValue) * qty
        return (price * qty) - _discount
      }

      // 'none' or any unrecognized type: full price, no discount
      const price = parseInt(c.product.split('/')[3])
      const qty = parseInt(c.qty)
      return price * qty
    })

    const total = subtotals.reduce((a, b) => a + b, 0)

    const _discount = discount.reduce((a, b) => a + b, 0)

    if (d.includes("%")) {
      return _discount + (total * (parseInt(d) / 100))
    }
    else {
      return _discount + parseInt(d)
    }
  }

  function getSubTotal(cart: any[]) {
    const prices = cart.map((c) => {
      const price = parseInt(c.product.split('/')[3])
      const qty = parseInt(c.qty)
      return price * qty
    })

    return prices.reduce((a, b) => {
      return a + b
    }, 0)
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
  }


  function done() {
    const discountType = discount.includes("%") ? 'percent' : 'fixed'
    const _payAmt = payAmt > 0 ? payAmt : 0
    const discountValue = parseInt(discount)

    const subtotals = cart.map((c) => {
      if (c.discountType === 'percent') {
        const price = parseInt(c.product.split('/')[3])
        const qty = parseInt(c.qty)
        const _discount = parseInt(c.discountValue)
        return (price * qty) - ((_discount / 100) * (price * qty))
      }

      if (c.discountType === 'fixed') {
        const qty = parseInt(c.qty)
        const price = parseInt(c.product.split('/')[3])
        const _discount = parseInt(c.discountValue) * qty
        return (price * qty) - _discount
      }
      // 'none' or any unrecognized type: full price, no discount
      const price = parseInt(c.product.split('/')[3])
      const qty = parseInt(c.qty)
      return price * qty
    })

    const totalSubtotal = subtotals.reduce((a, b) => a + b, 0)


    const _cart = cart.map((c, idx) => {
      const productId = c.product.split("/")[0]
      const qty = c.qty
      const subTotal = qty * c.price

      let taxableAmount = 0;
      const cSubtotal = subtotals[idx];

      if (cart.length === 1) {
        if (discount.includes("%")) {
          taxableAmount = totalSubtotal - (totalSubtotal * (parseInt(discount) / 100));
        }
        else {
          taxableAmount = totalSubtotal - parseInt(discount);
        }
      }
      else {
        if (discount.includes("%")) {
          taxableAmount = cSubtotal - (cSubtotal * (parseInt(discount) / 100));
        }
        else {
          let proportion = 0;
          if (totalSubtotal !== 0) {
            proportion = cSubtotal / totalSubtotal;
          }
          const proportionValue = parseInt(discount) * proportion;
          taxableAmount = cSubtotal - proportionValue;
        }
      }

      const exactTaxes = (c.taxes || []).map((t: any) => ({
        taxName: t.taxName,
        taxValue: t.taxValue,
        taxAmount: Math.round(taxableAmount * (t.taxValue / 100))
      }))

      return {
        productId,
        qty,
        subTotal: cSubtotal, // per-item subtotal after per-item discount (not the grand total)
        taxes: exactTaxes,
        warehouseId: c.warehouseId
      }
    })

    const customCustomer = {
      name: customerName,
      address: customerAddress
    }

    const params = JSON.stringify({
      id: masterAccountId,
      cart: _cart,
      discountType,
      discountValue,
      tax,
      taxes: orderTaxesSummary,
      total: payAmount,
      debt,
      payTerm,
      pickupDate,
      payAmount: _payAmt,
      paymentMethod,
      customCustomer,
      userId
    })

    directSellFn.fn('', params, async r => {
      window.location.href = `/sales/order`
      // const saleDate = r.saleDate
      // const salesOrderNumber = r.salesOrderNumber
      // const [{ productId, qty }] = r.cart // (productId)
      // const _product = await fetch(`/api/web/product?_id=${productId}`)
      // const response = await _product.json()
      // const product = r.cart.length > 1 ? 'various item' : response.result
      // const variousItem = cart.length > 1 ? true : false
      // const quantity = variousItem ? '?' : qty
      // const total = r.total
      // const discountType = r.discountType
      // const discountValue = r.discountValue
      // const taxValue = r.taxValue
      // const payTerm = r.payTerm

      // const result = {
      //   _id: r._id,
      //   saleDate,
      //   salesOrderNumber,
      //   cart: r.cart,
      //   product,
      //   variousItem,
      //   quantity,
      //   total,
      //   discountType,
      //   discountValue,
      //   taxValue,
      //   payTerm,
      //   pickupDate,
      //   customCustomer
      // }

      // getOrdersFn.reset(
      //   [
      //     result,
      //     ...getOrdersFn.result
      //   ]
      // )

      // setDirectSellMode(
      //   false
      // )

    })
  }

  const filteredOrders = useMemo(() => {
    if (!getOrdersFn.result) return [];

    return getOrdersFn.result.filter((order: any) => {
      const matchesSearch = searchTerm === "" ||
        (order.salesOrderNumber?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (order.customCustomer?.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (order.customer?.bussinessName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (order.product?.productName?.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesOrderNumber = filterOrderNumber === "" ||
        order.salesOrderNumber?.toLowerCase().includes(filterOrderNumber.toLowerCase());

      const matchesPickupDate = filterPickupDate === "" ||
        (order.pickupDate && new Date(order.pickupDate).toISOString().split('T')[0] === filterPickupDate);

      return matchesSearch && matchesOrderNumber && matchesPickupDate;
    });
  }, [getOrdersFn.result, searchTerm, filterOrderNumber, filterPickupDate]);

  function onCustomerChg(e: any) {
    setCustomerName(e.target.value)
    const customer = getCustomersFn.result?.find((customer: any) => customer.bussinessName === e.target.value)
    if (customer) setCustomerAddress(customer.address)
  }

  const searchParams = useSearchParams()
  const qNumber = searchParams.get("qNumber")

  useEffect(() => {
    if (hasHydrated && qNumber) {
      const url = `/api/web/quotations?qNumber=${qNumber}&type=good`
      fetch(url)
        .then(res => res.json())
        .then(data => {
          if (data.result && data.result.length > 0) {
            const q = data.result[0]
            setDirectSellMode(true)
            setCustomerName(q.customer?.bussinessName || "")
            setCustomerAddress(q.customer?.address || "")
            setDiscount(q.discountType === "percent" ? `${q.discountValue}%` : `${q.discountValue}`)

            const prefilledCart = q.cart.map((item: any) => {
              // We need to find the product object for this cart item
              // But for the Direct Sale form, it expects a string like "id/name/limit/price/discountType/discountValue"
              // We'll try to find it in getProductsFn.result
              const p = getProductsFn.result?.find((prod: any) => prod._id === item.productId)
              if (p) {
                return {
                  product: `${p._id}/${p.productName}/${p.remain}/${p.sellingPrice}/${p.discountType}/${p.discountValue}`,
                  qty: item.qty,
                  price: item.subTotal,
                  discountType: q.discountType,
                  discountValue: q.discountValue,
                  taxes: item.taxes || [],
                  warehouseId: item.warehouseId
                }
              }
              return null
            }).filter((i: any) => i !== null)

            setCart(prefilledCart)
          }
        })
    }
  }, [hasHydrated, qNumber, getProductsFn.result])

  function openUnavailableModal(order: any) {
    setUnavailableTargetOrder(order)
    if (order.cart && order.cart.length > 0) {
      setUnavailablePid(order.cart[0].productId)
    }
    setUnavailableQty(1)
    markUnavailableModalRef.current?.showModal()
  }

  function submitUnavailable(e: React.FormEvent) {
    e.preventDefault()
    if (!unavailableTargetOrder) return

    const selectedCartItem = unavailableTargetOrder.cart.find((c: any) => c.productId === unavailablePid)
    if (!selectedCartItem) {
      alert("Please select a valid product.")
      return
    }

    if (unavailableQty > selectedCartItem.qty || unavailableQty <= 0) {
      Swal.fire({
        title: "Error",
        text: "Gagal: Jumlah tidak valid atau melebihi jumlah pesanan",
        icon: "error",
        confirmButtonText: "OK"
      })
      return
    }

    const existingIndex = unAvailableList.findIndex((c: any) => c.id === unavailablePid)
    if (existingIndex !== -1) {
      const newUnAvailableList = [...unAvailableList]
      newUnAvailableList[existingIndex] = { qty: unavailableQty.toString(), id: unavailablePid }
      setUnAvailableList(newUnAvailableList)
    } else {
      setUnAvailableList([
        ...unAvailableList,
        { qty: unavailableQty.toString(), id: unavailablePid }
      ])
    }

    markUnavailableModalRef.current?.close()
    Swal.fire({
      title: "Success",
      text: "Produk ditandai ke daftar unavailable.",
      icon: "success",
      timer: 1500,
      showConfirmButton: false
    })
  }

  function addUnvailable(order: any) {
    openUnavailableModal(order)
  }

  function remove(id: string) {
    setUnAvailableList(unAvailableList.filter((item: any) => item.id !== id))
  }


  useEffect(() => {
    if (hasHydrated) {
      const url4 = `/api/web/order?id=${masterAccountId}&type=good`
      const url = `/api/web/products?id=${masterAccountId}&type=good`
      const url2 = `/api/web/location?id=${masterAccountId}`
      const url3 = `/api/web/tax?id=${masterAccountId}`
      const url5 = `/api/web/bank-accounts?id=${masterAccountId}`
      const url6 = `/api/web/customers?id=${masterAccountId}`
      const url7 = `/api/web/refund?id=${masterAccountId}`

      getProductsFn.fn(url, JSON.stringify({}), _ => { })
      getLocationsFn.fn(url2, JSON.stringify({}), _ => { })
      getOrdersFn.fn(url4, JSON.stringify({}), (_) => { })
      getTaxesFn.fn(url3, JSON.stringify({}), (_) => { })
      bankAccountFn.fn(url5, JSON.stringify({}), (_) => { })
      getCustomersFn.fn(url6, JSON.stringify({}), (_) => { })
      getRefundsFn.fn(url7, JSON.stringify({}), (_) => { })
    }
  }, [masterAccountId])

  return directSellMode ? (
    <>
      <div className="h-full p-6 flex flex-col gap- text-black">
        <span className="text-2xl">Product Order</span>
        <div className="bg-white h-full border-t-4 border-blue-900 flex flex-row relative divide-x">
          <div className="flex flex-col gap-3 divide-y p-3">
            <form className="flex flex-col p-6 gap-3">
              <div className="flex flex-row items-center gap-3">
                <label className="w-[70px]">Customer</label>
                <input
                  placeholder="quantity"
                  type="text"
                  value={customerName}
                  className="input flex-1"
                  list="customers"
                  onChange={(e) => onCustomerChg(e)}
                />
                <datalist id="customers">
                  {getCustomersFn.result?.map((customer: any) => (
                    <option key={customer._id} value={customer.bussinessName} />
                  ))}
                </datalist>
              </div>
              <div className="flex flex-row items-center gap-3">
                <label className="w-[70px]">Address</label>
                <input
                  placeholder="address"
                  type="text"
                  value={customerAddress}
                  className="input flex-1"
                  onChange={(e) => setCustomerAddress(e.target.value)}
                />
              </div>
              <div className="flex flex-row items-center gap-3">
                <label className="w-[70px]">Discount</label>
                <input
                  value={discount}
                  placeholder="discount value" {...newOrderForm.register("discount", { onChange: (e) => setDiscount(e.target.value === '' ? '0' : e.target.value) })}
                  type="text" className="input flex-1"
                />
              </div>
              <div className="flex flex-row items-center gap-3">
                <label className="w-[85px]">Debt</label>
                <select {...newOrderForm.register('debt', { onChange: (e) => setDebt(e.target.value) })} className="select w-full">
                  <option>
                    no
                  </option>
                  <option>
                    yes
                  </option>
                </select>
              </div>
              <div className={`flex flex-row items-center gap-3`}>
                <label className="w-[85px]">Payment Method</label>
                <select {...newOrderForm.register('paymentMethod', { onChange: (e) => setPaymentMethod(e.target.value) })} className="select w-full">
                  <option>Cash</option>
                  {bankAccountFn.result?.map((bankAccount: any) => (
                    <option value={`transfer to ${bankAccount.bank}`} key={bankAccount._id}>transfer to {bankAccount.bank} ({bankAccount.accountName})</option>
                  ))}
                </select>
              </div>
              <div className={`flex flex-row items-center gap-3 ${watchDebt === 'yes' ? '' : 'hidden'}`}>
                <label className="w-[70px]">Pay term</label>
                <label className="input flex-1">
                  <input {...newOrderForm.register('payTerm', { onChange: (e) => setPayTerm(e.target.value) })} type="date" placeholder="pay term" />
                </label>
              </div>
              <div className={`flex flex-row items-center gap-3`}>
                <label className="w-[70px]">Pickup date</label>
                <label className="input flex-1">
                  <input {...newOrderForm.register('pickupDate', { onChange: (e) => setPickupDate(e.target.value) })} type="date" placeholder="pickup date" />
                </label>
              </div>
              <div className={`flex flex-row items-center gap-3`}>
                <label className="w-[70px]">Pay Amount</label>
                <input
                  placeholder={`${payAmount} (default: full total)`}
                  {...newOrderForm.register("payAmount", { onChange: (e) => setPayAmt(parseInt(e.target.value) || 0) })}
                  type="number"
                  className="input flex-1"
                  min={0}
                />
              </div>
            </form>
            <form className="flex-1 flex flex-col gap-3 p-6" onSubmit={newOrderForm.handleSubmit(addToCart)}>
              <div className="flex flex-row items-center gap-3">
                <label className="w-[85px]">Product</label>
                <select {...newOrderForm.register('product', { onChange: onProdChg })} className="select w-full">
                  <option>Available Product:</option>
                  {
                    getProductsFn?.result?.map((p) => {
                      return (
                        <option key={p._id} value={`${p._id}/${p.productName}/${p.remain}/${p.sellingPrice}/${p.discountType}/${p.discountValue}`}>{p.productName}</option>
                      )
                    })
                  }
                </select>
              </div>
              <div className="flex flex-row items-center gap-3">
                <label className="w-[85px]">Warehouse</label>
                <select {...newOrderForm.register('warehouseId')} className="select w-full">
                  <option>Available Warehouse:</option>
                  {
                    getDSaleStockFn?.result?.map((l) => {
                      return (
                        <option key={l._id} value={l._id} >{l.name} ({l.available})</option>
                      )
                    })
                  }
                </select>
              </div>
              <div className="flex flex-row items-center gap-3">
                <label className="w-[70px]">Qty</label>
                <input placeholder="quantity" {...newOrderForm.register("qty")} type="text" className="input flex-1" />
              </div>
              <div className="flex flex-row items-center gap-3">
                <label className="w-[85px]">Tax</label>
                <select multiple {...newOrderForm.register('ppn')} className="select w-full h-24">
                  <option value="no">
                    no tax
                  </option>
                  {
                    getTaxesFn?.result?.map((t: any) => {
                      return <option key={t._id} value={`${t.name}|${t.value}`}>{t.name} ({t.value}%)</option>
                    })
                  }
                </select>
              </div>
              <div className="flex flex-row gap-2 mt-6">
                <button type="submit" className="bg-black p-3 rounded-md text-white w-full">
                  add
                </button>
                <button onClick={done} type="button" className="bg-black p-3 rounded-md text-white w-full">
                  done
                </button>
                <button onClick={() => setDirectSellMode(false)} type="button" className="bg-red-900 p-3 rounded-md text-white w-full">
                  cancel
                </button>
              </div>
            </form>

          </div>

          <div className="flex-1 flex flex-col divide-y p-6">
            <div className="p-3">
              <p className="py-4 font-bold text-red-900">Please review your order once more</p>
              <ul className="flex flex-col">
                {
                  cart.map((c) => {
                    return (
                      <li key={generateId()}>{`${c.product.split('/')[1]}@${c.qty}`} ({c.price})</li>
                    )
                  })
                }
              </ul>
            </div>
            <div className="p-3">
              <p>Subtotal : {getSubTotal(cart)}</p>
              <p>Total discount : {getTotalDiscount(cart, discount)}</p>
              <p>Total tax : {tax}</p>
              <p>Total : {tax > 0 ? total : _total}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
    :
    (
      <>
        <div className="h-full p-6 flex flex-col gap-3 text-black">
          <span className="text-2xl">Product Order</span>
          <div className="bg-white h-full border-t-4 border-blue-900 flex flex-col p-6 gap-6 relative">
            <div className="flex flex-row">
              <span className="self-center">All order</span>
              <div className="flex flex-row gap-3 ml-auto">
                <button disabled onClick={() => modalRef.current?.showModal()} className="btn m">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Add
                </button>
                <button onClick={() => setDirectSellMode(true)} className="btn ml-auto">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Custom
                </button>
              </div>
            </div>
            <div className="flex flex-row">
              <div className="flex flex-row gap-2 items-center">
                Show
                <select className="select w-16">
                  <option>20</option>
                  <option>30</option>
                  <option>40</option>
                </select>
                Entries
              </div>
              <div className="ml-auto flex flex-row gap-2">
                <input
                  type="date"
                  placeholder="Filter by Pickup Date"
                  className="border-1 border-black rounded-md p-3"
                  value={filterPickupDate}
                  onChange={(e) => setFilterPickupDate(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Filter Order Number"
                  className="border-1 border-black rounded-md p-3"
                  value={filterOrderNumber}
                  onChange={(e) => setFilterOrderNumber(e.target.value)}
                />
              </div>
            </div>
            {
              getOrdersFn.loading
                ?
                <div className="flex-1 flex flex-col justify-center items-center">
                  <span className="loading loading-spinner loading-xl"></span>
                </div>
                :
                getOrdersFn.error || getOrdersFn.noResult
                  ?
                  <div>
                    <p>{getOrdersFn.message}</p>
                  </div>
                  :
                  <div className="overflow-x-auto w-full min-h-[400px] pb-32">
                    <table className="table text-center whitespace-nowrap">
                      <thead>
                        <tr>
                          <th>Sale Date</th>
                          <th>Created By</th>
                          <th>Edited by</th>
                          <th>Approved by</th>
                          <th>Edited at</th>
                          <th>Order Number</th>
                          <th>Product</th>
                          <th>Customer</th>
                          <th>Price</th>
                          <th>Discount</th>
                          <th>Tax</th>
                          <th>Pay Term</th>
                          <th>Pickup date</th>
                          <th>...</th>
                        </tr>
                      </thead>
                      <tbody>
                        {
                          filteredOrders.map((x: any, index: number) => {
                            return (
                              <tr key={index}>
                                <td>{new Date(x.saleDate).toLocaleString("id-ID")}</td>
                                <td className="text-left whitespace-nowrap">
                                  <div className="flex flex-col gap-1">
                                    {x.u?.name || '-'}
                                  </div>
                                </td>
                                <td className="text-left whitespace-nowrap">
                                  <div className="flex flex-col gap-1">
                                    {x.editor?.name || '-'}
                                  </div>
                                </td>
                                <td className="text-left whitespace-nowrap">
                                  <div className="flex flex-col gap-1">
                                    {x.approver?.name || '-'}
                                  </div>
                                </td>
                                <td className="text-left whitespace-nowrap">
                                  <div className="flex flex-col gap-1">
                                    {x.editedAt ? new Date(x.editedAt).toLocaleString("id-ID") : '-'}
                                  </div>

                                </td>
                                <td>{x.salesOrderNumber}</td>
                                <td>
                                  {x.variousItem ? (
                                    <div className="dropdown dropdown-hover dropdown-right dropdown-end z-[100]">
                                      <div tabIndex={0} role="button" className="font-bold text-[11px] bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full border border-indigo-200 cursor-pointer hover:bg-indigo-100 transition-colors inline-block whitespace-nowrap shadow-sm">
                                        {(x.cart?.length || 0)} Items
                                      </div>
                                      <ul tabIndex={0} className="dropdown-content z-[110] menu p-3 shadow-2xl bg-white rounded-xl w-64 text-left border border-gray-100 ml-2 mt-[-20px] max-h-[300px] flex-nowrap overflow-y-auto">
                                        <li className="menu-title text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 border-b border-gray-100 pb-2 px-1">Isi Keranjang</li>
                                        {x.cart?.map((c: any, i: number) => {
                                          const pId = c.productId?._id || c.productId
                                          const prodName = c.productId?.productName || getProductsFn.result?.find((p: any) => p._id === pId)?.productName || 'Unknown Product'
                                          return (
                                            <li key={i} className="py-1">
                                              <div className="flex justify-between items-start gap-2 p-1.5 hover:bg-gray-50 rounded-lg pointer-events-none">
                                                <span className="text-xs font-semibold text-gray-700 whitespace-normal leading-tight">{prodName}</span>
                                                <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md mt-0.5 whitespace-nowrap border border-blue-100">x{c.qty}</span>
                                              </div>
                                            </li>
                                          )
                                        })}
                                      </ul>
                                    </div>
                                  ) : (
                                    <span className="font-medium text-gray-700 whitespace-normal block min-w-[120px] max-w-[160px]">{x.product?.productName || '-'}</span>
                                  )}
                                </td>
                                <td>{x.customCustomer ? x.customCustomer.name : (x.customer?.bussinessName || '-')}</td>
                                <td>{Number(x.total).toLocaleString("id-ID")}</td>
                                <td>{x.discountType === "percent" ? Math.round(x.total * (x.discountValue / 100)).toLocaleString("id-ID") : Number(x.discountValue).toLocaleString("id-ID")}</td>
                                <td>{Number(x.taxValue).toLocaleString("id-ID")}</td>
                                <td>{x.payTerm ? new Date(x.payTerm).toLocaleString("id-ID") : '-'}</td>
                                <td>{x.pickupDate ? new Date(x.pickupDate).toLocaleString("id-ID") : '-'}</td>
                                <td>
                                  <div className="dropdown dropdown-left dropdown-bottom z-50">
                                    <div tabIndex={0} role="button" className="btn btn-sm btn-ghost btn-circle">
                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
                                      </svg>
                                    </div>
                                    <ul tabIndex={0} className="dropdown-content menu p-2 shadow-2xl bg-base-100 rounded-box w-56 flex flex-col gap-1 border border-base-300 z-[100] text-sm">
                                      <li>
                                        <button onClick={() => openEditOrderModal(x)} className="flex items-center gap-3">
                                          <HugeiconsIcon icon={Edit03Icon} size={18} />
                                          <span className="font-semibold text-gray-700">Edit Order</span>
                                        </button>
                                      </li>
                                      <li>
                                        <button onClick={() => openOrderCartModal(x)} className="flex items-center gap-3">
                                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
                                          </svg>
                                          <span className="font-semibold text-gray-700">View Cart / Refund</span>
                                        </button>
                                      </li>
                                      <li>
                                        <button onClick={() => addUnvailable(x)} className="flex items-center gap-3 text-red-600 hover:text-red-700 hover:bg-red-50">
                                          <HugeiconsIcon icon={Delete01Icon} size={18} />
                                          <span className="font-semibold">Mark Unavailable</span>
                                        </button>
                                      </li>
                                      <li>
                                        <button onClick={() => activateInvoice(x, x.salesOrderNumber)} className="flex items-center gap-3 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                          {activateInvoiceFn.loading ? <span className="loading loading-spinner loading-xs"></span> : <HugeiconsIcon icon={AddInvoiceIcon} size={18} />}
                                          <span className="font-semibold">Activate Invoice</span>
                                        </button>
                                      </li>
                                    </ul>
                                  </div>
                                </td>
                              </tr>
                            )
                          })
                        }
                      </tbody>
                    </table>
                  </div>
            }
            <button className="bg-black text-white rounded-full p-3 absolute right-10 bottom-10">
              <Link href="/sales/xorder">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                </svg>
              </Link>
            </button>

            <button onClick={() => setOpenDialog(true)} className="bg-black p-3 text-white rounded-full absolute bottom-10 right-23">
              <HugeiconsIcon icon={AddInvoiceIcon} />
            </button>
          </div>
        </div>
        <dialog ref={modalRef} id="my_modal_1" className="modal h-full text-black">
          <form onSubmit={newOrderForm.handleSubmit(submit)} className="h-100 modal-box flex flex-col gap-3">
            <h3 className="text-lg font-bold">Make order</h3>
            <div className="flex flex-row items-center gap-3">
              <label className="w-[70px]">Quotation Number</label>
              <input {...newOrderForm.register("qNumber")} type="text" className="input flex-1" />
            </div>
            <div className="flex flex-row items-center gap-3">
              <label className="w-[70px]">Pay term</label>
              <label className="input flex-1">
                <input {...newOrderForm.register('payTerm')} type="text" placeholder="pay term" />
                <span className="badge badge-neutral badge-xs">Days</span>
              </label>
            </div>
            <div className="flex flex-row items-center gap-3">
              <label className="w-[90px]">Contract Document</label>
              <input onChange={(e) => contractSubmit(e)} type="file" className="file-input flex-1" />
            </div>
            <div className="flex flex-row items-center gap-3">
              <label className="w-[90px]">Attachment</label>
              <input type="file" onChange={(e) => attachmentSubmit(e)} className="file-input flex-1" />
            </div>
            {addOrderFn.noResult || addOrderFn.error ? <label className="input-validator text-red-900" htmlFor="role">something went wrong</label> : <></>}
            <div className="flex flex-row gap-3 modal-action">
              <button className="btn bg-red-900 text-white">Submit</button>
            </div>
          </form>
        </dialog>
        <dialog id="my_modal_3" ref={cartRef} className="modal text-black">
          <div className="modal-box flex flex-col gap-3">
            <h3 className="text-lg font-bold">Cart!</h3>
            <p className="py-4">Please review your order once more</p>
            <ul className="flex flex-col">
              {
                cart.map((c) => {
                  return (
                    <li key={c._id}>{`${c.product.split('/')[1]}@${c.qty}`} ({c.price})</li>
                  )
                })
              }
            </ul>
            <p>===============================</p>
            <div>
              <p>Total price : {getSubTotal(cart)}</p>
              <p>Total discount : {getTotalDiscount(cart, discount)}</p>
              <p>Total tax : {tax}</p>
            </div>
            <form>
              <input
                onChange={(e) => {
                  if (e.target.value === '') {
                    setDiscount('0')
                  }
                  else {
                    setDiscount(e.target.value)
                  }
                }}
                type="text"
                className="w-[300px] border-2 border-black p-3 rounded-md"
                placeholder="discount value"
              />
            </form>
            <div className="modal-action">
              <button className="btn" onClick={() => cartToggle("toPreorder")}>Back</button>
              <button className="btn">Order</button>
            </div>
          </div>
        </dialog>
        <dialog ref={customRef} id="my_modal_2" className="modal h-full text-black">
          <form onSubmit={newOrderForm.handleSubmit(addToCart)} className="h-120 modal-box flex flex-col gap-3">
            <h3 className="text-lg font-bold">Preorder</h3>
            <div className="flex flex-row items-center gap-3">
              <label className="w-[85px]">Product</label>
              <select {...newOrderForm.register('product', { onChange: onProdChg })} className="select w-full">
                <option>Available Product:</option>
                {
                  getProductsFn?.result?.map((p) => {
                    return (
                      <option key={p._id} value={`${p._id}/${p.productName}/${p.allocated}/${p.sellingPrice}/${p.applicableTax}`}>{p.productName}</option>
                    )
                  })
                }
              </select>
            </div>
            <div className="flex flex-row items-center gap-3">
              <label className="w-[85px]">Location</label>
              <select {...newOrderForm.register('locationId')} className="select w-full">
                <option>Available Location:</option>
                {
                  getDSaleStockFn?.result?.map((l) => {
                    return (
                      <option key={l._id} value={l._id}>{l.name} ({l.allocated})</option>
                    )
                  })
                }
              </select>
            </div>
            <div className="flex flex-row items-center gap-3">
              <label className="w-[70px]">Qty</label>
              <input placeholder="quantity" {...newOrderForm.register("qty")} type="text" className="input flex-1" />
            </div>
            <div className="flex flex-row items-center gap-3">
              <label className="w-[85px]">Tax</label>
              <select multiple {...newOrderForm.register('ppn')} className="select w-full h-24">
                <option value="no">no tax</option>
                {
                  getTaxesFn?.result?.map((t: any) => {
                    return <option key={t._id} value={`${t.name}|${t.value}`}>{t.name} ({t.value}%)</option>
                  })
                }
              </select>
            </div>
            {addOrderFn.noResult || addOrderFn.error ? <label className="input-validator text-red-900" htmlFor="role">something went wrong</label> : <></>}
            <div className="flex flex-row gap-3 modal-action">
              <button className="btn bg-red-900 text-white">Add to cart</button>
              <button type="button" onClick={() => cartToggle("toCart")} className="btn bg-red-900 text-white">Cart</button>
            </div>
          </form>
        </dialog>
        <dialog ref={orderCartModalRef} className="modal text-black">
          <div className="modal-box w-11/12 max-w-5xl flex flex-col gap-3">
            <h3 className="text-lg font-bold">Order Cart: {selectedOrder?.salesOrderNumber}</h3>
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full text-center">
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>Warehouse</th>
                    <th>Qty</th>
                    <th>Subtotal</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder?.cart && selectedOrder.cart.length > 0
                    ? selectedOrder.cart.map((item: any, idx: number) => {
                      const prodId = item.productId?._id || item.productId
                      const whId = item.warehouseId?._id || item.warehouseId
                      const prodName =
                        item.productId?.productName ||
                        getProductsFn.result?.find((p: any) => p._id?.toString() === prodId?.toString())?.productName ||
                        'Unknown'
                      const locName =
                        getDSaleStockFn.result?.find((l: any) => l._id?.toString() === whId?.toString())?.name ||
                        'Unknown'
                      const refundItem = {
                        productId: prodId,
                        warehouseId: whId,
                        qty: item.qty,
                        subTotal: item.subTotal,
                        taxes: item.taxes || []
                      }
                      return (
                        <tr key={idx}>
                          <td>{prodName}</td>
                          <td>{locName}</td>
                          <td>{item.qty}</td>
                          <td>{item.subTotal}</td>
                          <td>
                            <button
                              className="bg-red-800 text-white px-3 py-1 rounded-md text-sm"
                              onClick={() => initiateRefund(selectedOrder._id, refundItem)}
                            >
                              {refundFn.loading ? 'Refunding...' : 'Refund Log'}
                            </button>
                          </td>
                        </tr>
                      )
                    })
                    : selectedOrder?.product && typeof selectedOrder.product === 'object'
                      ? (
                        <tr>
                          <td>{selectedOrder.product.productName || 'Unknown'}</td>
                          <td>-</td>
                          <td>{selectedOrder.quantity ?? '-'}</td>
                          <td>{selectedOrder.total ?? '-'}</td>
                          <td>
                            <button
                              className="bg-red-800 text-white px-3 py-1 rounded-md text-sm"
                              onClick={() => initiateRefund(selectedOrder._id, {
                                productId: selectedOrder.product._id,
                                warehouseId: null,
                                qty: selectedOrder.quantity,
                                subTotal: selectedOrder.total,
                                taxes: []
                              })}
                            >
                              {refundFn.loading ? 'Refunding...' : 'Refund Log'}
                            </button>
                          </td>
                        </tr>
                      )
                      : (
                        <tr>
                          <td colSpan={5} className="text-center text-gray-500 py-4">No cart data available for this order.</td>
                        </tr>
                      )
                  }
                </tbody>
              </table>
            </div>
            <div className="modal-action">
              <button type="button" className="btn" onClick={() => orderCartModalRef.current?.close()}>Close</button>
            </div>
          </div>
        </dialog>

        <dialog ref={editOrderModalRef} className="modal text-black">
          <div className="modal-box w-11/12 max-w-4xl p-0 overflow-hidden rounded-2xl shadow-2xl flex flex-col" style={{ maxHeight: '90vh' }}>

            {/* Header */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-5 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="text-white text-xl font-bold tracking-tight">Edit Sales Order</h3>
                <p className="text-slate-400 text-sm mt-0.5">
                  {selectedOrder?.salesOrderNumber} &nbsp;·&nbsp; {selectedOrder?.cart?.length || 0} item(s)
                </p>
              </div>
              <button
                type="button"
                onClick={() => editOrderModalRef.current?.close()}
                className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={submitEditOrder} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto">

                {/* Discount section */}
                <div className="px-6 py-4 border-b border-gray-100 bg-amber-50">
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-3">Order-Level Discount</p>
                  <div className="flex flex-row gap-3 items-end">
                    <div className="flex flex-col gap-1 w-40">
                      <label className="text-xs font-semibold text-gray-600">Type</label>
                      <select
                        className="select select-bordered select-sm bg-white"
                        value={editingDiscountType}
                        onChange={e => setEditingDiscountType(e.target.value)}
                      >
                        <option value="none">No Discount</option>
                        <option value="fixed">Fixed (Rp)</option>
                        <option value="percent">Percentage (%)</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1 flex-1 max-w-[180px]">
                      <label className="text-xs font-semibold text-gray-600">
                        Value {editingDiscountType === 'percent' ? '(%)' : editingDiscountType === 'fixed' ? '(Rp)' : ''}
                      </label>
                      <input
                        type="number"
                        className="input input-bordered input-sm bg-white"
                        min={0}
                        disabled={editingDiscountType === 'none'}
                        value={editingDiscountValue}
                        onChange={e => setEditingDiscountValue(parseInt(e.target.value) || 0)}
                      />
                    </div>
                    {editingDiscountType !== 'none' && editingDiscountValue > 0 && (
                      <div className="pb-1">
                        <span className="badge badge-warning badge-sm font-semibold">
                          {editingDiscountType === 'percent' ? `${editingDiscountValue}% off` : `Rp ${editingDiscountValue.toLocaleString('id-ID')} off`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Products section */}
                <div className="px-6 py-4">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Products</p>
                  <div className="flex flex-col gap-3">
                    {selectedOrder?.cart && selectedOrder.cart.length > 0
                      ? selectedOrder.cart.map((item: any, idx: number) => {
                        const prodId = (item.productId?._id || item.productId)?.toString()
                        const productDetails = getProductsFn.result?.find((p: any) => p._id?.toString() === prodId?.toString())
                        const prodName =
                          item.productId?.productName ||
                          productDetails?.productName ||
                          'Unknown'
                        const currentQty = editingCart.find(c => c.productId === prodId)?.qty || item.qty
                        const selectedTaxes = editingItemTaxes[prodId] || ['no']
                        const hasTax = selectedTaxes.some(t => t !== 'no')

                        return (
                          <div key={idx} className="bg-gray-50 border border-gray-200 rounded-xl p-4 hover:border-slate-400 transition-colors">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                {idx + 1}
                              </div>
                              <span className="font-semibold text-gray-800 text-sm">{prodName}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="flex flex-col gap-1">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                  Quantity <span className="lowercase text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-md ml-1 border border-red-200">Max: {productDetails ? productDetails.remain : '∞'}</span>
                                </label>
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      className="w-8 h-8 rounded-lg bg-white border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 font-bold transition-colors disabled:opacity-50"
                                      disabled={currentQty <= 1}
                                      onClick={() => {
                                        const newCart = [...editingCart];
                                        const c = newCart.find(c => c.productId === prodId);
                                        if (c && c.qty > 1) { c.qty = c.qty - 1; setEditingCart(newCart); }
                                      }}
                                    >−</button>
                                    <input
                                      className="input input-sm border-2 border-gray-300 bg-white text-center font-bold w-20 focus:border-slate-500"
                                      type="number"
                                      min={1}
                                      max={productDetails ? productDetails.remain : undefined}
                                      value={currentQty}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value) || 0;
                                        const maxQ = productDetails ? productDetails.remain : Infinity;

                                        const finalVal = val > maxQ ? maxQ : val;

                                        const newCart = [...editingCart];
                                        const c = newCart.find(c => c.productId === prodId);
                                        if (c) c.qty = finalVal;
                                        setEditingCart(newCart);
                                      }}
                                    />
                                    <button
                                      type="button"
                                      className="w-8 h-8 rounded-lg bg-white border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 font-bold transition-colors disabled:opacity-50"
                                      disabled={productDetails && currentQty >= productDetails.remain}
                                      onClick={() => {
                                        const maxQ = productDetails ? productDetails.remain : Infinity;
                                        if (currentQty >= maxQ) return;

                                        const newCart = [...editingCart];
                                        const c = newCart.find(c => c.productId === prodId);
                                        if (c) { c.qty = c.qty + 1; setEditingCart(newCart); }
                                      }}
                                    >+</button>
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Taxes</label>
                                <div className="flex flex-row flex-wrap gap-1.5">
                                  {/* No Tax chip */}
                                  <button
                                    type="button"
                                    onClick={() => setEditingItemTaxes(prev => ({ ...prev, [prodId]: ['no'] }))}
                                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${!hasTax
                                      ? 'bg-gray-700 text-white border-gray-700'
                                      : 'bg-white text-gray-400 border-gray-300 hover:border-gray-500 hover:text-gray-600'
                                      }`}
                                  >
                                    No Tax
                                  </button>
                                  {/* Tax option chips */}
                                  {getTaxesFn?.result?.map((t: any) => {
                                    const key = `${t.name}|${t.value}`
                                    const isActive = selectedTaxes.includes(key)
                                    return (
                                      <button
                                        key={t._id}
                                        type="button"
                                        onClick={() => {
                                          const current = (editingItemTaxes[prodId] || ['no']).filter(x => x !== 'no')
                                          const next = isActive
                                            ? current.filter(x => x !== key)
                                            : [...current, key]
                                          setEditingItemTaxes(prev => ({
                                            ...prev,
                                            [prodId]: next.length ? next : ['no']
                                          }))
                                        }}
                                        className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${isActive
                                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                          : 'bg-white text-gray-500 border-gray-300 hover:border-blue-400 hover:text-blue-600'
                                          }`}
                                      >
                                        {t.name} <span className={`ml-0.5 ${isActive ? 'text-blue-200' : 'text-gray-400'}`}>{t.value}%</span>
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })
                      : (
                        <div className="text-center text-gray-400 py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                          <p className="text-sm">No cart items available.</p>
                        </div>
                      )
                    }
                  </div>
                </div>
              </div>

              {/* Footer: Approval + Actions */}
              <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50 px-6 py-4">
                <div className="flex flex-col gap-3">
                  {editOrderFn.error && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4 text-red-500 flex-shrink-0">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                      </svg>
                      <p className="text-red-700 text-sm font-medium">{editOrderFn.message}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-white border-2 border-slate-300 rounded-xl px-4 py-2 flex-1 focus-within:border-slate-600 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5 text-slate-500 flex-shrink-0">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                      </svg>
                      <input
                        type="password"
                        value={editingApprovalCode}
                        onChange={e => setEditingApprovalCode(e.target.value)}
                        placeholder="Approval code required"
                        className="bg-transparent outline-none flex-1 text-sm font-medium placeholder:text-gray-400"
                        required
                      />
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm px-5"
                      onClick={() => editOrderModalRef.current?.close()}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={editOrderFn.loading || !editingApprovalCode}
                      className="btn btn-sm px-6 bg-slate-800 hover:bg-slate-700 text-white border-none disabled:opacity-50"
                    >
                      {editOrderFn.loading
                        ? <><span className="loading loading-spinner loading-xs"></span> Saving…</>
                        : <>
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                          </svg>
                          Save Changes
                        </>
                      }
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </dialog>

        {/* Mark Unavailable Modal */}
        <dialog ref={markUnavailableModalRef} className="modal text-black">
          <div className="modal-box w-11/12 max-w-lg p-0 overflow-hidden rounded-2xl shadow-2xl flex flex-col">
            <div className="bg-gradient-to-r from-red-800 to-red-900 px-6 py-5 flex items-center justify-between">
              <div>
                <h3 className="text-white text-xl font-bold tracking-tight">Tandai Unavailable</h3>
                <p className="text-red-200 text-sm mt-0.5">Pilih produk yang stoknya tidak tersedia</p>
              </div>
              <button
                type="button"
                onClick={() => markUnavailableModalRef.current?.close()}
                className="text-red-200 hover:text-white transition-colors p-1 rounded-lg hover:bg-red-800"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={submitUnavailable} className="p-6 flex flex-col gap-5 bg-white">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-700">Pilih Produk</label>
                <div className="relative">
                  <select
                    className="select select-bordered w-full bg-gray-50 border-gray-300 focus:border-red-500 font-medium text-gray-800"
                    value={unavailablePid}
                    onChange={(e) => setUnavailablePid(e.target.value)}
                    required
                  >
                    {unavailableTargetOrder?.cart?.map((c: any) => {
                      const prodName = getProductsFn.result?.find((p: any) => p._id === c.productId)?.productName || 'Unknown Product'
                      return (
                        <option key={c.productId} value={c.productId}>
                          {prodName} (Maks order: {c.qty})
                        </option>
                      )
                    })}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-700">Jumlah Stok Kosong</label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    className="input input-bordered w-full bg-gray-50 border-gray-300 focus:border-red-500 font-bold text-gray-900"
                    value={unavailableQty}
                    min={1}
                    onChange={(e) => setUnavailableQty(parseInt(e.target.value) || 1)}
                    required
                  />
                  <div className="absolute right-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
                    Units
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Jumlah ini akan dimasukkan ke daftar order yang tidak dapat dipenuhi (saat aktivasi invoice).
                </p>
              </div>

              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  className="btn btn-ghost hover:bg-gray-100 text-gray-700 font-semibold"
                  onClick={() => markUnavailableModalRef.current?.close()}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn bg-red-600 hover:bg-red-700 text-white font-semibold shadow-md shadow-red-200 border-none px-6"
                >
                  Konfirmasi
                </button>
              </div>
            </form>
          </div>
        </dialog>
        <Dialog.Root open={openDialog} onOpenChange={setOpenDialog}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" />

            <Dialog.Content className="fixed z-[101] top-1/2 left-1/2 w-11/12 max-w-md -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl p-0 overflow-hidden flex flex-col">

              {/* Header */}
              <div className="bg-gradient-to-r from-red-800 to-red-900 px-6 py-5 flex items-center justify-between">
                <div>
                  <Dialog.Title className="text-white text-xl font-bold tracking-tight">
                    Unavailable Items List
                  </Dialog.Title>
                  <p className="text-red-200 text-sm mt-0.5">Daftar pesanan batal / habis stok</p>
                </div>
                <Dialog.Close asChild>
                  <button className="text-red-200 hover:text-white transition-colors p-1 rounded-lg hover:bg-red-800">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </Dialog.Close>
              </div>

              {
                unAvailableList.length > 0 ? (
                  <>
                    <div className="max-h-[350px] overflow-y-auto p-4 flex flex-col gap-3 bg-gray-50">
                      {unAvailableList.map(item => {
                        const prodName = getProductsFn.result?.find((p: any) => p._id === item.id)?.productName || 'Unknown Product'
                        return (
                          <div key={item.id} className="flex justify-between items-center bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm hover:border-red-200 transition-all">
                            <div className="flex flex-col">
                              <p className="text-sm font-bold text-gray-800">{prodName}</p>
                              <div className="flex gap-1 items-center mt-1">
                                <span className="bg-red-50 text-red-700 text-xs font-bold px-2 py-0.5 rounded border border-red-100">
                                  {item.qty} Unit
                                </span>
                                <span className="text-xs text-gray-400 font-medium">tdk tersedia</span>
                              </div>
                            </div>
                            <button
                              onClick={() => remove(item.id)}
                              title="Hapus dari daftar"
                              className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                            >
                              <HugeiconsIcon icon={Delete01Icon} size={20} strokeWidth={2} />
                            </button>
                          </div>
                        )
                      })}
                    </div>

                    <div className="px-6 py-4 bg-white border-t border-gray-200 flex justify-end">
                      <Dialog.Close asChild>
                        <button className="btn btn-ghost border-gray-300 font-semibold text-gray-700 hover:bg-gray-100">
                          Tutup
                        </button>
                      </Dialog.Close>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center p-12 bg-gray-50">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100 mb-4 text-gray-300">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-8">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <p className="text-base font-bold text-gray-700">Tidak ada item</p>
                    <p className="text-sm text-gray-500 text-center mt-1">
                      Belum ada target produk yang ditandai sebagai unavailable.
                    </p>
                    <Dialog.Close asChild>
                      <button className="btn btn-sm btn-ghost mt-6 text-gray-500 border border-gray-200">Kembali</button>
                    </Dialog.Close>
                  </div>
                )
              }

            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {/* Refund Modal */}
        <dialog ref={refundModalRef} className="modal text-black">
          <div className="modal-box w-11/12 max-w-sm p-0 overflow-hidden rounded-2xl shadow-2xl flex flex-col">
            <div className="bg-gradient-to-r from-red-800 to-red-900 px-6 py-5 flex items-center justify-between">
              <div>
                <h3 className="text-white text-xl font-bold tracking-tight">Proses Refund</h3>
                <p className="text-red-200 text-sm mt-0.5">Pengembalian barang dan dana</p>
              </div>
              <button
                type="button"
                onClick={() => refundModalRef.current?.close()}
                className="text-red-200 hover:text-white transition-colors p-1 rounded-lg hover:bg-red-800"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={submitRefundModal} className="p-6 flex flex-col gap-5 bg-white">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-700">Jumlah Unit Refund</label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    className="input input-bordered w-full bg-gray-50 border-gray-300 focus:border-red-500 font-bold text-gray-900"
                    value={refundInputQty}
                    min={1}
                    max={refundMaxQty}
                    onChange={(e) => setRefundInputQty(parseInt(e.target.value) || 1)}
                    required
                  />
                  <div className="absolute right-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
                    Max: {refundMaxQty}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-700">Kode Approval (Admin/Manager)</label>
                <div className="relative flex items-center">
                  <input
                    type="password"
                    className="input input-bordered w-full bg-white border-2 border-red-300 focus:border-red-500 font-medium text-gray-900 pr-10"
                    value={refundApprovalCode}
                    onChange={(e) => setRefundApprovalCode(e.target.value)}
                    placeholder="Masukkan kode..."
                    required
                  />
                  <div className="absolute right-3 text-red-500">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  className="btn btn-ghost hover:bg-gray-100 text-gray-700 font-semibold"
                  onClick={() => refundModalRef.current?.close()}
                  disabled={refundFn.loading}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn bg-red-800 hover:bg-red-900 text-white font-semibold shadow-md shadow-red-200 border-none px-6"
                  disabled={refundFn.loading || refundInputQty <= 0 || refundInputQty > refundMaxQty || !refundApprovalCode}
                >
                  {refundFn.loading ? <span className="loading loading-spinner loading-sm"></span> : 'Proses'}
                </button>
              </div>
            </form>
          </div>
        </dialog>
      </>
    )
}