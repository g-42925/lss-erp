import { Resend } from 'resend'
import { createElement } from 'react'
import { randomInt } from "node:crypto"
import { NextResponse } from 'next/server'

import Otp from '@/components/otp'

export async function POST(req: Request) {
  const { currentEmail } = await req.json()

  const otp = randomInt(100000, 1000000).toString()

  const resend = new Resend(process.env.RESEND_API_KEY)

  const { data, error } = await resend.emails.send({
    from: 'noreply@lerynsoftware.com',
    to: currentEmail,
    subject: 'Reset Credential Secret Code',
    react: createElement(Otp, { code: otp }),
  })

  if (error) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    )
  }

  const response = NextResponse.json({
    success: true
  })

  response.cookies.set('otp', otp, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 300,
  })

  return response
}

