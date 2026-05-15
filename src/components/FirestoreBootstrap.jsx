import { useEffect, useState } from 'react'
import { ensureHierarchySeeded } from '../lib/hierarchySnapshot.js'
import { getFirestoreSyncError, isFirestoreEnabled, startFirestoreSync } from '../lib/firestoreSync.js'
import { hasFirebaseConfig } from '../lib/firebase.js'

/** Starts Firestore real-time sync when Firebase env is configured. */
export default function FirestoreBootstrap() {
  const [syncErr, setSyncErr] = useState(null)

  useEffect(() => {
    if (!hasFirebaseConfig()) {
      setSyncErr('Firebase .env missing — VITE_FIREBASE_* variables add karein.')
      return
    }
    if (!isFirestoreEnabled()) return

    let cancelled = false
    const run = () => {
      if (cancelled) return
      try {
        ensureHierarchySeeded()
        startFirestoreSync()
      } catch (e) {
        console.error('[Firestore] bootstrap', e)
        setSyncErr(e?.message || String(e))
      }
    }

    const id = window.requestAnimationFrame(run)

    const onChange = () => setSyncErr(getFirestoreSyncError())
    window.addEventListener('crown-hierarchy-demo-changed', onChange)
    return () => {
      cancelled = true
      window.cancelAnimationFrame(id)
      window.removeEventListener('crown-hierarchy-demo-changed', onChange)
    }
  }, [])

  if (!syncErr) return null

  return (
    <div className="crown-firestore-banner" role="alert">
      Firestore: {syncErr}
    </div>
  )
}
