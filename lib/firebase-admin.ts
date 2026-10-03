import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

let firestore: ReturnType<typeof getFirestore> | undefined

/** Lazily initialize Admin SDK so public pages can load before env is configured. */
export function db() {
  if (firestore) return firestore

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const credential = clientEmail && privateKey
    ? cert({ projectId, clientEmail, privateKey })
    : applicationDefault()

  const app = getApps()[0] ?? initializeApp({
    credential,
    projectId,
  })
  firestore = getFirestore(app)
  return firestore
}

export function documentKey(...parts: (string | number)[]) {
  return Buffer.from(parts.join('|')).toString('base64url')
}
