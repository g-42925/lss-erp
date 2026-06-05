import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";


import WorkOrder from "@/models/WorkOrder"
import User from "@/models/User";
import Role from "@/models/Role";

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase()
    const body = await request.formData()

    const taskName = body.get("taskName") as string
    const description = body.get("description") as string
    const startTime = body.get("startTime") as string
    const endTime = body.get("endTime") as string
    const attachment = body.get("attachment") as File
    const assignedTo = body.get("assignedTo") as string

    const email = body.get("email") as string
    const masterAccountId = body.get("masterAccountId") as string

    const user = await User.findOne({ email })
    const role = await Role.findOne({ _id: user.roleId })
    const roleName = user.isSuperAdmin ? "Super Admin" : role.name

    if (attachment) {
      const fileName = (body.get("attachmentName") as string) ?? attachment.name;
      const buffer = Buffer.from(await attachment.arrayBuffer());

      const s3 = new S3Client({
        region: "us-east-1",
        endpoint: "https://s3.filebase.com",
        credentials: {
          accessKeyId: "B8F0135956143AE0685E",
          secretAccessKey: "gKrbIZJnzLWBXZ0VGQvnlAumvngpBH35PsXN5zUp",
        },
      });

      const putCommand = new PutObjectCommand({
        Bucket: "leryn-storage",
        Key: fileName,
        Body: buffer,
        ContentType: attachment.type,
        Metadata: {
          cid: "true", // 👈 sama seperti PHP
        },
      });

      await s3.send(putCommand);

      const head = await s3.send(
        new HeadObjectCommand({
          Bucket: "leryn-storage",
          Key: fileName,
        })
      );

      const cid = head.Metadata?.cid;

      const attachmentUrl = `https://wooden-plum-woodpecker.myfilebase.com/ipfs/${cid}`;

      const result = await WorkOrder.create({
        taskName,
        description,
        startTime,
        endTime,
        attachment: attachmentUrl,
        assignedTo,
        status: "Pending",
        addedOn: new Date(),
        requestedBy: `${roleName} ${user.name}`,
        masterAccountId: masterAccountId || user.masterAccountId,
      })

      return NextResponse.json(
        {
          noResult: false,
          message: "Work order created successfully",
          result: result,
          error: false
        }
      )
    }
    else {
      const result = await WorkOrder.create({
        taskName,
        description,
        startTime,
        endTime,
        assignedTo,
        status: "Pending",
        addedOn: new Date(),
        requestedBy: user ? `${roleName} ${user.name}` : "Unknown",
        masterAccountId: masterAccountId || (user ? user.masterAccountId : "unknown"),
      })

      return NextResponse.json({
        noResult: false,
        message: "Work order created successfully",
        result: result,
        error: false
      })
    }


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
  try {
    await connectToDatabase()

    const workOrders = await WorkOrder.find({
      masterAccountId: id
    }).sort({ addedOn: -1 })

    return NextResponse.json(
      {
        noResult: false,
        message: "",
        result: workOrders,
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
    await connectToDatabase()
    const body = await request.formData()

    const id = body.get("id") as string
    const taskName = body.get("taskName") as string
    const description = body.get("description") as string
    const startTime = body.get("startTime") as string
    const endTime = body.get("endTime") as string
    const attachment = body.get("attachment") as File
    const assignedTo = body.get("assignedTo") as string
    const status = body.get("status") as string

    if (!id) {
        return NextResponse.json({
            noResult: true,
            message: "Work Order ID is required",
            result: null,
            error: true
        })
    }

    const updateData: any = {
      taskName,
      description,
      startTime,
      endTime,
      assignedTo,
    };

    if (status) {
      updateData.status = status;
    }

    if (attachment && attachment.size > 0 && attachment.name !== "undefined") {
      const fileName = (body.get("attachmentName") as string) ?? attachment.name;
      const buffer = Buffer.from(await attachment.arrayBuffer());

      const s3 = new S3Client({
        region: "us-east-1",
        endpoint: "https://s3.filebase.com",
        credentials: {
          accessKeyId: "B8F0135956143AE0685E",
          secretAccessKey: "gKrbIZJnzLWBXZ0VGQvnlAumvngpBH35PsXN5zUp",
        },
      });

      const putCommand = new PutObjectCommand({
        Bucket: "leryn-storage",
        Key: fileName,
        Body: buffer,
        ContentType: attachment.type,
        Metadata: {
          cid: "true",
        },
      });

      await s3.send(putCommand);

      const head = await s3.send(
        new HeadObjectCommand({
          Bucket: "leryn-storage",
          Key: fileName,
        })
      );

      const cid = head.Metadata?.cid;
      updateData.attachment = `https://wooden-plum-woodpecker.myfilebase.com/ipfs/${cid}`;
    }

    const result = await WorkOrder.findByIdAndUpdate(id, updateData, { new: true })

    return NextResponse.json({
      noResult: false,
      message: "Work order updated successfully",
      result: result,
      error: false
    })

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

