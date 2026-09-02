
import Invoice from '@/models/Invoice'
import ServiceOrder from "@/models/ServiceOrder"
import Companie from '@/models/Companie'
import Customer from '@/models/Customer'
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";



export async function POST(request: NextRequest) {

  function formatNumber(x: number) {
    return String(x).padStart(4, '0');
  }

  try {
    await connectToDatabase()
    const formData = await request.formData()

    const id = formData.get("id") as string
    const customerName = formData.get("customerName") as string
    const address = formData.get("address") as string
    const productId = formData.get("productId") as string
    const price = formData.get("price") as string
    const contractType = formData.get("contractType") as string
    const frequency = formData.get("frequency") as string
    const qty = formData.get("qty") as string
    const range = formData.get("range")
    const debt = formData.get("debt") as string
    const payTerm = formData.get("payTerm") as string
    const dueDate = formData.get("dueDate") as string
    const paymentMethod = formData.get("paymentMethod") as string
    const payAmount = formData.get("payAmount")
    const contract = formData.get("contract") as File
    const taxes = formData.get("taxes") as string
    const periodStart = formData.get("periodStart") as string
    const periodEnd = formData.get("periodEnd") as string
    const taxNumberForm = formData.get("taxNumber") as string
    
    const company = await Companie.findOne({ masterAccountId: id })
    const customer = await Customer.findOne({ bussinessName: customerName, customerOf: company._id })
    const taxNumberToUse = taxNumberForm || (customer && customer.taxNumber ? `${customer.taxType ? customer.taxType + ' ' : ''}${customer.taxNumber}`.trim() : '');

    const customCustomer = {
      name: customerName,
      address: address,
      taxNumber: taxNumberToUse
    }

    const rangeNum = range ? parseInt(range as string) : 0;

    if (contract) {
      const fileName = (formData.get("fileName") as string) ?? contract.name;
      const r = company;

      const cdnUrl = `https://leryn-ljm-3.b-cdn.net/erp_${r.email.split('@')[0]}/contracts/${fileName}`;
      const buffer = Buffer.from(await contract.arrayBuffer());
      const s3 = new S3Client({
        forcePathStyle: true,
        region: process.env.S3_REGION!,
        endpoint: process.env.S3_ENDPOINT!,
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY!,
          secretAccessKey: process.env.S3_SECRET_KEY!,
        },
      });

      const invoiceCount = await Invoice.countDocuments({
        companyId: r._id,
      })

      const now = new Date();
      const shortYear = String(now.getFullYear()).slice(-2);
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const invoiceNumber = `${r.invoiceCode}${shortYear}${month}${formatNumber(invoiceCount + 1)}`

      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET!,
          Key: `erp_${r.email.split("@")[0]}/contracts/${fileName}`,
          Body: Buffer.from(buffer),
          ContentType: contract.type,
        })
      );


      const obj: Record<string, unknown> = {
        companyId: r._id,
        customCustomer,
        productId: productId.split("/")[0],
        price,
        contractType,
        frequency,
        qty,
        range,
        debt,
        payTerm,
        dueDate,
        paymentMethod,
        payAmount,
        contract: cdnUrl,
        date: Date.now(),
        productType: "service",
        salesOrderNumber: `SO-${String(Date.now()).slice(-5)}`,
        periodStart: periodStart ? new Date(periodStart) : undefined,
        periodEnd: periodEnd ? new Date(periodEnd) : undefined,
        taxNumber: taxNumberToUse,
        taxes: taxes ? JSON.parse(taxes) : []
      }

      if (contractType === "One Time" && frequency === "Month" && rangeNum > 1) {
        delete obj.payTerm
      }

      if (contractType === "Full" || contractType === "Trial") {
        delete obj.paymentMethod
        delete obj.debt
        delete obj.payAmount
        delete obj.payTerm
      }

      if (contractType === "One Time" && frequency === "Once") {
        delete obj.dueDate
      }
      const result = await ServiceOrder.create(obj)

      let pphDeduction = 0;
      if (Array.isArray(obj.taxes) && obj.taxes.length > 0) {
        obj.taxes.forEach((t: any) => {
          if (t.isPPh) {
            pphDeduction += t.taxValue;
          }
        });
      }

      if (obj.contractType === "One Time" && obj.frequency === "Once") {
        await Invoice.create({
          invoiceNumber,
          companyId: r._id,
          invoiceType: "service",
          salesOrderId: result._id,
          salesOrderNumber: result.salesOrderNumber,
          payAmount: payAmount,
          paid: false,
          date: Date.now(),
          paymentMethod: obj.paymentMethod,
          status: "draft",
          paymentHistory: [
            {
              amount: payAmount,
              date: Date.now(),
              method: obj.paymentMethod,
            }
          ],
          pphDeduction: pphDeduction
        })
      }

      if (contractType === "One Time" && frequency === "Month" && rangeNum < 2) {
        await Invoice.create({
          invoiceNumber,
          companyId: r._id,
          invoiceType: "service",
          salesOrderId: result._id,
          salesOrderNumber: result.salesOrderNumber,
          payAmount: payAmount,
          paid: false,
          date: Date.now(),
          paymentMethod: obj.paymentMethod,
          status: "draft",
          paymentHistory: [
            {
              amount: payAmount,
              date: Date.now(),
              method: obj.paymentMethod,
            }
          ],
          pphDeduction: pphDeduction
        })
      }

      return NextResponse.json({
        noResult: false,
        message: "success",
        result: {},
        error: false
      })
    }
    else {
      const _r = company;

      const obj: Record<string, unknown> = {
        companyId: _r._id,
        customCustomer,
        productId: productId.split("/")[0],
        price,
        contractType,
        frequency,
        qty,
        range,
        debt,
        payTerm,
        dueDate,
        paymentMethod,
        payAmount,
        date: Date.now(),
        productType: "service",
        salesOrderNumber: `SO-${String(Date.now()).slice(-5)}`,
        periodStart: periodStart ? new Date(periodStart) : undefined,
        periodEnd: periodEnd ? new Date(periodEnd) : undefined,
        taxNumber: taxNumberToUse,
        taxes: JSON.parse(taxes)
      }

      if (contractType === "One Time" && frequency === "Month" && rangeNum > 1) {
        delete obj.payTerm
      }

      if (contractType === "Full" || contractType === "Trial") {
        delete obj.paymentMethod
        delete obj.debt
        delete obj.payAmount
        delete obj.payTerm
      }

      if (contractType === "One Time" && frequency === "Once") {
        delete obj.dueDate
      }

      const result = await ServiceOrder.create(obj)

      let pphDeduction = 0;
      if (Array.isArray(obj.taxes) && obj.taxes.length > 0) {
        obj.taxes.forEach((t: any) => {
          if (t.isPPh) {
            pphDeduction += t.taxValue;
          }
        });
      }

      if (obj.contractType === "One Time" && obj.frequency === "Once") {
        const _r = await Companie.findOne({ masterAccountId: id })

        const invoiceCount = await Invoice.countDocuments({
          companyId: _r._id,
        })

        const now = new Date();
        const shortYear = String(now.getFullYear()).slice(-2);
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const invoiceNumber = `${_r.invoiceCode}${shortYear}${month}${formatNumber(invoiceCount + 1)}`

        await Invoice.create({
          invoiceNumber,
          companyId: _r._id,
          invoiceType: "service",
          salesOrderId: result._id,
          salesOrderNumber: result.salesOrderNumber,
          payAmount: payAmount,
          paid: false,
          date: Date.now(),
          paymentMethod: obj.paymentMethod,
          status: "draft",
          paymentHistory: [
            {
              amount: payAmount,
              date: Date.now(),
              method: obj.paymentMethod,
            }
          ],
          pphDeduction: pphDeduction
        })
      }

      if (contractType === "One Time" && frequency === "Month" && rangeNum < 2) {
        const _r = await Companie.findOne({ masterAccountId: id })

        const invoiceCount = await Invoice.countDocuments({
          companyId: _r._id,
        })

        const now = new Date();
        const shortYear = String(now.getFullYear()).slice(-2);
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const invoiceNumber = `${_r.invoiceCode}${shortYear}${month}${formatNumber(invoiceCount + 1)}`

        await Invoice.create({
          invoiceNumber,
          companyId: _r._id,
          invoiceType: "service",
          salesOrderId: result._id,
          salesOrderNumber: result.salesOrderNumber,
          payAmount: payAmount,
          paid: false,
          date: Date.now(),
          paymentMethod: obj.paymentMethod,
          status: "draft",
          paymentHistory: [
            {
              amount: payAmount,
              date: Date.now(),
              method: obj.paymentMethod,
            }
          ],
          pphDeduction: pphDeduction
        })
      }

      return NextResponse.json({
        noResult: false,
        message: "success",
        result: {},
        error: false
      })
    }
  }
  catch (e: unknown) {
    console.log(e)
    return NextResponse.json({
      noResult: true,
      message: (e as Error).message,
      result: null,
      error: true
    })
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase()
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const company = await Companie.findOne({
      masterAccountId: id
    })
    const orders = await ServiceOrder.find({
      companyId: company._id
    })
    return NextResponse.json({
      noResult: false,
      message: "success",
      result: orders,
      error: false
    })
  }
  catch (e: unknown) {
    return NextResponse.json({
      noResult: true,
      message: (e as Error).message,
      result: null,
      error: true
    })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { _id, taxes, action } = body;

    if (!_id) {
      return NextResponse.json({
        noResult: true,
        message: "Invalid request: _id required",
        result: null,
        error: true,
      }, { status: 400 });
    }

    // Handle close / reopen action
    if (action === 'close') {
      await ServiceOrder.findByIdAndUpdate(_id, { status: 'closed' });
      return NextResponse.json({
        noResult: false,
        message: "Order closed successfully",
        result: {},
        error: false,
      });
    }

    if (action === 'reopen') {
      await ServiceOrder.findByIdAndUpdate(_id, { status: 'active' });
      return NextResponse.json({
        noResult: false,
        message: "Order reopened successfully",
        result: {},
        error: false,
      });
    }

    // Handle taxes update (original logic)
    if (!Array.isArray(taxes)) {
      return NextResponse.json({
        noResult: true,
        message: "Invalid request: taxes array required",
        result: null,
        error: true,
      }, { status: 400 });
    }

    await ServiceOrder.findByIdAndUpdate(_id, { taxes });

    return NextResponse.json({
      noResult: false,
      message: "Taxes applied successfully",
      result: {},
      error: false,
    });
  } catch (e: unknown) {
    return NextResponse.json({
      noResult: true,
      message: (e as Error).message,
      result: null,
      error: true,
    });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();
    const formData = await request.formData();

    const _id = formData.get("_id") as string;
    const productId = formData.get("productId") as string;
    const contractType = formData.get("contractType") as string;
    const customer = JSON.parse(formData.get("customer") as string);
    const range = formData.get("range");
    const frequency = formData.get("frequency") as string;
    const price = formData.get("price") as string;
    const qty = formData.get("qty") as string;
    const billed = formData.get("billed") as string;

    const contract = formData.get("contract") as File | null;
    const taxNumber = formData.get("taxNumber") as string;
    const periodStart = formData.get("periodStart") as string;
    const periodEnd = formData.get("periodEnd") as string;
    customer.taxNumber = taxNumber;

    const updateData: any = {
      productId,
      contractType,
      customCustomer: customer,
      taxNumber: taxNumber,
      range: parseInt(range as string) || 1,
      frequency,
      price: parseFloat(price) || 0,
      qty: parseInt(qty as string) || 1,
      periodStart: periodStart ? new Date(periodStart) : undefined,
      periodEnd: periodEnd ? new Date(periodEnd) : undefined,
      billed: billed
    };

    if (contract) {
      const fileName = contract.name;
      const buffer = Buffer.from(await contract.arrayBuffer());

      const s3 = new S3Client({
        region: "us-east-1",
        endpoint: "https://s3.filebase.com",
        credentials: {
          accessKeyId: "B8F0135956143AE0685E",
          secretAccessKey: "gKrbIZJnzLWBXZ0VGQvnlAumvngpBH35PsXN5zUp",
        },
      });

      const putCommand = new PutObjectCommand({
        Bucket: `leryn-storage`,
        Key: `erp/${company.email.split("@")[0]}/upload/${fileName}`,
        Body: buffer,
        ContentType: contract.type,
        Metadata: {
          cid: "true",
        },
      });

      await s3.send(putCommand)

      const head = await s3.send(
        new HeadObjectCommand({
          Bucket: "leryn-storage",
          Key: `erp/${company.email.split("@")[0]}/upload/${fileName}`,
        })
      );

      const cid = head.Metadata?.cid;
      const contractUrl = `https://wooden-plum-woodpecker.myfilebase.com/ipfs/${cid}`;
      updateData.contract = contractUrl;
    }

    await ServiceOrder.findByIdAndUpdate(_id, updateData);

    return NextResponse.json({
      noResult: false,
      message: "success",
      result: {},
      error: false
    });
  }
  catch (e: unknown) {
    return NextResponse.json({
      noResult: true,
      message: (e as Error).message,
      result: null,
      error: true
    });
  }
}