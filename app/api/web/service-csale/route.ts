
import Invoice from '@/models/Invoice'
import ServiceOrder from "@/models/ServiceOrder"
import Companie from '@/models/Companie'

import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";



export async function POST(request: NextRequest) {

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

    const customCustomer = {
      name: customerName,
      address: address,
    }

    const rangeNum = range ? parseInt(range as string) : 0;

    if (contract) {
      const fileName = (formData.get("fileName") as string) ?? contract.name;
      const r = await Companie.findOne({ masterAccountId: id })
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

      if (obj.contractType === "One Time" && obj.frequency === "Once") {
        await Invoice.create({
          invoiceNumber: "xxx",
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
          ]
        })
      }

      if (contractType === "One Time" && frequency === "Month" && rangeNum < 2) {
        await Invoice.create({
          invoiceNumber: "xxx",
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
          ]
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
      const _r = await Companie.findOne({ masterAccountId: id })

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

      if (obj.contractType === "One Time" && obj.frequency === "Once") {
        await Invoice.create({
          invoiceNumber: "xxx",
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
          ]
        })
      }

      if (contractType === "One Time" && frequency === "Month" && rangeNum < 2) {
        await Invoice.create({
          invoiceNumber: "xxx",
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
          ]
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

    const contract = formData.get("contract") as File | null;
    const id = formData.get("id") as string;

    const updateData: any = {
      productId,
      contractType,
      customCustomer: customer,
      range: parseInt(range as string) || 1,
      frequency,
      price: parseFloat(price) || 0,
      qty: parseInt(qty as string) || 1
    };

    if (contract) {
      const company = await Companie.findOne({
        masterAccountId: id
      });
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
  } catch (e: unknown) {
    return NextResponse.json({
      noResult: true,
      message: (e as Error).message,
      result: null,
      error: true
    });
  }
}