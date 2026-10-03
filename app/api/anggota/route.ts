import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase-admin'
import { isAdminRequest } from '@/lib/admin-auth'

export async function GET(req: NextRequest) {
  if (!await isAdminRequest(req)) return NextResponse.json({ error: 'Akses admin diperlukan' }, { status: 401 })
  try {
    const snapshot = await db().collection('members').get()
    const data = snapshot.docs.map(doc => ({ nim: doc.id, ...doc.data() }))
      .sort((a: any, b: any) => String(a.nama).localeCompare(String(b.nama)))
    return NextResponse.json({ data })
  } catch (err) { return NextResponse.json({ error: err instanceof Error ? err.message : 'Firebase tidak tersedia' }, { status: 500 }) }
}

export async function POST(req: NextRequest) {
  if (!await isAdminRequest(req)) return NextResponse.json({ error: 'Akses admin diperlukan' }, { status: 401 })
  try {
    const { nim, nama, kelas } = await req.json()
    const id = String(nim ?? '').trim()
    if (!id || !String(nama ?? '').trim() || !String(kelas ?? '').trim()) {
      return NextResponse.json({ error: 'ID anggota, nama, dan divisi wajib diisi' }, { status: 400 })
    }
    const ref = db().collection('members').doc(id)
    if ((await ref.get()).exists) return NextResponse.json({ error: 'ID anggota sudah digunakan' }, { status: 409 })
    const data = { nim: id, nama: String(nama).trim(), kelas: String(kelas).trim() }
    await ref.set(data)
    return NextResponse.json({ success: true, data })
  } catch (err) { return NextResponse.json({ error: err instanceof Error ? err.message : 'Firebase tidak tersedia' }, { status: 500 }) }
}

export async function DELETE(req: NextRequest) {
  if (!await isAdminRequest(req)) return NextResponse.json({ error: 'Akses admin diperlukan' }, { status: 401 })
  try {
    const { nim } = await req.json()
    if (!nim) return NextResponse.json({ error: 'ID anggota wajib diisi' }, { status: 400 })
    await db().collection('members').doc(String(nim)).delete()
    return NextResponse.json({ success: true })
  } catch (err) { return NextResponse.json({ error: err instanceof Error ? err.message : 'Firebase tidak tersedia' }, { status: 500 }) }
}
