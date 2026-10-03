import { NextRequest, NextResponse } from 'next/server'
import { db, documentKey } from '@/lib/firebase-admin'
import { isAdminRequest } from '@/lib/admin-auth'

export async function POST(req: NextRequest) {
  if (!await isAdminRequest(req)) return NextResponse.json({ error: 'Akses admin diperlukan' }, { status: 401 })
  try {
    const { mata_kuliah_id, kelas, pertemuan, is_locked } = await req.json()
    if (!mata_kuliah_id || !kelas || !pertemuan) {
      return NextResponse.json({ error: 'Kegiatan, divisi, dan sesi wajib diisi' }, { status: 400 })
    }
    const store = db()
    const batch = store.batch()
    const logRef = store.collection('sessionLogs').doc(documentKey(mata_kuliah_id, kelas, Number(pertemuan)))
    batch.set(logRef, { mata_kuliah_id, kelas, pertemuan: Number(pertemuan), is_locked: Boolean(is_locked) }, { merge: true })
    if (is_locked) {
      const sessions = await store.collection('qrSessions').where('mata_kuliah_id', '==', mata_kuliah_id).get()
      sessions.docs.filter(doc => doc.get('kelas') === kelas && Number(doc.get('pertemuan')) === Number(pertemuan))
        .forEach(doc => batch.delete(doc.ref))
    }
    await batch.commit()
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Gagal memperbarui sesi' }, { status: 500 })
  }
}
