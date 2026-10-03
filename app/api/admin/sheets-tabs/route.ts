import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase-admin'
import { isAdminRequest } from '@/lib/admin-auth'
import { google } from 'googleapis'
import { ACTIVE_SEMESTER } from '@/lib/config'

async function getSheets() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
      private_key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })
  return google.sheets({ version: 'v4', auth })
}

export async function GET(req: NextRequest) {
  if (!await isAdminRequest(req)) return NextResponse.json({ error: 'Akses admin diperlukan' }, { status: 401 })
  try {
    const sheets = await getSheets()

    const meta = await sheets.spreadsheets.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID!,
    })

    const tabs = meta.data.sheets
      ?.map(s => s.properties?.title ?? '')
      .filter(t => t !== 'Mahasiswa' && t !== '') // skip tab mahasiswa
      ?? []

    const activities = await db().collection('activities').get()
    const matkulList = activities.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      .filter((activity: any) => activity.semester === ACTIVE_SEMESTER)

    return NextResponse.json({ success: true, tabs, matkulList })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
