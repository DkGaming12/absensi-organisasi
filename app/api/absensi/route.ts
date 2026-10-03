import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { db, documentKey } from '@/lib/firebase-admin'
import { isAdminRequest } from '@/lib/admin-auth'
import { appendToSheet } from '@/lib/sheets'
import { nowInMakassar } from '@/lib/utils'

type Member = { nim: string; nama: string; kelas: string }

async function getMemberFromToken(req: NextRequest): Promise<Member> {
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '').trim()
  const secret = process.env.JWT_SECRET
  if (!token || !secret) throw new Error('Sesi anggota tidak valid')
  const { payload } = await jwtVerify(token, new TextEncoder().encode(secret))
  return payload as unknown as Member
}

async function recordAttendance(input: {
  nim: string; nama: string; kelas: string; mata_kuliah_id: string; pertemuan: number
}) {
  const store = db()
  const id = documentKey(input.nim, input.mata_kuliah_id, input.pertemuan)
  const ref = store.collection('attendance').doc(id)
  const { tanggal, waktu } = nowInMakassar()

  return store.runTransaction(async transaction => {
    const existing = await transaction.get(ref)
    if (existing.exists) return { alreadyExists: true as const, existing: existing.data() }
    const data = { id, ...input, tanggal, waktu, status: 'hadir' }
    transaction.create(ref, data)
    return { alreadyExists: false as const, data }
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (!body.sessionId && !await isAdminRequest(req)) {
      return NextResponse.json({ error: 'Akses admin diperlukan' }, { status: 401 })
    }
    if (body.sessionId) {
      const member = await getMemberFromToken(req)
      const store = db()
      const sessionSnapshot = await store.collection('qrSessions').doc(String(body.sessionId)).get()
      if (!sessionSnapshot.exists) return NextResponse.json({ error: 'QR tidak valid' }, { status: 404 })
      const session: any = sessionSnapshot.data()
      if (new Date(session.expires_at).getTime() < Date.now()) {
        return NextResponse.json({ error: 'QR sudah kadaluarsa' }, { status: 410 })
      }
      if (session.kelas !== member.kelas) {
        return NextResponse.json({ error: `QR ini untuk divisi ${session.kelas}, bukan ${member.kelas}` }, { status: 403 })
      }
      const activitySnapshot = await store.collection('activities').doc(session.mata_kuliah_id).get()
      const activity: any = activitySnapshot.data()
      if (!activity) return NextResponse.json({ error: 'Kegiatan tidak ditemukan' }, { status: 404 })

      const result = await recordAttendance({
        nim: member.nim, nama: member.nama, kelas: member.kelas,
        mata_kuliah_id: session.mata_kuliah_id, pertemuan: Number(session.pertemuan),
      })
      if (result.alreadyExists) {
        return NextResponse.json({
          error: 'Kamu sudah absen di sesi ini', alreadyAbsent: true,
          data: { nama: member.nama, mataKuliah: activity.nama, pertemuan: session.pertemuan,
            tanggal: result.existing?.tanggal ?? null, waktu: result.existing?.waktu ?? null,
            status: result.existing?.status ?? 'hadir' },
        }, { status: 409 })
      }

      void appendToSheet({ nama: member.nama, nim: member.nim, kelas: member.kelas,
        mataKuliah: activity.nama, pertemuan: Number(session.pertemuan) })
        .catch(err => console.error('Sheets sync error:', err))
      return NextResponse.json({ success: true, data: {
        nama: member.nama, mataKuliah: activity.nama, pertemuan: session.pertemuan,
        tanggal: result.data.tanggal, waktu: result.data.waktu,
      } })
    }

    const { nim, nama, kelas, mata_kuliah_id, pertemuan } = body
    if (!nim || !nama || !kelas || !mata_kuliah_id || !pertemuan) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
    }
    const result = await recordAttendance({ nim, nama, kelas, mata_kuliah_id, pertemuan: Number(pertemuan) })
    if (result.alreadyExists) return NextResponse.json({ error: 'Kamu sudah absen di sesi ini' }, { status: 409 })
    return NextResponse.json({ success: true, data: result.data })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan'
    const status = msg.includes('Token') || msg.includes('Sesi anggota') ? 401 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}

export async function GET(req: NextRequest) {
  try {
    const store = db()
    const { searchParams } = new URL(req.url)
    const isAdmin = searchParams.get('admin') === 'true'
    const activityId = searchParams.get('mata_kuliah_id')
    const sessionNumber = searchParams.get('pertemuan')

    if (isAdmin) {
      if (!await isAdminRequest(req)) return NextResponse.json({ error: 'Akses admin diperlukan' }, { status: 401 })
      if (activityId && sessionNumber) {
        const [membersSnap, attendanceSnap] = await Promise.all([
          store.collection('members').get(),
          store.collection('attendance').get(),
        ])
        const present = new Map<string, any>()
        attendanceSnap.docs.forEach(doc => {
          const record = doc.data()
          if (record.mata_kuliah_id === activityId && Number(record.pertemuan) === Number(sessionNumber)) {
            present.set(String(record.nim), record)
          }
        })
        const data = membersSnap.docs.map(doc => {
          const member: any = doc.data()
          const record = present.get(String(member.nim ?? doc.id))
          return { nim: member.nim ?? doc.id, nama: member.nama ?? '', kelas: member.kelas ?? '',
            hadir: record?.status === 'hadir', status: record?.status ?? 'belum', waktu: record?.waktu ?? null }
        }).sort((a, b) => String(a.nama).localeCompare(String(b.nama)))
        return NextResponse.json({ success: true, data })
      }

      const attendanceSnap = await store.collection('attendance').get()
      const activityCache = new Map<string, any>()
      const data = await Promise.all(attendanceSnap.docs.map(async doc => {
        const item: any = doc.data()
        if (activityId && item.mata_kuliah_id !== activityId) return null
        if (!activityCache.has(item.mata_kuliah_id)) {
          const activity = await store.collection('activities').doc(item.mata_kuliah_id).get()
          activityCache.set(item.mata_kuliah_id, activity.data() ?? null)
        }
        return { ...item, mata_kuliah: activityCache.get(item.mata_kuliah_id) }
      }))
      return NextResponse.json({ success: true, data: data.filter(Boolean)
        .sort((a: any, b: any) => `${b.tanggal} ${b.waktu}`.localeCompare(`${a.tanggal} ${a.waktu}`)) })
    }

    const member = await getMemberFromToken(req)
    const snapshot = await store.collection('attendance').where('nim', '==', member.nim).get()
    const data = await Promise.all(snapshot.docs.map(async doc => {
      const item: any = doc.data()
      const activity = await store.collection('activities').doc(item.mata_kuliah_id).get()
      const info: any = activity.data()
      return { ...item, mata_kuliah: info ? { kode: info.kode, nama: info.nama, semester: info.semester } : null }
    }))
    return NextResponse.json({ success: true, data: data.sort((a, b) =>
      `${b.tanggal} ${b.waktu}`.localeCompare(`${a.tanggal} ${a.waktu}`)) })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan'
    return NextResponse.json({ error: msg }, { status: msg.includes('Sesi anggota') ? 401 : 500 })
  }
}
