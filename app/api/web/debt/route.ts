import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import mongoose, { PipelineStage } from "mongoose"
import BankAccount from '@/models/BankAccount'
import Purchase from '@/models/Purchase'
import Invoice from '@/models/Invoice'
import ServiceOrder from '@/models/ServiceOrder'
import Companie from '@/models/Companie'
import Log from '@/models/Log'
import Cashflow from '@/models/Cashflow'
import "@/models/Tax"
import { getAvailableBalance } from '@/lib/finance/balance'


export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const id = url.searchParams.get("id")
    const filterType = url.searchParams.get("filterType") ?? "barang"
    const status = url.searchParams.get("status") ?? "unpaid"
    const month = url.searchParams.get("month")
    const vendorId = url.searchParams.get("vendorId")

    await connectToDatabase()

    const cmp = await Companie.findOne({ masterAccountId: id })

    if (!cmp) {
      return NextResponse.json({
        noResult: true,
        message: "Company tidak ditemukan",
        result: [],
        error: false
      })
    }

    // ─── Filter periode ────────────────────────────────────

    const dateFilter: Record<string, any> = {}

    if (month) {
      const [year, m] = month.split("-").map(Number)
      const nextYear = m === 12 ? year + 1 : year
      const nextMonth = m === 12 ? 1 : m + 1

      dateFilter.date = {
        $gte: new Date(`${month}-01T00:00:00+07:00`),
        $lt: new Date(
          `${nextYear}-${String(nextMonth).padStart(2, "0")}-01T00:00:00+07:00`
        )
      }
    }

    // ─── Helper: mendapatkan seluruh productId ─────────────

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

    // ─── Helper: mencari produk yang sama ──────────────────

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
    // ─── Helper: mendapatkan history terakhir per produk ──

    // const getLastHistory = (productId: string) => ({
    //   $let: {
    //     vars: {
    //       previousPurchase: {
    //         $arrayElemAt: [
    //           {
    //             $filter: {
    //               input: "$_historyCandidates",
    //               as: "purchase",
    //               cond: {
    //                 $or: [
    //                   {
    //                     $eq: [
    //                       { $toString: "$$purchase.productId" },
    //                       { $toString: productId }
    //                     ]
    //                   },
    //                   {
    //                     $in: [
    //                       { $toString: productId },
    //                       {
    //                         $map: {
    //                           input: {
    //                             $ifNull: ["$$purchase.items", []]
    //                           },
    //                           as: "item",
    //                           in: {
    //                             $toString: "$$item.productId"
    //                           }
    //                         }
    //                       }
    //                     ]
    //                   }
    //                 ]
    //               }
    //             }
    //           },
    //           0
    //         ]
    //       }
    //     },
    //     in: {
    //       $cond: [
    //         { $eq: ["$$previousPurchase", null] },
    //         null,
    //         {
    //           $let: {
    //             vars: {
    //               previousItem: {
    //                 $arrayElemAt: [
    //                   {
    //                     $filter: {
    //                       input: {
    //                         $ifNull: [
    //                           "$$previousPurchase.items",
    //                           []
    //                         ]
    //                       },
    //                       as: "item",
    //                       cond: {
    //                         $eq: [
    //                           { $toString: "$$item.productId" },
    //                           { $toString: productId }
    //                         ]
    //                       }
    //                     }
    //                   },
    //                   0
    //                 ]
    //               }
    //             },
    //             in: {
    //               $mergeObjects: [
    //                 {
    //                   $ifNull: [
    //                     "$$previousItem",
    //                     {
    //                       productId: "$$previousPurchase.productId",
    //                       pricePerUnit: "$$previousPurchase.pricePerUnit",
    //                       finalPrice: "$$previousPurchase.finalPrice",
    //                       payAmount: "$$previousPurchase.payAmount",
    //                       quantity: "$$previousPurchase.quantity",
    //                       price: "$$previousPurchase.price"
    //                     }
    //                   ]
    //                 },
    //                 {
    //                   purchaseId: "$$previousPurchase._id",
    //                   date: "$$previousPurchase.date",
    //                   purchaseType: "$$previousPurchase.purchaseType"
    //                 }
    //               ]
    //             }
    //           }
    //         }
    //       ]
    //     }
    //   }
    // })

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
                          input: { $ifNull: ["$$purchase.items", []] },
                          as: "item",
                          in: { $toString: "$$item.productId" }
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
            input: { $slice: ["$$previousPurchases", 0, 3] },
            as: "purchase",
            in: {
              $let: {
                vars: {
                  previousItem: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: { $ifNull: ["$$purchase.items", []] },
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

    // ─── Attach history ke setiap produk ───────────────────

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

    // ─── Helper: filter vendor ─────────────────────────────

    const applyVendorFilter = (query: Record<string, any>) => {
      if (vendorId) {
        const vendorObjectId = new mongoose.Types.ObjectId(vendorId)

        query.$or = [
          { vendorId: vendorObjectId },
          { supplierId: vendorObjectId }
        ]
      }

      return query
    }

    // ─── Hutang Barang ─────────────────────────────────────

    if (filterType === "barang") {
      const matchQuery = applyVendorFilter({
        companyId: cmp._id,
        purchaseType: {
          $in: ["product", "procurement"]
        },
        ...dateFilter
      })

      const debts = await Purchase.aggregate([
        { $match: matchQuery },

        {
          $lookup: {
            from: "products",
            localField: "productId",
            foreignField: "_id",
            as: "product"
          }
        },
        {
          $unwind: {
            path: "$product",
            preserveNullAndEmptyArrays: true
          }
        },

        {
          $lookup: {
            from: "invitems",
            localField: "productId",
            foreignField: "_id",
            as: "invItem"
          }
        },
        {
          $unwind: {
            path: "$invItem",
            preserveNullAndEmptyArrays: true
          }
        },

        {
          $lookup: {
            from: "suppliers",
            localField: "supplierId",
            foreignField: "_id",
            as: "supplier"
          }
        },
        {
          $unwind: {
            path: "$supplier",
            preserveNullAndEmptyArrays: true
          }
        },

        {
          $lookup: {
            from: "vendors",
            localField: "vendorId",
            foreignField: "_id",
            as: "vendor"
          }
        },
        {
          $unwind: {
            path: "$vendor",
            preserveNullAndEmptyArrays: true
          }
        },

        // Populate items[].product

        {
          $addFields: {
            _itemProductIds: {
              $map: {
                input: { $ifNull: ["$items", []] },
                as: "item",
                in: "$$item.productId"
              }
            }
          }
        },
        {
          $lookup: {
            from: "products",
            localField: "_itemProductIds",
            foreignField: "_id",
            as: "_itemProducts"
          }
        },
        {
          $lookup: {
            from: "invitems",
            localField: "_itemProductIds",
            foreignField: "_id",
            as: "_itemInvItems"
          }
        },
        {
          $addFields: {
            items: {
              $map: {
                input: { $ifNull: ["$items", []] },
                as: "item",
                in: {
                  $mergeObjects: [
                    "$$item",
                    {
                      product: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: {
                                $concatArrays: [
                                  "$_itemProducts",
                                  "$_itemInvItems"
                                ]
                              },
                              as: "product",
                              cond: {
                                $eq: [
                                  { $toString: "$$product._id" },
                                  { $toString: "$$item.productId" }
                                ]
                              }
                            }
                          },
                          0
                        ]
                      }
                    }
                  ]
                }
              }
            }
          }
        },

        // Attach purchase history

        historyLookup,
        attachHistory,

        {
          $project: {
            _historyCandidates: 0,
            _itemProducts: 0,
            _itemInvItems: 0,
            _itemProductIds: 0
          }
        }
      ] as PipelineStage[])

      return NextResponse.json({
        noResult: debts.length === 0,
        message: "",
        result: debts,
        error: false
      })
    }

    // ─── Hutang Jasa ────────────────────────────────────────

    if (filterType === "jasa") {
      const matchQuery: Record<string, any> = {
        companyId: cmp._id,
        purchaseType: "service",
        ...dateFilter
      }

      if (status === "unpaid") {
        matchQuery.$expr = {
          $gt: ["$finalPrice", "$payAmount"]
        }
      } else if (status === "paid") {
        matchQuery.$expr = {
          $lte: ["$finalPrice", "$payAmount"]
        }
      }

      applyVendorFilter(matchQuery)

      const debts = await Purchase.aggregate([
        { $match: matchQuery },

        {
          $lookup: {
            from: "vendors",
            localField: "vendorId",
            foreignField: "_id",
            as: "vendor"
          }
        },
        {
          $unwind: {
            path: "$vendor",
            preserveNullAndEmptyArrays: true
          }
        },

        {
          $lookup: {
            from: "suppliers",
            localField: "supplierId",
            foreignField: "_id",
            as: "supplier"
          }
        },
        {
          $unwind: {
            path: "$supplier",
            preserveNullAndEmptyArrays: true
          }
        }
      ])

      return NextResponse.json({
        noResult: debts.length === 0,
        message: "",
        result: debts,
        error: false
      })
    }

    // ─── Hutang Vendor ──────────────────────────────────────

    if (filterType === "vendor") {
      const matchQuery: Record<string, any> = {
        companyId: cmp._id,
        invoiceType: "vendor_manual",
        void: { $ne: true },
        ...dateFilter
      }

      if (vendorId) {
        matchQuery.vendorId = new mongoose.Types.ObjectId(vendorId)
      }

      const invoices = await Invoice.aggregate([
        { $match: matchQuery },

        {
          $lookup: {
            from: "vendors",
            localField: "vendorId",
            foreignField: "_id",
            as: "vendor"
          }
        },
        {
          $unwind: {
            path: "$vendor",
            preserveNullAndEmptyArrays: true
          }
        },

        {
          $lookup: {
            from: "invoices",
            let: {
              manualInvoiceNumber: "$invoiceNumber"
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: [
                      "$vendorInvoiceNumber",
                      "$$manualInvoiceNumber"
                    ]
                  },
                  void: { $ne: true }
                }
              }
            ],
            as: "relatedInvoices"
          }
        },

        {
          $lookup: {
            from: "taxes",
            localField: "vendor.taxes",
            foreignField: "_id",
            as: "vendor.populatedTaxes"
          }
        },

        {
          $addFields: {
            vendorPaid: {
              $ifNull: ["$vendorPaid", 0]
            },
            baseVendorAmount: {
              $cond: {
                if: {
                  $gt: [
                    { $size: { $ifNull: ["$relatedInvoices", []] } },
                    0
                  ]
                },
                then: { $sum: "$relatedInvoices.debt" },
                else: { $ifNull: ["$debt", 0] }
              }
            }
          }
        },

        {
          $addFields: {
            taxRatePct: {
              $reduce: {
                input: {
                  $ifNull: ["$vendor.populatedTaxes", []]
                },
                initialValue: 0,
                in: {
                  $cond: {
                    if: "$$this.isPPh",
                    then: {
                      $subtract: ["$$value", "$$this.value"]
                    },
                    else: {
                      $add: ["$$value", "$$this.value"]
                    }
                  }
                }
              }
            }
          }
        },

        {
          $addFields: {
            totalVendorAmount: {
              $add: [
                "$baseVendorAmount",
                {
                  $divide: [
                    {
                      $multiply: [
                        "$baseVendorAmount",
                        "$taxRatePct"
                      ]
                    },
                    100
                  ]
                }
              ]
            },
            originalDebt: "$debt"
          }
        },

        {
          $addFields: {
            remaining: {
              $subtract: [
                "$totalVendorAmount",
                "$vendorPaid"
              ]
            }
          }
        }
      ])

      return NextResponse.json({
        noResult: invoices.length === 0,
        message: "",
        result: invoices,
        error: false
      })
    }

    return NextResponse.json({
      noResult: true,
      message: "filterType tidak valid",
      result: null,
      error: true
    })

  }
  catch (e: unknown) {
    return NextResponse.json({
      noResult: true,
      message: e instanceof Error
        ? e.message
        : "Something went wrong",
      result: null,
      error: true
    })
  }
}

// export async function GET(request: NextRequest) {
//   try {
//     const url = new URL(request.url)
//     const id = url.searchParams.get("id")
//     const filterType = url.searchParams.get("filterType") ?? "barang"
//     const status = url.searchParams.get("status") ?? "unpaid"
//     const month = url.searchParams.get("month")
//     const vendorId = url.searchParams.get("vendorId")

//     await connectToDatabase()

//     const cmp = await Companie.findOne({ masterAccountId: id })

//     if (!cmp) {
//       return NextResponse.json({
//         noResult: true,
//         message: "Company tidak ditemukan",
//         result: [],
//         error: false
//       })
//     }

//     // Filter periode
//     const dateFilter: any = {}

//     if (month) {
//       const [year, m] = month.split("-").map(Number)
//       const nextYear = m === 12 ? year + 1 : year
//       const nextMonth = m === 12 ? 1 : m + 1

//       dateFilter.date = {
//         $gte: new Date(`${month}-01T00:00:00+07:00`),
//         $lt: new Date(`${nextYear}-${String(nextMonth).padStart(2, "0")}-01T00:00:00+07:00`)
//       }
//     }

//     // Mengambil transaksi sebelumnya yang memiliki produk sama.
//     // Mendukung purchase lama (productId) dan procurement baru (items).
//     const historyLookup: PipelineStage = {
//       $lookup: {
//         from: "purchases",
//         let: {
//           currentId: "$_id",
//           currentDate: "$date",
//           currentCompanyId: "$companyId",
//           currentProductIds: {
//             $setUnion: [
//               {
//                 $cond: [
//                   { $ne: ["$productId", null] },
//                   [{ $toString: "$productId" }],
//                   []
//                 ]
//               },
//               {
//                 $map: {
//                   input: { $ifNull: ["$items", []] },
//                   as: "item",
//                   in: { $toString: "$$item.productId" }
//                 }
//               }
//             ]
//           }
//         },
//         pipeline: [
//           {
//             $match: {
//               $expr: {
//                 $and: [
//                   { $ne: ["$_id", "$$currentId"] },
//                   { $eq: ["$companyId", "$$currentCompanyId"] },
//                   { $in: ["$purchaseType", ["product", "procurement"]] },
//                   { $lt: ["$date", "$$currentDate"] },
//                   {
//                     $gt: [
//                       {
//                         $size: {
//                           $setIntersection: [
//                             "$$currentProductIds",
//                             {
//                               $setUnion: [
//                                 {
//                                   $cond: [
//                                     { $ne: ["$productId", null] },
//                                     [{ $toString: "$productId" }],
//                                     []
//                                   ]
//                                 },
//                                 {
//                                   $map: {
//                                     input: { $ifNull: ["$items", []] },
//                                     as: "item",
//                                     in: { $toString: "$$item.productId" }
//                                   }
//                                 }
//                               ]
//                             }
//                           ]
//                         }
//                       },
//                       0
//                     ]
//                   }
//                 ]
//               }
//             }
//           },
//           { $sort: { date: -1, _id: -1 } }
//         ],
//         as: "_historyCandidates"
//       }
//     }

//     // Memasangkan history terakhir ke setiap productId.
//     // Satu dokumen history bisa berasal dari purchase maupun procurement.
//     const getLastHistory = (productId: string) => ({
//       $let: {
//         vars: {
//           previousPurchase: {
//             $arrayElemAt: [
//               {
//                 $filter: {
//                   input: "$_historyCandidates",
//                   as: "purchase",
//                   cond: {
//                     $or: [
//                       {
//                         $eq: [
//                           { $toString: "$$purchase.productId" },
//                           { $toString: productId }
//                         ]
//                       },
//                       {
//                         $in: [
//                           { $toString: productId },
//                           {
//                             $map: {
//                               input: { $ifNull: ["$$purchase.items", []] },
//                               as: "item",
//                               in: { $toString: "$$item.productId" }
//                             }
//                           }
//                         ]
//                       }
//                     ]
//                   }
//                 }
//               },
//               0
//             ]
//           }
//         },
//         in: {
//           $cond: [
//             { $eq: ["$$previousPurchase", null] },
//             null,
//             {
//               $let: {
//                 vars: {
//                   previousItem: {
//                     $arrayElemAt: [
//                       {
//                         $filter: {
//                           input: { $ifNull: ["$$previousPurchase.items", []] },
//                           as: "item",
//                           cond: {
//                             $eq: [
//                               { $toString: "$$item.productId" },
//                               { $toString: productId }
//                             ]
//                           }
//                         }
//                       },
//                       0
//                     ]
//                   }
//                 },
//                 in: {
//                   $mergeObjects: [
//                     {
//                       $ifNull: [
//                         "$$previousItem",
//                         {
//                           productId: "$$previousPurchase.productId",
//                           pricePerUnit: "$$previousPurchase.pricePerUnit",
//                           finalPrice: "$$previousPurchase.finalPrice",
//                           payAmount: "$$previousPurchase.payAmount",
//                           quantity: "$$previousPurchase.quantity",
//                           price: "$$previousPurchase.price"
//                         }
//                       ]
//                     },
//                     {
//                       purchaseId: "$$previousPurchase._id",
//                       date: "$$previousPurchase.date",
//                       purchaseType: "$$previousPurchase.purchaseType"
//                     }
//                   ]
//                 }
//               }
//             }
//           ]
//         }
//       }
//     })

//     const attachHistory = {
//       $addFields: {
//         items: {
//           $map: {
//             input: { $ifNull: ["$items", []] },
//             as: "currentItem",
//             in: {
//               $mergeObjects: [
//                 "$$currentItem",
//                 {
//                   history: getLastHistory("$$currentItem.productId")
//                 }
//               ]
//             }
//           }
//         },
//         history: {
//           $cond: [
//             { $eq: ["$productId", null] },
//             null,
//             getLastHistory("$productId")
//           ]
//         }
//       }
//     }

//     // ─── Hutang Barang ─────────────────────────────────────
//     if (filterType === "barang") {
//       const matchQuery: any = {
//         companyId: cmp._id,
//         purchaseType: { $in: ["product", "procurement"] },
//         ...dateFilter
//       }

//       if (vendorId) {
//         const vendorObjectId = new mongoose.Types.ObjectId(vendorId)
//         matchQuery.$or = [
//           { vendorId: vendorObjectId },
//           { supplierId: vendorObjectId }
//         ]
//       }

//       const debts = await Purchase.aggregate([
//         { $match: matchQuery },

//         {
//           $lookup: {
//             from: "products",
//             localField: "productId",
//             foreignField: "_id",
//             as: "product"
//           }
//         },
//         { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },

//         {
//           $lookup: {
//             from: "invitems",
//             localField: "productId",
//             foreignField: "_id",
//             as: "invItem"
//           }
//         },
//         { $unwind: { path: "$invItem", preserveNullAndEmptyArrays: true } },

//         {
//           $lookup: {
//             from: "suppliers",
//             localField: "supplierId",
//             foreignField: "_id",
//             as: "supplier"
//           }
//         },
//         { $unwind: { path: "$supplier", preserveNullAndEmptyArrays: true } },

//         {
//           $lookup: {
//             from: "vendors",
//             localField: "vendorId",
//             foreignField: "_id",
//             as: "vendor"
//           }
//         },
//         { $unwind: { path: "$vendor", preserveNullAndEmptyArrays: true } },

//         // Populate items[].product
//         {
//           $addFields: {
//             _itemProductIds: {
//               $map: {
//                 input: { $ifNull: ["$items", []] },
//                 as: "item",
//                 in: "$$item.productId"
//               }
//             }
//           }
//         },
//         {
//           $lookup: {
//             from: "products",
//             localField: "_itemProductIds",
//             foreignField: "_id",
//             as: "_itemProducts"
//           }
//         },
//         {
//           $lookup: {
//             from: "invitems",
//             localField: "_itemProductIds",
//             foreignField: "_id",
//             as: "_itemInvItems"
//           }
//         },
//         {
//           $addFields: {
//             items: {
//               $map: {
//                 input: { $ifNull: ["$items", []] },
//                 as: "item",
//                 in: {
//                   $mergeObjects: [
//                     "$$item",
//                     {
//                       product: {
//                         $arrayElemAt: [
//                           {
//                             $filter: {
//                               input: {
//                                 $concatArrays: [
//                                   "$_itemProducts",
//                                   "$_itemInvItems"
//                                 ]
//                               },
//                               as: "product",
//                               cond: {
//                                 $eq: [
//                                   { $toString: "$$product._id" },
//                                   { $toString: "$$item.productId" }
//                                 ]
//                               }
//                             }
//                           },
//                           0
//                         ]
//                       }
//                     }
//                   ]
//                 }
//               }
//             }
//           }
//         },

//         historyLookup,
//         attachHistory,

//         {
//           $project: {
//             _historyCandidates: 0,
//             _itemProducts: 0,
//             _itemInvItems: 0,
//             _itemProductIds: 0
//           }
//         }
//       ])

//       return NextResponse.json({
//         noResult: debts.length === 0,
//         message: "",
//         result: debts,
//         error: false
//       })
//     }

//     // ─── Hutang Jasa ────────────────────────────────────────
//     if (filterType === "jasa") {
//       const matchQuery: any = {
//         companyId: cmp._id,
//         purchaseType: "service",
//         ...dateFilter
//       }

//       if (status === "unpaid") {
//         matchQuery.$expr = { $gt: ["$finalPrice", "$payAmount"] }
//       } else if (status === "paid") {
//         matchQuery.$expr = { $lte: ["$finalPrice", "$payAmount"] }
//       }

//       if (vendorId) {
//         const vendorObjectId = new mongoose.Types.ObjectId(vendorId)
//         matchQuery.$or = [
//           { vendorId: vendorObjectId },
//           { supplierId: vendorObjectId }
//         ]
//       }

//       const debts = await Purchase.aggregate([
//         { $match: matchQuery },
//         {
//           $lookup: {
//             from: "vendors",
//             localField: "vendorId",
//             foreignField: "_id",
//             as: "vendor"
//           }
//         },
//         { $unwind: { path: "$vendor", preserveNullAndEmptyArrays: true } },
//         {
//           $lookup: {
//             from: "suppliers",
//             localField: "supplierId",
//             foreignField: "_id",
//             as: "supplier"
//           }
//         },
//         { $unwind: { path: "$supplier", preserveNullAndEmptyArrays: true } }
//       ])

//       return NextResponse.json({
//         noResult: debts.length === 0,
//         message: "",
//         result: debts,
//         error: false
//       })
//     }

//     // ─── Hutang Vendor ─────────────────────────────────────
//     if (filterType === "vendor") {
//       const matchQuery: any = {
//         companyId: cmp._id,
//         invoiceType: "vendor_manual",
//         void: { $ne: true },
//         ...dateFilter
//       }

//       if (vendorId) {
//         matchQuery.vendorId = new mongoose.Types.ObjectId(vendorId)
//       }

//       const invoices = await Invoice.aggregate([
//         { $match: matchQuery },

//         {
//           $lookup: {
//             from: "vendors",
//             localField: "vendorId",
//             foreignField: "_id",
//             as: "vendor"
//           }
//         },
//         { $unwind: { path: "$vendor", preserveNullAndEmptyArrays: true } },

//         {
//           $lookup: {
//             from: "invoices",
//             let: { manualInvoiceNumber: "$invoiceNumber" },
//             pipeline: [
//               {
//                 $match: {
//                   $expr: {
//                     $eq: ["$vendorInvoiceNumber", "$$manualInvoiceNumber"]
//                   },
//                   void: { $ne: true }
//                 }
//               }
//             ],
//             as: "relatedInvoices"
//           }
//         },

//         {
//           $lookup: {
//             from: "taxes",
//             localField: "vendor.taxes",
//             foreignField: "_id",
//             as: "vendor.populatedTaxes"
//           }
//         },

//         {
//           $addFields: {
//             vendorPaid: { $ifNull: ["$vendorPaid", 0] },
//             baseVendorAmount: {
//               $cond: {
//                 if: {
//                   $gt: [
//                     { $size: { $ifNull: ["$relatedInvoices", []] } },
//                     0
//                   ]
//                 },
//                 then: { $sum: "$relatedInvoices.debt" },
//                 else: { $ifNull: ["$debt", 0] }
//               }
//             }
//           }
//         },

//         {
//           $addFields: {
//             taxRatePct: {
//               $reduce: {
//                 input: { $ifNull: ["$vendor.populatedTaxes", []] },
//                 initialValue: 0,
//                 in: {
//                   $cond: {
//                     if: "$$this.isPPh",
//                     then: { $subtract: ["$$value", "$$this.value"] },
//                     else: { $add: ["$$value", "$$this.value"] }
//                   }
//                 }
//               }
//             }
//           }
//         },

//         {
//           $addFields: {
//             totalVendorAmount: {
//               $add: [
//                 "$baseVendorAmount",
//                 {
//                   $divide: [
//                     { $multiply: ["$baseVendorAmount", "$taxRatePct"] },
//                     100
//                   ]
//                 }
//               ]
//             },
//             originalDebt: "$debt"
//           }
//         },

//         {
//           $addFields: {
//             remaining: {
//               $subtract: ["$totalVendorAmount", "$vendorPaid"]
//             }
//           }
//         }
//       ])

//       return NextResponse.json({
//         noResult: invoices.length === 0,
//         message: "",
//         result: invoices,
//         error: false
//       })
//     }

//     return NextResponse.json({
//       noResult: true,
//       message: "filterType tidak valid",
//       result: null,
//       error: true
//     })

//   } catch (e: unknown) {
//     return NextResponse.json({
//       noResult: true,
//       message: e instanceof Error ? e.message : "Something went wrong",
//       result: null,
//       error: true
//     })
//   }
// }


// export async function GET(request: NextRequest) {
//   try {
//     const url = new URL(request.url)
//     const id = url.searchParams.get("id")
//     const filterType = url.searchParams.get("filterType") ?? "barang"
//     const status = url.searchParams.get("status") ?? "unpaid"
//     const month = url.searchParams.get("month")
//     const vendorId = url.searchParams.get("vendorId")

//     await connectToDatabase()

//     const cmp = await Companie.findOne({ masterAccountId: id })
//     if (!cmp) {
//       return NextResponse.json({
//         noResult: true,
//         message: "Company tidak ditemukan",
//         result: [],
//         error: false
//       })
//     }

//     // Filter periode
//     const dateFilter: any = {}

//     if (month) {
//       const [year, m] = month.split("-").map(Number)
//       const nextYear = m === 12 ? year + 1 : year
//       const nextMonth = m === 12 ? 1 : m + 1

//       dateFilter.date = {
//         $gte: new Date(`${month}-01T00:00:00+07:00`),
//         $lt: new Date(`${nextYear}-${String(nextMonth).padStart(2, "0")}-01T00:00:00+07:00`)
//       }
//     }

//     // Lookup satu transaksi purchase terakhir untuk produk yang sama
//     const historyLookup = {
//       $lookup: {
//         from: "purchases",
//         let: {
//           currentId: "$_id",
//           currentDate: "$date",
//           currentCompanyId: "$companyId",
//           currentProductId: "$productId",
//           currentItems: { $ifNull: ["$items", []] }
//         },
//         pipeline: [
//           {
//             $match: {
//               $expr: {
//                 $and: [
//                   { $ne: ["$_id", "$$currentId"] },
//                   { $eq: ["$companyId", "$$currentCompanyId"] },
//                   { $in: ["$purchaseType", ["product", "procurement"]] },
//                   {
//                     $or: [
//                       {
//                         $and: [
//                           { $ne: ["$$currentProductId", null] },
//                           { $eq: ["$productId", "$$currentProductId"] }
//                         ]
//                       },
//                       {
//                         $and: [
//                           { $gt: [{ $size: "$$currentItems" }, 0] },
//                           {
//                             $gt: [
//                               {
//                                 $size: {
//                                   $filter: {
//                                     input: { $ifNull: ["$items", []] },
//                                     as: "previousItem",
//                                     cond: {
//                                       $in: [
//                                         "$$previousItem.productId",
//                                         {
//                                           $map: {
//                                             input: "$$currentItems",
//                                             as: "currentItem",
//                                             in: "$$currentItem.productId"
//                                           }
//                                         }
//                                       ]
//                                     }
//                                   }
//                                 }
//                               },
//                               0
//                             ]
//                           }
//                         ]
//                       }
//                     ]
//                   },
//                   {
//                     $lt: [
//                       "$date",
//                       "$$currentDate"
//                     ]
//                   }
//                 ]
//               }
//             }
//           },
//           { $sort: { date: -1, _id: -1 } },
//           { $limit: 1 },
//           {
//             $project: {
//               _id: 1,
//               date: 1,
//               purchaseType: 1,
//               productId: 1,
//               items: 1,
//               finalPrice: 1,
//               payAmount: 1,
//               quantity: 1,
//               price: 1
//             }
//           }
//         ],
//         as: "history"
//       }
//     }

//     // ─── Hutang Barang ─────────────────────────────────────
//     if (filterType === "barang") {
//       const matchQuery: any = {
//         companyId: cmp._id,
//         purchaseType: { $in: ["product", "procurement"] },
//         ...dateFilter
//       }

//       if (vendorId) {
//         const vendorObjectId = new mongoose.Types.ObjectId(vendorId)
//         matchQuery.$or = [
//           { vendorId: vendorObjectId },
//           { supplierId: vendorObjectId }
//         ]
//       }

//       const debts = await Purchase.aggregate([
//         { $match: matchQuery },

//         {
//           $lookup: {
//             from: "products",
//             localField: "productId",
//             foreignField: "_id",
//             as: "product"
//           }
//         },
//         { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },

//         {
//           $lookup: {
//             from: "invitems",
//             localField: "productId",
//             foreignField: "_id",
//             as: "invItem"
//           }
//         },
//         { $unwind: { path: "$invItem", preserveNullAndEmptyArrays: true } },

//         {
//           $lookup: {
//             from: "suppliers",
//             localField: "supplierId",
//             foreignField: "_id",
//             as: "supplier"
//           }
//         },
//         { $unwind: { path: "$supplier", preserveNullAndEmptyArrays: true } },

//         {
//           $lookup: {
//             from: "vendors",
//             localField: "vendorId",
//             foreignField: "_id",
//             as: "vendor"
//           }
//         },
//         { $unwind: { path: "$vendor", preserveNullAndEmptyArrays: true } },

//         // Populate items[].product
//         {
//           $addFields: {
//             _itemProductIds: {
//               $map: {
//                 input: { $ifNull: ["$items", []] },
//                 as: "itm",
//                 in: "$$itm.productId"
//               }
//             }
//           }
//         },
//         {
//           $lookup: {
//             from: "products",
//             localField: "_itemProductIds",
//             foreignField: "_id",
//             as: "_itemProducts"
//           }
//         },
//         {
//           $lookup: {
//             from: "invitems",
//             localField: "_itemProductIds",
//             foreignField: "_id",
//             as: "_itemInvItems"
//           }
//         },
//         {
//           $addFields: {
//             items: {
//               $map: {
//                 input: { $ifNull: ["$items", []] },
//                 as: "itm",
//                 in: {
//                   $mergeObjects: [
//                     "$$itm",
//                     {
//                       product: {
//                         $arrayElemAt: [
//                           {
//                             $filter: {
//                               input: {
//                                 $concatArrays: [
//                                   "$_itemProducts",
//                                   "$_itemInvItems"
//                                 ]
//                               },
//                               as: "p",
//                               cond: {
//                                 $eq: [
//                                   { $toString: "$$p._id" },
//                                   { $toString: "$$itm.productId" }
//                                 ]
//                               }
//                             }
//                           },
//                           0
//                         ]
//                       }
//                     }
//                   ]
//                 }
//               }
//             }
//           }
//         },

//         // Ambil satu transaksi sebelumnya
//         historyLookup,

//         {
//           $addFields: {
//             history: {
//               $ifNull: [
//                 { $arrayElemAt: ["$history", 0] },
//                 null
//               ]
//             }
//           }
//         },

//         {
//           $project: {
//             _itemProducts: 0,
//             _itemInvItems: 0,
//             _itemProductIds: 0
//           }
//         }
//       ])

//       return NextResponse.json({
//         noResult: debts.length === 0,
//         message: "",
//         result: debts,
//         error: false
//       })
//     }

//     // ─── Hutang Jasa ────────────────────────────────────────
//     if (filterType === "jasa") {
//       const matchQuery: any = {
//         companyId: cmp._id,
//         purchaseType: "service",
//         ...dateFilter
//       }

//       if (status === "unpaid") {
//         matchQuery.$expr = { $gt: ["$finalPrice", "$payAmount"] }
//       } else if (status === "paid") {
//         matchQuery.$expr = { $lte: ["$finalPrice", "$payAmount"] }
//       }

//       if (vendorId) {
//         const vendorObjectId = new mongoose.Types.ObjectId(vendorId)
//         matchQuery.$or = [
//           { vendorId: vendorObjectId },
//           { supplierId: vendorObjectId }
//         ]
//       }

//       const debts = await Purchase.aggregate([
//         { $match: matchQuery },
//         {
//           $lookup: {
//             from: "vendors",
//             localField: "vendorId",
//             foreignField: "_id",
//             as: "vendor"
//           }
//         },
//         { $unwind: { path: "$vendor", preserveNullAndEmptyArrays: true } },
//         {
//           $lookup: {
//             from: "suppliers",
//             localField: "supplierId",
//             foreignField: "_id",
//             as: "supplier"
//           }
//         },
//         { $unwind: { path: "$supplier", preserveNullAndEmptyArrays: true } }
//       ])

//       return NextResponse.json({
//         noResult: debts.length === 0,
//         message: "",
//         result: debts,
//         error: false
//       })
//     }

//     // ─── Hutang Vendor ─────────────────────────────────────
//     if (filterType === "vendor") {
//       const matchQuery: any = {
//         companyId: cmp._id,
//         invoiceType: "vendor_manual",
//         void: { $ne: true },
//         ...dateFilter
//       }

//       if (vendorId) {
//         matchQuery.vendorId = new mongoose.Types.ObjectId(vendorId)
//       }

//       const invoices = await Invoice.aggregate([
//         { $match: matchQuery },

//         {
//           $lookup: {
//             from: "vendors",
//             localField: "vendorId",
//             foreignField: "_id",
//             as: "vendor"
//           }
//         },
//         { $unwind: { path: "$vendor", preserveNullAndEmptyArrays: true } },

//         {
//           $lookup: {
//             from: "invoices",
//             let: { manualInvoiceNumber: "$invoiceNumber" },
//             pipeline: [
//               {
//                 $match: {
//                   $expr: {
//                     $eq: ["$vendorInvoiceNumber", "$$manualInvoiceNumber"]
//                   },
//                   void: { $ne: true }
//                 }
//               }
//             ],
//             as: "relatedInvoices"
//           }
//         },

//         {
//           $lookup: {
//             from: "taxes",
//             localField: "vendor.taxes",
//             foreignField: "_id",
//             as: "vendor.populatedTaxes"
//           }
//         },

//         {
//           $addFields: {
//             vendorPaid: { $ifNull: ["$vendorPaid", 0] },
//             baseVendorAmount: {
//               $cond: {
//                 if: {
//                   $gt: [
//                     { $size: { $ifNull: ["$relatedInvoices", []] } },
//                     0
//                   ]
//                 },
//                 then: { $sum: "$relatedInvoices.debt" },
//                 else: { $ifNull: ["$debt", 0] }
//               }
//             }
//           }
//         },

//         {
//           $addFields: {
//             taxRatePct: {
//               $reduce: {
//                 input: { $ifNull: ["$vendor.populatedTaxes", []] },
//                 initialValue: 0,
//                 in: {
//                   $cond: {
//                     if: "$$this.isPPh",
//                     then: { $subtract: ["$$value", "$$this.value"] },
//                     else: { $add: ["$$value", "$$this.value"] }
//                   }
//                 }
//               }
//             }
//           }
//         },

//         {
//           $addFields: {
//             totalVendorAmount: {
//               $add: [
//                 "$baseVendorAmount",
//                 {
//                   $divide: [
//                     { $multiply: ["$baseVendorAmount", "$taxRatePct"] },
//                     100
//                   ]
//                 }
//               ]
//             },
//             originalDebt: "$debt"
//           }
//         },

//         {
//           $addFields: {
//             remaining: {
//               $subtract: ["$totalVendorAmount", "$vendorPaid"]
//             }
//           }
//         }
//       ])

//       return NextResponse.json({
//         noResult: invoices.length === 0,
//         message: "",
//         result: invoices,
//         error: false
//       })
//     }

//     return NextResponse.json({
//       noResult: true,
//       message: "filterType tidak valid",
//       result: null,
//       error: true
//     })

//   } catch (e: unknown) {
//     return NextResponse.json({
//       noResult: true,
//       message: e instanceof Error ? e.message : "Something went wrong",
//       result: null,
//       error: true
//     })
//   }
// }

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase()
    const body = await request.json()
    const { invoiceId, payAmount, paymentMethod, payDate, userId, bankAccountId, masterAccountId, description, voucher, time } = body

    if (!invoiceId || !payAmount || payAmount <= 0) {
      return NextResponse.json({ noResult: true, message: "Parameter tidak valid", result: null, error: true })
    }

    const invoice = await Invoice.findById(invoiceId).lean() as any
    if (!invoice) return NextResponse.json({ noResult: true, message: "Invoice tidak ditemukan", result: null, error: true })

    // Hitung total hutang vendor dari Invoice lain (akumulatif debt)
    const relatedInvoices = await Invoice.find({ vendorInvoiceNumber: invoice.invoiceNumber, void: { $ne: true } }).lean()
    const baseVendorAmount = relatedInvoices.reduce((sum, inv: any) => sum + (inv.debt || 0), 0);

    let totalVendorAmount = baseVendorAmount;
    if (invoice.vendorId) {
      const Vendor = (await import('@/models/Vendor')).default;
      const vendor = await Vendor.findById(invoice.vendorId).populate('taxes').lean() as any;
      if (vendor && vendor.taxes && vendor.taxes.length > 0) {
        let taxRatePct = 0;
        for (const tax of vendor.taxes) {
          if (tax.isPPh) {
            taxRatePct -= tax.value;
          } else {
            taxRatePct += tax.value;
          }
        }
        totalVendorAmount = baseVendorAmount + (baseVendorAmount * taxRatePct / 100);
      }
    }

    const currentVendorPaid = (invoice.vendorPaid ?? 0)
    const amt = Number(payAmount)
    const newVendorPaid = currentVendorPaid + amt

    if (newVendorPaid > totalVendorAmount) {
      return NextResponse.json({ noResult: true, message: `Jumlah bayar melebihi hutang (max: ${totalVendorAmount - currentVendorPaid})`, result: null, error: true })
    }

    const isCash = !paymentMethod || paymentMethod === 'Cash'
    const cmp = masterAccountId ? await Companie.findOne({ masterAccountId }) : null

    if (cmp) {
      const txDate = payDate || new Date().toISOString();
      const balance = await getAvailableBalance(cmp._id, paymentMethod, bankAccountId, txDate);
      if (balance < amt) {
        return NextResponse.json({ noResult: true, message: `Saldo tidak mencukupi. Saldo tersedia pada tanggal tersebut: Rp ${balance.toLocaleString('id-ID')}`, result: null, error: true })
      }
    }

    await Invoice.findByIdAndUpdate(invoiceId, {
      vendorPaid: newVendorPaid,
      ...(voucher ? { bankVoucher: voucher } : {})
    })

    const refText = [description, voucher ? `Voucher: ${voucher}` : null].filter(Boolean).join(' - ')

    // Bangun reference bank jika pembayaran melalui bank
    let bankReference: string | undefined = undefined
    if (!isCash && bankAccountId) {
      const bankAcc = await BankAccount.findById(bankAccountId).lean() as any
      if (bankAcc) {
        bankReference = `${bankAcc.bank}-${bankAcc.accountNumber}`
      }
    }

    const date = payDate ? new Date(payDate) : new Date()
    const [hours, minutes] = time.split(':').map(Number)
    date.setUTCHours(hours - 7, minutes, 0, 0)

    // Gunakan suffix yang sama agar paymentNumber di Log dan reference di Cashflow bisa saling di-link
    const vnSuffix = String(Date.now()).slice(-6)

    const logEntry = await Log.create({
      purchaseId: new mongoose.Types.ObjectId(invoiceId),
      date: date,
      amount: amt,
      initial: false,
      paymentNumber: `VL-${vnSuffix}`,
      type: 'payment',
      paymentMethod: paymentMethod || 'Cash',
      createdBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
      reference: bankReference || refText || undefined,
      bankAccountId: !isCash && bankAccountId ? new mongoose.Types.ObjectId(bankAccountId) : undefined,
    })

    // ─── Catat Cashflow ──────────────────────────────────────────────────────

    if (cmp) {
      await Cashflow.create({
        companyId: cmp._id,
        accountType: isCash ? 'Cash' : 'Bank',
        bankAccountId: isCash ? null : (bankAccountId || null),
        type: 'out',
        amount: amt,
        reference: `VL ${vnSuffix} | Inv ${invoice.invoiceNumber || invoiceId}${refText ? ` | ${refText}` : ''}`,
        date: payDate ? new Date(payDate) : new Date(),
        recordedBy: userId ? new mongoose.Types.ObjectId(userId) : null,
        to: 'Vendor',
        source: 'purchase_payment',
        time: time
      })
    }

    return NextResponse.json({
      noResult: false,
      message: "Pembayaran berhasil dicatat",
      result: { invoiceId, newVendorPaid, remaining: totalVendorAmount - newVendorPaid, logId: logEntry._id },
      error: false
    })
  }
  catch (e: unknown) {
    return NextResponse.json({
      noResult: true,
      message: e instanceof Error ? e.message : "Something went wrong",
      result: null,
      error: true
    })
  }
}

// ─── PUT: Edit pembayaran hutang vendor (tanggal & jumlah) ─────────────────────
export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase()
    const body = await request.json()
    const { logId, approvalCode, userId, newAmount, newDate, newPaymentMethod, newTime, reference } = body

    if (!logId) {
      return NextResponse.json({ noResult: true, message: "logId is required", result: null, error: true })
    }
    if (!approvalCode) {
      return NextResponse.json({ noResult: true, message: "Approval code is required", result: null, error: true })
    }

    const User = (await import('@/models/User')).default

    const approver = await User.findOne({ approvalCode })
    if (!approver) {
      return NextResponse.json({ noResult: true, message: "Kode approval tidak valid", result: null, error: true })
    }

    const oldLog = await Log.findById(logId)
    if (!oldLog) {
      return NextResponse.json({ noResult: true, message: "Log tidak ditemukan", result: null, error: true })
    }

    const editor = userId ? await User.findById(userId) : null

    const updates: any = {
      editedAt: new Date(),
      editApprovedBy: approver._id,
    }
    if (editor) updates.editedBy = editor._id
    if (newDate) updates.date = new Date(newDate)
    if (newPaymentMethod) updates.paymentMethod = newPaymentMethod

    if (newTime) {
      const date = new Date(updates.date)
      const [hours, minutes] = newTime.split(':').map(Number)
      date.setUTCHours(hours - 7, minutes, 0, 0)
      updates.date = date
    }

    // Update bankAccountId di Log b1erdasarkan newPaymentMethod
    const isCashEdit = !newPaymentMethod || newPaymentMethod === 'Cash'
    if (isCashEdit) {
      updates.bankAccountId = null
    }
    else {
      // newPaymentMethod format: "BankName-AccountNumber"
      const bankForLog = await BankAccount.findOne({ accountNumber: newPaymentMethod.split('-')[1] }).lean() as any
      updates.bankAccountId = bankForLog ? bankForLog._id : null
      updates.reference = reference
    }

    // Jika amount berubah, update Invoice.vendorPaid
    if (newAmount !== undefined && newAmount !== null && Number(newAmount) !== oldLog.amount) {
      const diff = Number(newAmount) - oldLog.amount
      updates.amount = Number(newAmount)

      // Update vendorPaid di Invoice
      await Invoice.findByIdAndUpdate(oldLog.purchaseId, {
        $inc: { vendorPaid: diff }
      })
    }

    // Update Cashflow: selalu update untuk semua perubahan (date/paymentMethod/bankAccountId/amount)
    const invoice = await Invoice.findById(oldLog.purchaseId).lean() as any
    if (invoice) {
      const cmp = await Companie.findOne({ _id: invoice.companyId })
      if (cmp) {
        // Cari cashflow terkait dan update amount-nya
        const cfQuery: any = {
          reference: {
            $regex: oldLog.paymentNumber.replace(/\s*-\s*/, ' '),
            $options: 'i'
          }
        }

        // cari bank baru jika newPaymentMethod bukan cash
        const bank = isCashEdit ? null : await BankAccount.findOne(
          { accountNumber: newPaymentMethod.split('-')[1] }
        )

        // jangan sentuh baris kode ini

        // Update cashflow terdekat berdasarkan tanggal log lama
        await Cashflow.findOneAndUpdate(
          {
            ...cfQuery
          },
          {
            accountType: isCashEdit ? 'Cash' : 'Bank',
            bankAccountId: isCashEdit ? null : (bank?._id || null),
            ...(newDate ? { date: new Date(newDate) } : {}),
            ...(newAmount !== undefined && newAmount !== null ? { amount: Number(newAmount) } : {}),
            time: newTime
          }
        )

        // jangan sentuh baris kode kode ini
      }
    }

    const updated = await Log.findByIdAndUpdate(
      logId, updates,
      {
        new: true
      }
    ).populate('createdBy', 'name')
      .populate('editedBy', 'name')
      .populate('editApprovedBy', 'name')
      .lean()

    return NextResponse.json({
      noResult: false,
      message: "Payment log updated",
      result: updated,
      error: false
    })
  }
  catch (e: unknown) {
    return NextResponse.json({
      noResult: true,
      message: e instanceof Error ? e.message : "Something went wrong",
      result: null,
      error: true
    })
  }
}

// ─── DELETE: Hapus pembayaran hutang vendor ─────────────────────────────────────
export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase()
    const url = new URL(request.url)
    const logId = url.searchParams.get("logId")
    const approvalCode = url.searchParams.get("approvalCode")

    if (!logId) {
      return NextResponse.json({ noResult: true, message: "logId is required", result: null, error: true })
    }
    if (!approvalCode) {
      return NextResponse.json({ noResult: true, message: "Approval code is required", result: null, error: true })
    }

    const User = (await import('@/models/User')).default

    const approver = await User.findOne({ approvalCode })
    if (!approver) {
      return NextResponse.json({ noResult: true, message: "Kode approval tidak valid", result: null, error: true })
    }

    const log = await Log.findById(logId)
    if (!log) {
      return NextResponse.json({ noResult: true, message: "Log tidak ditemukan", result: null, error: true })
    }

    const logAmount = log.amount ?? 0

    // Rollback vendorPaid di Invoice
    await Invoice.findByIdAndUpdate(log.purchaseId, {
      $inc: { vendorPaid: -logAmount }
    })

    // Hapus Cashflow terkait
    const invoice = await Invoice.findById(log.purchaseId).lean() as any
    if (invoice) {
      const cmp = await Companie.findOne({ _id: invoice.companyId })
      if (cmp) {
        await Cashflow.findOneAndDelete({
          companyId: cmp._id,
          type: 'out',
          amount: logAmount,
          reference: { $regex: invoice.invoiceNumber || log.purchaseId.toString() }
        })
      }
    }

    // Hapus log
    await Log.findByIdAndDelete(logId)

    return NextResponse.json({
      noResult: false,
      message: "Pembayaran berhasil dihapus",
      result: { logId, rolledBackAmount: logAmount },
      error: false
    })
  }
  catch (e: unknown) {
    return NextResponse.json({
      noResult: true,
      message: e instanceof Error ? e.message : "Something went wrong",
      result: null,
      error: true
    })
  }
}