import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { db } from '@/lib/firebase-admin'
import { isAdminRequest } from '@/lib/admin-auth'

export async function GET(req: NextRequest) {
  try {
    const activityId = new URL(req.url).searchParams.get('mata_kuliah_id')
    const snapshot = await db().collection('tasks').get()
    const data = await Promise.all(snapshot.docs.map(async doc => {
      const task: any = doc.data()
      if (activityId && task.mata_kuliah_id !== activityId) return null
      const activity = await db().collection('activities').doc(task.mata_kuliah_id).get()
      const info: any = activity.data()
      return { ...task, mata_kuliah: info ? { kode: info.kode, nama: info.nama } : null }
    }))
    return NextResponse.json({ data: data.filter(Boolean).sort((a: any, b: any) => String(a.deadline).localeCompare(String(b.deadline))) })
  } catch (err) { return NextResponse.json({ error: err instanceof Error ? err.message : 'Firebase tidak tersedia' }, { status: 500 }) }
}

export async function POST(req: NextRequest) {
  if (!await isAdminRequest(req)) return NextResponse.json({ error: 'Akses admin diperlukan' }, { status: 401 })
  try {
    const { mata_kuliah_id, judul, deskripsi, deadline } = await req.json()
    if (!mata_kuliah_id || !judul || !deadline) return NextResponse.json({ error: 'Kegiatan, judul, dan deadline wajib diisi' }, { status: 400 })
    const id = randomUUID()
    const data = { id, mata_kuliah_id, judul, deskripsi: deskripsi ?? '', deadline }
    await db().collection('tasks').doc(id).set(data)
    return NextResponse.json({ success: true, data })
  } catch (err) { return NextResponse.json({ error: err instanceof Error ? err.message : 'Firebase tidak tersedia' }, { status: 500 }) }
}

export async function DELETE(req: NextRequest) {
  if (!await isAdminRequest(req)) return NextResponse.json({ error: 'Akses admin diperlukan' }, { status: 401 })
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'ID wajib diisi' }, { status: 400 })
    await db().collection('tasks').doc(String(id)).delete()
    return NextResponse.json({ success: true })
  } catch (err) { return NextResponse.json({ error: err instanceof Error ? err.message : 'Firebase tidak tersedia' }, { status: 500 }) }
}
