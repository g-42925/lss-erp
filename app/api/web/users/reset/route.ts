

import User from '@/models/User'
import CryptoJS from "crypto-js";

import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const param = await req.json()

  const cookieOtp = req.cookies.get('otp')

  if (param.otp !== cookieOtp.value) {
    return Response.json(
      { error: 'OTP tidak valid' },
      { status: 400 }
    )
  }

  const keys = Object.keys(param)

  const newCredential: Record<string, string> = {}

  if (keys.includes('newEmail')) {
    newCredential['email'] = param.newEmail
  }

  if (keys.includes('newPassword')) {
    newCredential['password'] = CryptoJS.MD5(param.newPassword).toString()

  }

  if (keys.includes('newName')) {
    newCredential['name'] = param.newName
  }


  const user = await User.findOne({ email: param.currentEmail }).lean().select([
    '_id',
    'email',
    'name',
    'masterAccountId',
    'role',
    'roleId',
    'locationId',
    'isSuperAdmin',
  ])

  await User.findByIdAndUpdate(user._id, {
    ...newCredential
  })

  return NextResponse.json({
    message: 'User updated successfully',
  })
}

