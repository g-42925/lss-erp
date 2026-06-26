import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

import Companie from '@/models/Companie'
import Assignment from '@/models/Assignment'
import User from '@/models/User'
import CryptoJS from "crypto-js";

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase()
    const params = await request.json()
    const password = params.password
    const pwd = CryptoJS.MD5(password)
    const _pages: Record<string, string[]> = {}

    const r = await User.findOne({
      email: params.email,
      password: pwd.toString()
    })

    const company = await Companie.findOne({
      masterAccountId: r.masterAccountId
    })

    if (r) {
      if (!r.isSuperAdmin) {
        const pages = await Assignment.find({
          roleId: r.roleId
        })

        pages.forEach((page) => {
          _pages[page.link] = page.permissions || ['view']
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
        ...r._doc,
        pages: _pages,
        company: company
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
