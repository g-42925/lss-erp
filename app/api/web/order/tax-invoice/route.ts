/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Order from "@/models/Order";
import User from "@/models/User";

export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { orderId, taxInvoiceNumber, approvalCode } = body;

    if (!orderId) throw new Error("Order ID is required");
    if (!taxInvoiceNumber) throw new Error("Tax invoice number is required");

    if (approvalCode) {
      const user = await User.findOne({approvalCode});
      if (!user) throw new Error("Invalid approval code");
      const updatedOrder = await Order.findByIdAndUpdate(
        orderId,
        { taxInvoiceNumber: taxInvoiceNumber || "" },
        { new: true }
      );

      if (!updatedOrder) throw new Error("Order not found");

      return NextResponse.json({
        noResult: false,
        message: "Tax invoice number updated successfully",
        result: updatedOrder,
        error: false,
      });
    }
    else {
      const updatedOrder = await Order.findByIdAndUpdate(
        orderId,
        { taxInvoiceNumber: taxInvoiceNumber || "" },
        { new: true }
      );

      if (!updatedOrder) throw new Error("Order not found");

      return NextResponse.json({
        noResult: false,
        message: "Tax invoice number updated successfully",
        result: updatedOrder,
        error: false,
      });
    }
  }
  catch (e: any) {
    return NextResponse.json({
      noResult: true,
      message: e.message,
      result: null,
      error: true,
    });
  }
}
