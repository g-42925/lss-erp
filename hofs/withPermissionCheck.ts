import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export default function withPermissionCheck(handler: any) {
  return async (req: any) => {
    const cookieStore = await cookies()
    const permission = cookieStore.get('permission')
    const _permission = permission?.value

    if (_permission != 'rw') {
      return NextResponse.json(
        { message: 'Forbidden' },
        { status: 403 }
      )
    }
    else {
      return handler(req)
    }
  }
}

