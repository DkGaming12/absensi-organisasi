import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { db, documentKey } from '@/lib/firebase-admin'
import { isAdminRequest } from '@/lib/admin-auth'

export async function POST(req: NextRequest) {
  if (!await isAdminRequest(req)) return NextResponse.json({ error: 'Akses admin diperlukan' }, { status: 401 })
  try {
    const { mata_kuliah_id, kelas, pertemuan, durasi_menit } = await req.json()
    if (!mata_kuliah_id || !kelas || !pertemuan) {
      return NextResponse.json({ error: 'Kegiatan, divisi, dan sesi wajib diisi' }, { status: 400 })
    }
    const store = db()
    const logId = documentKey(mata_kuliah_id, kelas, Number(pertemuan))
    const logRef = store.collection('sessionLogs').doc(logId)
    const log = await logRef.get()
    if (log.get('is_locked')) return NextResponse.json({ error: 'Sesi ini sudah ditutup oleh admin' }, { status: 403 })

    const expires_at = new Date(Date.now() + (Number(durasi_menit) || 15) * 60_000).toISOString()
    const id = randomUUID()
    const session = { id, mata_kuliah_id, kelas, pertemuan: Number(pertemuan), expires_at }
    const oldSessions = await store.collection('qrSessions').where('mata_kuliah_id', '==', mata_kuliah_id).get()
    const batch = store.batch()
    oldSessions.docs.filter(doc => doc.get('kelas') === kelas && Number(doc.get('pertemuan')) === Number(pertemuan))
      .forEach(doc => batch.delete(doc.ref))
    batch.set(store.collection('qrSessions').doc(id), session)
    batch.set(logRef, { mata_kuliah_id, kelas, pertemuan: Number(pertemuan), is_locked: false }, { merge: true })
    await batch.commit()
    return NextResponse.json({ success: true, session })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Gagal membuat QR' }, { status: 500 })
  }
}
