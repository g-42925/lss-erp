import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

import Assignment from '@/models/Assignment'
import Role from '@/models/Role'
import User from '@/models/User'
import CryptoJS from "crypto-js";

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase()
    const params = await request.json()
    const password = params.password
    const pwd = CryptoJS.MD5(password)
    const _pages: string[] = []

    let permission = ''

    const r = await User.findOne({
      email: params.email,
      password: pwd.toString()
    })

    if (r) {
      if (!r.isSuperAdmin) {
        const role = await Role.findOne({ _id: r.roleId })
        permission = role.permission

        const pages = await Assignment.find({
          roleId: r.roleId
        })

        pages.map((page) => {
          _pages.push(page.link)
        })
      }
    }





    if (!r) {
      return NextResponse.json({
        noResult: true,
        message: "no account found",
        result: null
      });
    }


    return NextResponse.json({
      noResult: false,
      message: "",
      result: {
        ...r,
        pages: _pages,
        permission,
      }
    });

  }
  catch (e: any) {
    console.log(e)
    return NextResponse.json(
      {
        noResult: true,
        message: e.message,
        result: null
      }
    )
  }
}
