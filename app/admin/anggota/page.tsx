'use client'
import { useCallback, useEffect, useState } from 'react'
import { Plus, Trash2, Users } from 'lucide-react'
import Spinner from '@/components/Spinner'
import { pressProps } from '@/components/pressProps'
import { adminFetch } from '@/lib/api'

type Member = { nim: string; nama: string; kelas: string }

export default function AdminAnggotaPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [nim, setNim] = useState('')
  const [nama, setNama] = useState('')
  const [kelas, setKelas] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminFetch('/api/anggota')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal memuat anggota')
      setMembers(json.data ?? [])
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tidak dapat memuat anggota')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  async function addMember(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await adminFetch('/api/anggota', {
        method: 'POST', body: JSON.stringify({ nim, nama, kelas }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal menambahkan anggota')
      setNim(''); setNama(''); setKelas('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tidak dapat menyimpan anggota')
    } finally { setSaving(false) }
  }

  async function deleteMember(member: Member) {
    if (!confirm(`Hapus ${member.nama} dari daftar anggota?`)) return
    const res = await adminFetch('/api/anggota', { method: 'DELETE', body: JSON.stringify({ nim: member.nim }) })
    const json = await res.json()
    if (!res.ok) { setError(json.error || 'Gagal menghapus anggota'); return }
    await load()
  }

  const inputClass = 'w-full px-3 py-2.5 rounded-xl text-sm outline-none'
  const inputStyle = { background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }

  return <div className="max-w-3xl space-y-4">
    <div>
      <h2 className="text-lg font-bold">Anggota Organisasi</h2>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Data anggota tersimpan di Firebase Firestore.</p>
    </div>

    <form onSubmit={addMember} className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <p className="text-sm font-semibold">Tambah anggota</p>
      <div className="grid sm:grid-cols-3 gap-3">
        <input className={inputClass} style={inputStyle} value={nim} onChange={e => setNim(e.target.value)} placeholder="ID Anggota" required />
        <input className={inputClass} style={inputStyle} value={nama} onChange={e => setNama(e.target.value)} placeholder="Nama lengkap" required />
        <input className={inputClass} style={inputStyle} value={kelas} onChange={e => setKelas(e.target.value)} placeholder="Divisi / kelompok" required />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button type="submit" disabled={saving} {...pressProps} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold" style={{ background: 'var(--accent)', color: 'white' }}>
        <Plus size={16} /> {saving ? 'Menyimpan...' : 'Simpan anggota'}
      </button>
    </form>

    <div className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex justify-between items-center mb-3">
        <p className="text-sm font-semibold">Daftar anggota <span style={{ color: 'var(--text-muted)' }}>({members.length})</span></p>
      </div>
      {loading ? <Spinner /> : members.length === 0 ? (
        <div className="text-center py-10">
          <Users size={34} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Belum ada anggota. Tambahkan anggota pertama di atas.</p>
        </div>
      ) : <div className="space-y-2">
        {members.map(member => <div key={member.nim} className="flex items-center justify-between gap-3 rounded-xl px-3 py-3" style={{ background: 'var(--surface2)' }}>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{member.nama}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>ID {member.nim} · {member.kelas}</p>
          </div>
          <button type="button" aria-label={`Hapus ${member.nama}`} onClick={() => deleteMember(member)} {...pressProps} className="p-2 rounded-lg" style={{ color: '#ef4444' }}><Trash2 size={16} /></button>
        </div>)}
      </div>}
    </div>
  </div>
}
