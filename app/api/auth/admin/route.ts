import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase-admin'
import { hashPassword, verifyPassword } from '@/lib/password'
import { SignJWT } from 'jose'

export async function POST(req: NextRequest) {
  const { username, password } = await req.json()

  if (!username || !password) {
    return NextResponse.json({ error: 'Username dan password wajib diisi' }, { status: 400 })
  }

  try {
    const admins = db().collection('admins')
    const doc = admins.doc(String(username).trim().toLowerCase())
    const snapshot = await doc.get()
    const record = snapshot.data()
    let valid = !!record?.passwordHash && verifyPassword(String(password), String(record.passwordHash))

    // Optional one-time bootstrap from existing env credentials. The password is
    // immediately stored as a scrypt hash in Firestore.
    if (!valid && !snapshot.exists && process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD
      && username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
      const nama = process.env.ADMIN_NAMA || String(username)
      await doc.set({ username: String(username), nama, passwordHash: hashPassword(String(password)), role: 'admin' })
      valid = true
    }

    if (!valid) return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 })
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) return NextResponse.json({ error: 'JWT_SECRET belum dikonfigurasi' }, { status: 500 })
    const admin = { username: String(record?.username ?? username), nama: String(record?.nama ?? process.env.ADMIN_NAMA ?? username), role: 'admin' as const }
    const token = await new SignJWT(admin).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('7d')
      .sign(new TextEncoder().encode(jwtSecret))
    return NextResponse.json({
      success: true,
      admin,
      token,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Firebase tidak tersedia'
    return NextResponse.json({ error: message }, { status: 500 })
  }

}
