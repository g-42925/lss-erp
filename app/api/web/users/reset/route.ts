

import User from '@/models/User'
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

  console.log(user)

  // if (!user) {
  //   return Response.json(
  //     { error: 'User tidak ditemukan' },
  //     { status: 404 }
  //   )
  // }

  // if (user.email !== param.currentEmail) {
  //   return Response.json(
  //     { error: 'Email tidak cocok' },
  //     { status: 400 }
  //   )
  // }

  // if (user.otp !== param.otp) {
  //   return Response.json(
  //     { error: 'OTP tidak valid' },
  //     { status: 400 }
  //   )
  // }



  // const otp = randomInt(100000, 1000000).toString()

  // const resend = new Resend(process.env.RESEND_API_KEY)

  // const { data, error } = await resend.emails.send({
  //   from: 'noreply@lerynsoftware.com',
  //   to: currentEmail,
  //   subject: 'Reset Credential Secret Code',
  //   react: createElement(Otp, { code: otp }),
  // })

  // if (error) {
  //   return Response.json(
  //     { error: error.message },
  //     { status: 500 }
  //   )
  // }

  // const response = NextResponse.json({
  //   success: true
  // })

  // response.cookies.set('otp', otp, {
  //   httpOnly: true,
  //   secure: process.env.NODE_ENV === 'production',
  //   sameSite: 'strict',
  //   path: '/',
  //   maxAge: 300,
  // })

  // return Response.json({ data })
}

