// app/api/auth/mahasiswa/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase-admin'
import { SignJWT } from 'jose'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)

export async function POST(req: NextRequest) {
  const { nim } = await req.json()

  if (!nim) {
    return NextResponse.json({ error: 'NIM wajib diisi' }, { status: 400 })
  }

  let member
  try {
    const snapshot = await db().collection('members').doc(nim.trim()).get()
    member = snapshot.exists ? snapshot.data() : null
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Firebase tidak tersedia'
    return NextResponse.json({ error: message }, { status: 500 })
  }

  if (!member) {
    return NextResponse.json({ error: 'ID anggota tidak ditemukan' }, { status: 401 })
  }

  const data = { nim: String(member.nim ?? nim.trim()), nama: String(member.nama ?? ''), kelas: String(member.kelas ?? '') }
  const secret = process.env.JWT_SECRET
  if (!secret) return NextResponse.json({ error: 'JWT_SECRET belum dikonfigurasi' }, { status: 500 })
  const token = await new SignJWT({ nim: data.nim, nama: data.nama, kelas: data.kelas })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(new TextEncoder().encode(secret))

  return NextResponse.json({ success: true, token, mahasiswa: data })
}
