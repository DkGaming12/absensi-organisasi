import { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

export async function isAdminRequest(req: NextRequest) {
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '').trim()
  const secret = process.env.JWT_SECRET
  if (!token || !secret) return false
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret))
    return payload.role === 'admin'
  } catch {
    return false
  }
}
