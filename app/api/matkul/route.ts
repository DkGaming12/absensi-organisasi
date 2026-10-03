import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase-admin'
import { ACTIVE_SEMESTER } from '@/lib/config'
import { randomUUID } from 'node:crypto'
import { isAdminRequest } from '@/lib/admin-auth'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const showAll = searchParams.get('all') === 'true'

  try {
    const snapshot = await db().collection('activities').get()
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      .filter((item: any) => showAll || item.semester === ACTIVE_SEMESTER)
      .sort((a: any, b: any) => String(a.kode).localeCompare(String(b.kode)))
    return Response.json({ data })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Firebase tidak tersedia' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!await isAdminRequest(req)) return NextResponse.json({ error: 'Akses admin diperlukan' }, { status: 401 })
  const { kode, nama, dosen, semester } = await req.json()

  if (!kode || !nama) {
    return NextResponse.json({ error: 'Kode dan nama wajib diisi' }, { status: 400 })
  }

  try {
    const id = randomUUID()
    const data = {
      id,
      kode: kode.trim().toUpperCase(),
      nama: nama.trim(),
      dosen: dosen?.trim() || null,
      semester: semester?.trim() || ACTIVE_SEMESTER,
    }
    await db().collection('activities').doc(id).set(data)
    return NextResponse.json({ success: true, data })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Firebase tidak tersedia' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  if (!await isAdminRequest(req)) return NextResponse.json({ error: 'Akses admin diperlukan' }, { status: 401 })
  const { id } = await req.json()

  if (!id) return NextResponse.json({ error: 'ID wajib diisi' }, { status: 400 })

  try {
    await db().collection('activities').doc(String(id)).delete()
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Firebase tidak tersedia' }, { status: 500 })
  }
}
