import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";

import Invoice from "@/models/Invoice";
import ServiceOrder from "@/models/ServiceOrder";
import Companie from "@/models/Companie";
import Customer from "@/models/Customer";

type Tax = {
  isPPh?: boolean;
  taxValue?: number;
  [key: string]: unknown;
};

type CustomerData = {
  name: string;
  address: string;
  taxNumber: string;
};

type InvoiceStatus = "active" | "draft";

function formatNumber(value: number) {
  return String(value).padStart(4, "0");
}

function getInvoiceNumber(invoiceCode: string, count: number) {
  const now = new Date();
  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");

  return `${invoiceCode}${year}${month}${formatNumber(count + 1)}`;
}

function parseNumber(
  value: FormDataEntryValue | null,
  fallback = 0
) {
  if (typeof value !== "string") return fallback;

  const number = Number(value);

  return Number.isFinite(number) ? number : fallback;
}

function parseDate(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value) return undefined;

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? undefined
    : date;
}

function parseTaxes(value: FormDataEntryValue | null): Tax[] {
  if (typeof value !== "string" || !value) return [];

  const parsed = JSON.parse(value);

  return Array.isArray(parsed) ? parsed : [];
}

function parseInvoiceStatus(
  value: FormDataEntryValue | null
): InvoiceStatus {
  if (value !== "active" && value !== "draft") {
    throw new Error("Invalid invoice status");
  }

  return value;
}

function getPphDeduction(taxes: Tax[]) {
  return taxes.reduce(
    (total, tax) =>
      total +
      (tax.isPPh ? Number(tax.taxValue) || 0 : 0),
    0
  );
}

function isInitialInvoice(
  contractType: string,
  frequency: string,
  range: number
) {
  return (
    contractType === "One Time" &&
    (
      frequency === "Once" ||
      (frequency === "Month" && range < 2)
    )
  );
}

function createS3Client() {
  return new S3Client({
    forcePathStyle: true,
    region: process.env.S3_REGION!,
    endpoint: process.env.S3_ENDPOINT!,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY!,
      secretAccessKey: process.env.S3_SECRET_KEY!
    }
  });
}

async function createInvoice({
  company,
  serviceOrder,
  payAmount,
  paymentMethod,
  price,
  qty,
  taxes
}: {
  company: any;
  serviceOrder: any;
  payAmount: number;
  paymentMethod?: string;
  price: number;
  qty: number;
  taxes: Tax[];
}) {
  const invoiceCount = await Invoice.countDocuments({
    companyId: company._id
  });

  return Invoice.create({
    invoiceNumber: getInvoiceNumber(
      company.invoiceCode,
      invoiceCount
    ),
    companyId: company._id,
    invoiceType: "service",
    salesOrderId: serviceOrder._id,
    salesOrderNumber: serviceOrder.salesOrderNumber,
    payAmount,
    paid: false,
    date: new Date(),
    status: "draft",

    paymentHistory:
      payAmount > 0
        ? [{
          amount: payAmount,
          date: new Date(),
          method: paymentMethod || "Cash",
          reverted: false
        }]
        : [],

    pphDeduction: getPphDeduction(taxes),
    price,
    qty,
    taxes
  });
}

function jsonError(
  message: string,
  status = 500
) {
  return NextResponse.json(
    {
      noResult: true,
      message,
      result: null,
      error: true
    },
    { status }
  );
}

function jsonSuccess(
  message: string,
  result: unknown = {}
) {
  return NextResponse.json({
    noResult: false,
    message,
    result,
    error: false
  });
}

async function uploadContract(
  company: any,
  file: File,
  key: string,
  metadata?: Record<string, string>
) {
  const buffer = Buffer.from(
    await file.arrayBuffer()
  );

  const s3 = createS3Client();

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: key,
      Body: buffer,
      ContentType: file.type,
      Metadata: metadata
    })
  );

  return s3;
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const formData = await request.formData();

    const id = formData.get("id") as string;
    const customerName =
      formData.get("customerName") as string;
    const address =
      formData.get("address") as string;
    const productId =
      formData.get("productId") as string;

    const contractType =
      formData.get("contractType") as string;
    const frequency =
      formData.get("frequency") as string;

    const price = parseNumber(
      formData.get("price")
    );
    const qty = parseNumber(
      formData.get("qty"),
      1
    );
    const range = parseNumber(
      formData.get("range")
    );

    const debt = parseNumber(
      formData.get("debt")
    );
    const payTerm = parseNumber(
      formData.get("payTerm")
    );

    const dueDate =
      formData.get("dueDate") as string;
    const paymentMethod =
      formData.get("paymentMethod") as string;
    const payAmount = parseNumber(
      formData.get("payAmount")
    );

    const contract = formData.get("contract");
    const taxes = parseTaxes(
      formData.get("taxes")
    );

    const periodStart = parseDate(
      formData.get("periodStart")
    );
    const periodEnd = parseDate(
      formData.get("periodEnd")
    );

    const taxNumberForm =
      formData.get("taxNumber") as string;
    const handledBy =
      formData.get("handledBy") as string;
    const vendorId =
      formData.get("vendorId") as string;

    const company = await Companie.findOne({
      masterAccountId: id
    });

    if (!company) {
      throw new Error("Company not found");
    }

    const customer = await Customer.findOne({
      bussinessName: customerName,
      customerOf: company._id
    });

    const taxNumber =
      taxNumberForm ||
      (
        customer?.taxNumber
          ? `${customer.taxType ? `${customer.taxType} ` : ""}${customer.taxNumber}`.trim()
          : ""
      );

    const customCustomer: CustomerData = {
      name: customerName,
      address,
      taxNumber
    };

    let contractUrl: string | undefined;

    if (
      contract instanceof File &&
      contract.size > 0
    ) {
      const fileName =
        (formData.get("fileName") as string) ||
        contract.name;

      const folder =
        `erp_${company.email.split("@")[0]}`;

      const key =
        `${folder}/contracts/${fileName}`;

      await uploadContract(
        company,
        contract,
        key
      );

      contractUrl =
        `https://leryn-ljm-3.b-cdn.net/${key}`;
    }

    const serviceOrderData = {
      companyId: company._id,
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

      contract: contractUrl,

      date: new Date(),
      productType: "service",
      salesOrderNumber:
        `SO-${String(Date.now()).slice(-5)}`,

      periodStart,
      periodEnd,

      taxNumber,
      taxes,

      handledBy,
      vendorId
    };

    if (
      contractType === "One Time" &&
      frequency === "Month" &&
      range > 1
    ) {
      delete (
        serviceOrderData as
        Partial<typeof serviceOrderData>
      ).payTerm;
    }

    if (
      contractType === "Full" ||
      contractType === "Trial"
    ) {
      const data =
        serviceOrderData as
        Partial<typeof serviceOrderData>;

      delete data.paymentMethod;
      delete data.debt;
      delete data.payAmount;
      delete data.payTerm;
    }

    if (
      contractType === "One Time" &&
      frequency === "Once"
    ) {
      delete (
        serviceOrderData as
        Partial<typeof serviceOrderData>
      ).dueDate;
    }

    const serviceOrder =
      await ServiceOrder.create(
        serviceOrderData
      );

    if (
      isInitialInvoice(
        contractType,
        frequency,
        range
      )
    ) {
      await createInvoice({
        company,
        serviceOrder,
        payAmount,
        paymentMethod,
        price,
        qty,
        taxes
      });
    }

    return jsonSuccess("success");
  }
  catch (e: unknown) {
    console.error(e);

    return jsonError(
      e instanceof Error
        ? e.message
        : "Unknown error"
    );
  }
}

export async function GET(
  request: NextRequest
) {
  try {
    await connectToDatabase();

    const url = new URL(request.url);

    const id =
      url.searchParams.get("id");
    const type =
      url.searchParams.get("type") ||
      "orders";

    const company = await Companie.findOne({
      masterAccountId: id
    });

    if (!company) {
      throw new Error("Company not found");
    }

    if (type === "invoices") {
      const invoices =
        await Invoice.aggregate([
          {
            $match: {
              companyId: company._id,
              invoiceType: "service",
              status: "active"
            }
          },
          {
            $lookup: {
              from: "serviceorders",
              localField: "salesOrderId",
              foreignField: "_id",
              as: "order"
            }
          },
          {
            $unwind: "$order"
          },
          {
            $lookup: {
              from: "customers",
              localField: "order.customerId",
              foreignField: "_id",
              as: "order.customer"
            }
          },
          {
            $unwind: {
              path: "$order.customer",
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: "products",
              localField: "order.productId",
              foreignField: "_id",
              as: "order.product"
            }
          },
          {
            $unwind: {
              path: "$order.product",
              preserveNullAndEmptyArrays: true
            }
          }
        ]);

      return jsonSuccess(
        "",
        invoices
      );
    }

    const orders =
      await ServiceOrder.find({
        companyId: company._id
      });

    return jsonSuccess(
      "success",
      orders
    );
  }
  catch (e: unknown) {
    return jsonError(
      e instanceof Error
        ? e.message
        : "Unknown error"
    );
  }
}

export async function PATCH(
  request: NextRequest
) {
  try {
    await connectToDatabase();

    const body = await request.json();

    const {
      _id,
      taxes,
      action,
      vendorPrice
    } = body;

    if (!_id) {
      return jsonError(
        "Invalid request: _id required",
        400
      );
    }

    if (action === "close") {
      await ServiceOrder.findByIdAndUpdate(
        _id,
        { status: "closed" }
      );

      return jsonSuccess(
        "Order closed successfully"
      );
    }

    if (action === "reopen") {
      await ServiceOrder.findByIdAndUpdate(
        _id,
        { status: "active" }
      );

      return jsonSuccess(
        "Order reopened successfully"
      );
    }

    if (typeof vendorPrice === "number") {
      await ServiceOrder.findByIdAndUpdate(
        _id,
        { vendorPrice }
      );

      return jsonSuccess(
        "Vendor price updated successfully"
      );
    }

    if (!Array.isArray(taxes)) {
      return jsonError(
        "Invalid request: taxes array required",
        400
      );
    }

    await ServiceOrder.findByIdAndUpdate(
      _id,
      { taxes }
    );

    return jsonSuccess(
      "Taxes applied successfully"
    );
  }
  catch (e: unknown) {
    return jsonError(
      e instanceof Error
        ? e.message
        : "Unknown error"
    );
  }
}

export async function PUT(
  request: NextRequest
) {
  try {
    await connectToDatabase();

    const formData =
      await request.formData();

    const _id =
      formData.get("_id") as string | null;

    /*
     * ============================================================
     * UPDATE EXISTING SERVICE ORDER
     * ============================================================
     */

    if (_id) {
      const order =
        await ServiceOrder.findById(_id);

      if (!order) {
        throw new Error(
          "Order not found"
        );
      }

      const company =
        await Companie.findById(
          order.companyId
        );

      if (!company) {
        throw new Error(
          "Company not found"
        );
      }

      const productId =
        formData.get("productId") as string;

      const contractType =
        formData.get("contractType") as string;

      const customer =
        JSON.parse(
          formData.get("customer") as string
        );

      const range =
        parseNumber(
          formData.get("range"),
          1
        );

      const frequency =
        formData.get("frequency") as string;

      const price =
        parseNumber(
          formData.get("price")
        );

      const qty =
        parseNumber(
          formData.get("qty"),
          1
        );

      const billed =
        parseNumber(
          formData.get("billed")
        );

      const taxNumber =
        formData.get("taxNumber") as string;

      const periodStart =
        parseDate(
          formData.get("periodStart")
        );

      const periodEnd =
        parseDate(
          formData.get("periodEnd")
        );

      const handledBy =
        formData.get("handledBy") as string;

      const vendorId =
        formData.get("vendorId") as string;

      customer.taxNumber =
        taxNumber;

      const updateData = {
        productId,
        contractType,
        customCustomer: customer,

        taxNumber,

        range,
        frequency,

        price,
        qty,
        billed,

        periodStart,
        periodEnd,

        handledBy,
        vendorId
      };

      const contract =
        formData.get("contract");

      if (
        contract instanceof File &&
        contract.size > 0
      ) {
        const fileName =
          contract.name;

        const key =
          `erp/${company.email.split("@")[0]}/upload/${fileName}`;

        const s3 =
          await uploadContract(
            company,
            contract,
            key,
            { cid: "true" }
          );

        const head =
          await s3.send(
            new HeadObjectCommand({
              Bucket:
                process.env.S3_BUCKET!,
              Key: key
            })
          );

        const cid =
          head.Metadata?.cid;

        if (cid) {
          (
            updateData as
            Record<string, unknown>
          ).contract =
            `https://wooden-plum-woodpecker.myfilebase.com/ipfs/${cid}`;
        }
      }

      await ServiceOrder.findByIdAndUpdate(
        _id,
        updateData
      );

      return jsonSuccess(
        "success"
      );
    }

    /*
     * ============================================================
     * ACTIVATE EXISTING DRAFT / CREATE INVOICE
     * ============================================================
     */

    const id =
      formData.get("id") as string;

    const salesOrderNumber =
      formData.get(
        "salesOrderNumber"
      ) as string;

    if (salesOrderNumber) {
      const serviceOrder =
        await ServiceOrder.findOne({
          salesOrderNumber
        });

      if (!serviceOrder) {
        throw new Error(
          "Service Order not found"
        );
      }

      const company =
        await Companie.findById(
          serviceOrder.companyId
        );

      if (!company) {
        throw new Error(
          "Company not found"
        );
      }

      const status =
        parseInvoiceStatus(
          formData.get("status")
        );

      const missing =
        parseNumber(
          formData.get("missing")
        );

      const payAmount =
        parseNumber(
          formData.get("payAmount")
        );

      const invoice =
        await Invoice.findOne({
          salesOrderId:
            serviceOrder._id,
          invoiceType: "service",
          status: "draft"
        });

      if (!invoice) {
        throw new Error(
          "Draft invoice not found"
        );
      }

      invoice.status =
        status;

      if (
        formData.has("missing")
      ) {
        invoice.missing =
          missing;
      }

      if (payAmount > 0) {
        invoice.payAmount =
          payAmount;

        invoice.paymentHistory.push({
          amount: payAmount,
          method: "Cash",
          date: new Date(),
          reverted: false
        });
      }

      if (
        invoice.invoiceNumber === "xxx" ||
        !invoice.invoiceNumber
      ) {
        const count =
          await Invoice.countDocuments({
            companyId: company._id
          });

        invoice.invoiceNumber =
          getInvoiceNumber(
            company.invoiceCode,
            count
          );
      }

      await invoice.save();

      await ServiceOrder.findByIdAndUpdate(
        serviceOrder._id,
        {
          $inc: {
            billed: 1
          }
        }
      );

      return jsonSuccess(
        "Invoice activated",
        invoice
      );
    }

    /*
     * ============================================================
     * ACTIVATE / CREATE FROM SERVICE ORDER NUMBER
     * ============================================================
     */

    if (!id) {
      throw new Error(
        "Company id is required"
      );
    }

    throw new Error(
      "Invalid PUT request"
    );
  }
  catch (e: unknown) {
    console.error(e);

    return jsonError(
      e instanceof Error
        ? e.message
        : "Unknown error"
    );
  }
}