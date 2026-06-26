import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import Order from '@/models/Order'
import ServiceOrder from '@/models/ServiceOrder'
import Purchase from '@/models/Purchase'
import Invoice from '@/models/Invoice'
import Batche from '@/models/Batche'
import Product from '@/models/Product'
import Customer from '@/models/Customer'
import Debt from '@/models/Debt'
import Companie from '@/models/Companie'

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase()

    const { searchParams } = new URL(req.url)
    const masterAccountId = searchParams.get('id')
    if (!masterAccountId) {
      return NextResponse.json({ error: true, message: 'Missing id' }, { status: 400 })
    }

    // ── Resolve company using masterAccountId (same pattern as all other routes) ──
    const company = await Companie.findOne({ masterAccountId })
    if (!company) {
      return NextResponse.json({ error: true, message: 'Company not found' }, { status: 404 })
    }
    const cid = company._id  // This is a proper ObjectId from Mongoose

    const now = new Date()

    // --- Date ranges ---
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
    const in10Days = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000)
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)

    // ── 1. Revenue this month vs last month (Sales Orders) ──
    const [salesThisMonth, salesLastMonth] = await Promise.all([
      Order.aggregate([
        { $match: { companyId: cid, saleDate: { $gte: startOfMonth, $lte: endOfMonth } } },
        { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }
      ]),
      Order.aggregate([
        { $match: { companyId: cid, saleDate: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
        { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }
      ])
    ])

    // ── 2. Service Revenue ──
    const [serviceThisMonth, serviceLastMonth] = await Promise.all([
      ServiceOrder.aggregate([
        { $match: { companyId: cid, date: { $gte: startOfMonth, $lte: endOfMonth } } },
        { $group: { _id: null, total: { $sum: '$price' }, count: { $sum: 1 } } }
      ]),
      ServiceOrder.aggregate([
        { $match: { companyId: cid, date: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
        { $group: { _id: null, total: { $sum: '$price' }, count: { $sum: 1 } } }
      ])
    ])

    // ── 3. Purchase Spend ──
    const [purchasesThisMonth, purchasesLastMonth] = await Promise.all([
      Purchase.aggregate([
        {
          $match: {
            companyId: cid,
            date: { $gte: startOfMonth, $lte: endOfMonth },
            status: { $in: ['approved', 'ordered', 'completed'] }
          }
        },
        { $group: { _id: null, total: { $sum: '$finalPrice' }, count: { $sum: 1 } } }
      ]),
      Purchase.aggregate([
        {
          $match: {
            companyId: cid,
            date: { $gte: startOfLastMonth, $lte: endOfLastMonth },
            status: { $in: ['approved', 'ordered', 'completed'] }
          }
        },
        { $group: { _id: null, total: { $sum: '$finalPrice' }, count: { $sum: 1 } } }
      ])
    ])

    const [outstandingInvoices] = await Order.aggregate([
      {
        $match: {
          companyId: cid
        }
      },
      {
        $lookup: {
          from: 'invoices',
          localField: 'salesOrderNumber',
          foreignField: 'salesOrderNumber',
          as: 'invoice'
        }
      },
      {
        $unwind: '$invoice'
      },
      {
        $match: {
          $expr: {
            $lt: ["$invoice.payAmount", "$total"]
          }
        }
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: {
              $subtract: ["$total", "$invoice.payAmount"]
            }
          },
        }
      }
    ])



    // ── 4. Outstanding Invoices ──
    // const [outstandingInvoices] = await Invoice.aggregate([
    //   { $match: { companyId: cid, paid: false, status: 'active' } },
    //   { $group: { _id: null, total: { $sum: '$payAmount' }, count: { $sum: 1 } } }
    // ])

    // ── 5. Total Debts ──
    // const totalDebts = await Debt.aggregate([
    //   { $match: { companyId: cid } },
    //   { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    // ])

    const [totalDebts] = await Purchase.aggregate([
      { $match: { companyId: cid } },
      { $match: { $expr: { $lt: ["$payAmount", "$finalPrice"] } } },
      { $addFields: { debt: { $subtract: ["$finalPrice", "$payAmount"] } } },
      {
        $group: {
          _id: null,
          total: {
            $sum: {
              $subtract: ["$finalPrice", "$payAmount"]
            }
          }
        }
      }
    ])


    // ── 6. Expiring batches (next 30 days) ──
    const expiringBatches = await Batche.aggregate([
      {
        $match: {
          expiryDate: { $lte: in10Days },
          status: 'ACTIVE',
          qty: { $gt: 0 }
        }
      },
      { $group: { _id: null, count: { $sum: 1 }, totalQty: { $sum: '$qty' } } }
    ])

    // ── 7. Expired batches ──
    const expiredBatches = await Batche.aggregate([
      {
        $match: {
          expiryDate: { $lt: now },
          status: { $in: ['ACTIVE', 'EXPIRED'] },
          qty: { $gt: 0 }
        }
      },
      { $group: { _id: null, count: { $sum: 1 }, totalQty: { $sum: '$qty' } } }
    ])

    // ── 8. Today Revenue & Orders ──
    const [todaySales, todayService] = await Promise.all([
      Order.aggregate([
        { $match: { companyId: cid, saleDate: { $gte: startOfToday, $lte: endOfToday } } },
        { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }
      ]),
      ServiceOrder.aggregate([
        { $match: { companyId: cid, date: { $gte: startOfToday, $lte: endOfToday } } },
        { $group: { _id: null, total: { $sum: '$price' }, count: { $sum: 1 } } }
      ])
    ])

    // ── 9. Purchase status breakdown this month ──
    const purchaseStatusBreakdown = await Purchase.aggregate([
      {
        $match: {
          companyId: cid,
          date: { $gte: startOfMonth, $lte: endOfMonth }
        }
      },
      { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$estimatedPrice' } } }
    ])

    // ── 10. Monthly revenue trend (last 6 months) ──
    const [monthlyTrend, monthlyServiceTrend] = await Promise.all([
      Order.aggregate([
        { $match: { companyId: cid, saleDate: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: { year: { $year: '$saleDate' }, month: { $month: '$saleDate' } },
            revenue: { $sum: '$total' },
            orders: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),
      ServiceOrder.aggregate([
        { $match: { companyId: cid, date: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: { year: { $year: '$date' }, month: { $month: '$date' } },
            revenue: { $sum: '$price' },
            orders: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ])
    ])

    // ── 11. Top 5 products by revenue this month ──
    const topProducts = await Order.aggregate([
      { $match: { companyId: cid, saleDate: { $gte: startOfMonth, $lte: endOfMonth } } },
      { $unwind: '$cart' },
      {
        $group: {
          _id: '$cart.productId',
          totalRevenue: { $sum: '$cart.subTotal' },
          totalQty: { $sum: '$cart.qty' }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          productName: { $ifNull: ['$product.productName', 'Unknown'] },
          totalRevenue: 1,
          totalQty: 1
        }
      }
    ])

    // ── 12. Master data counts (using productOf / customerOf instead of companyId) ──
    const [totalCustomers, totalProducts, pendingPurchases] = await Promise.all([
      Customer.countDocuments({ customerOf: cid }),
      Product.countDocuments({ productOf: cid }),
      Purchase.countDocuments({ companyId: cid, status: 'requested' })
    ])

    // ── 13. Recent Sales Orders (last 5) ──
    const recentOrders = await Order.find({ companyId: cid })
      .sort({ saleDate: -1 })
      .limit(5)
      .populate('customerId', 'bussinessName name')
      .lean()

    // ── 14. Low stock batches (qty ≤ 10) ──
    const lowStockBatches = await Batche.aggregate([
      {
        $match: {
          status: 'ACTIVE',
          qty: { $gt: 0, $lte: 10 }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          batchNumber: 1,
          qty: 1,
          productName: { $ifNull: ['$product.productName', 'Unknown'] },
          expiryDate: 1
        }
      },
      { $limit: 5 }
    ])

    const [totalPurchase] = await Purchase.aggregate([
      {
        $match: {
          companyId: cid,
          status: { $in: ['approved', 'ordered', 'completed'] }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$finalPrice' },
          count: { $sum: 1 }
        }
      }
    ])

    const [expenses] = await Purchase.aggregate([
      {
        $match: {
          companyId: cid,
          status: { $in: ['approved', 'ordered', 'completed'] }
        }
      },
      {
        $lookup: {
          from: 'logs',
          localField: '_id',
          foreignField: 'purchaseId',
          as: 'logs'
        }
      },
      {
        $unwind: '$logs'
      },
      {
        $group: {
          _id: null,
          totalExpense: {
            $sum: '$logs.amount'
          }
        }
      }
    ])


    // ── Build response ──
    const revenueThisMonth = (salesThisMonth[0]?.total ?? 0) + (serviceThisMonth[0]?.total ?? 0)
    const revenueLastMonth = (salesLastMonth[0]?.total ?? 0) + (serviceLastMonth[0]?.total ?? 0)
    const revenueChange = revenueLastMonth === 0 ? 100 : ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100

    const purchaseSpendThisMonth = purchasesThisMonth[0]?.total ?? 0
    const purchaseSpendLastMonth = purchasesLastMonth[0]?.total ?? 0
    const purchaseChange = purchaseSpendLastMonth === 0 ? 0 : ((purchaseSpendThisMonth - purchaseSpendLastMonth) / purchaseSpendLastMonth) * 100

    const orderCountThisMonth = (salesThisMonth[0]?.count ?? 0) + (serviceThisMonth[0]?.count ?? 0)
    const orderCountLastMonth = (salesLastMonth[0]?.count ?? 0) + (serviceLastMonth[0]?.count ?? 0)
    const orderCountChange = orderCountLastMonth === 0 ? 100 : ((orderCountThisMonth - orderCountLastMonth) / orderCountLastMonth) * 100

    return NextResponse.json({
      error: false,
      data: {
        revenueThisMonth,
        revenueLastMonth,
        revenueChange,
        orderCountThisMonth,
        orderCountLastMonth,
        orderCountChange,
        purchaseSpendThisMonth,
        purchaseSpendLastMonth,
        purchaseChange,
        outstandingReceivable: outstandingInvoices?.total ?? 0,
        outstandingReceivableCount: outstandingInvoices?.total ?? 0,
        totalDebt: totalDebts?.total ?? 0,
        totalDebtCount: totalDebts?.total ?? 0,
        todayRevenue: (todaySales[0]?.total ?? 0) + (todayService[0]?.total ?? 0),
        todayOrders: (todaySales[0]?.count ?? 0) + (todayService[0]?.count ?? 0),
        expiringCount: expiringBatches[0]?.count ?? 0,
        expiringQty: expiringBatches[0]?.totalQty ?? 0,
        expiredCount: expiredBatches[0]?.count ?? 0,
        expiredQty: expiredBatches[0]?.totalQty ?? 0,
        totalPurchase: totalPurchase?.total ?? 0,
        totalExpense: expenses?.totalExpense ?? 0,
        totalCustomers,
        totalProducts,
        pendingPurchases,
        purchaseStatusBreakdown,
        monthlyTrend,
        monthlyServiceTrend,
        topProducts,
        recentOrders,
        lowStockBatches,
      }
    })
  }
  catch (err: unknown) {
    console.error('[dashboard]', err)
    return NextResponse.json({ error: true, message: (err as Error).message }, { status: 500 })
  }
}
