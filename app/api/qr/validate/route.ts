import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase-admin'

export async function POST(req: NextRequest) {
  try {
    const { session_id } = await req.json()
    if (!session_id) return NextResponse.json({ error: 'session_id wajib diisi' }, { status: 400 })
    const store = db()
    const snapshot = await store.collection('qrSessions').doc(String(session_id)).get()
    if (!snapshot.exists) return NextResponse.json({ error: 'QR tidak valid atau sudah dihapus' }, { status: 404 })
    const data: any = snapshot.data()
    if (Date.now() > new Date(data.expires_at).getTime()) {
      return NextResponse.json({ error: 'QR sudah kadaluarsa' }, { status: 410 })
    }
    const activity = await store.collection('activities').doc(data.mata_kuliah_id).get()
    const info: any = activity.data()
    return NextResponse.json({ valid: true, session: { ...data,
      mata_kuliah: info ? { kode: info.kode, nama: info.nama } : null } })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Firebase tidak tersedia' }, { status: 500 })
  }
}
