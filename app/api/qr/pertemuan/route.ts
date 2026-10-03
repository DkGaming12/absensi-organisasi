import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase-admin'
import { isAdminRequest } from '@/lib/admin-auth'

export async function GET(req: NextRequest) {
  if (!await isAdminRequest(req)) return NextResponse.json({ error: 'Akses admin diperlukan' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const activityId = searchParams.get('mata_kuliah_id')
  const division = searchParams.get('kelas')
  if (!activityId || !division) return NextResponse.json({ error: 'Kegiatan dan divisi wajib diisi' }, { status: 400 })
  try {
    const store = db()
    const [logsSnapshot, attendanceSnapshot] = await Promise.all([
      store.collection('sessionLogs').where('mata_kuliah_id', '==', activityId).get(),
      store.collection('attendance').where('mata_kuliah_id', '==', activityId).get(),
    ])
    const counts: Record<number, number> = {}
    attendanceSnapshot.docs.forEach(doc => {
      const item: any = doc.data()
      if (item.kelas === division) counts[Number(item.pertemuan)] = (counts[Number(item.pertemuan)] ?? 0) + 1
    })
    const data = logsSnapshot.docs.map(doc => doc.data())
      .filter((log: any) => log.kelas === division)
      .sort((a: any, b: any) => Number(a.pertemuan) - Number(b.pertemuan))
      .map((log: any) => ({ pertemuan: log.pertemuan, is_locked: log.is_locked, jumlah_absensi: counts[log.pertemuan] ?? 0 }))
    return NextResponse.json({ success: true, data })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Firebase tidak tersedia' }, { status: 500 })
  }
}
