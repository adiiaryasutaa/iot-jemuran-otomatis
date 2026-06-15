import { type FormEvent, useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { Schedule } from '../types'

const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

interface ScheduleFormData {
  label: string
  action: 'open' | 'close'
  hour: number
  minute: number
  days: number[]
  is_active: boolean
}

const defaultForm = (): ScheduleFormData => ({
  label: '',
  action: 'open',
  hour: 6,
  minute: 0,
  days: [],
  is_active: true,
})

function Modal({
  title,
  form,
  setForm,
  onSubmit,
  onClose,
  saving,
}: {
  title: string
  form: ScheduleFormData
  setForm: (f: ScheduleFormData) => void
  onSubmit: (e: FormEvent) => void
  onClose: () => void
  saving: boolean
}) {
  function toggleDay(d: number) {
    setForm({
      ...form,
      days: form.days.includes(d) ? form.days.filter(x => x !== d) : [...form.days, d].sort((a, b) => a - b),
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>
        <form onSubmit={onSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Label</label>
            <input
              required
              value={form.label}
              onChange={e => setForm({ ...form, label: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="cth. Buka Pagi"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Aksi</label>
            <div className="flex gap-4">
              {(['open', 'close'] as const).map(v => (
                <label key={v} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={form.action === v}
                    onChange={() => setForm({ ...form, action: v })}
                    className="accent-blue-600"
                  />
                  <span className="text-sm text-gray-700">{v === 'open' ? 'Buka' : 'Tutup'}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Waktu (WIB)</label>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                min={0} max={23}
                value={form.hour}
                onChange={e => setForm({ ...form, hour: Number(e.target.value) })}
                className="w-16 px-3 py-2 border border-gray-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-400">:</span>
              <input
                type="number"
                min={0} max={59}
                value={form.minute}
                onChange={e => setForm({ ...form, minute: Number(e.target.value) })}
                className="w-16 px-3 py-2 border border-gray-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">
              Hari{' '}
              <span className="text-gray-400 font-normal">
                {form.days.length === 0 ? '(semua hari)' : ''}
              </span>
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {DAYS.map((day, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    form.days.includes(i)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              Kosong = berlaku setiap hari
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={form.is_active}
              onChange={e => setForm({ ...form, is_active: e.target.checked })}
              className="accent-blue-600"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700">Aktifkan jadwal</label>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function SchedulePage() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'create' | number | null>(null)
  const [form, setForm] = useState<ScheduleFormData>(defaultForm())
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    try { setSchedules(await api.getSchedules()) } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setForm(defaultForm())
    setModal('create')
  }

  function openEdit(s: Schedule) {
    setForm({ label: s.label, action: s.action, hour: s.hour, minute: s.minute, days: s.days, is_active: s.is_active })
    setModal(s.id)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      if (modal === 'create') {
        await api.postSchedule(form)
      } else if (typeof modal === 'number') {
        await api.putSchedule(modal, form)
      }
      setModal(null)
      await load()
    } catch (err) {
      alert(`Gagal menyimpan: ${err instanceof Error ? err.message : err}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Hapus jadwal ini?')) return
    try {
      await api.deleteSchedule(id)
      await load()
    } catch (err) {
      alert(`Gagal menghapus: ${err instanceof Error ? err.message : err}`)
    }
  }

  async function handleToggle(id: number) {
    try {
      const updated = await api.toggleSchedule(id)
      setSchedules(prev => prev.map(s => s.id === id ? updated : s))
    } catch (err) {
      alert(`Gagal: ${err instanceof Error ? err.message : err}`)
    }
  }

  function formatTime(h: number, m: number) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }

  function formatDays(days: number[]) {
    if (days.length === 0) return 'Setiap hari'
    return days.map(d => DAYS[d]).join(', ')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Jadwal</h2>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + Tambah
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Memuat...</div>
        ) : schedules.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">Belum ada jadwal</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {schedules.map(s => (
              <div key={s.id} className="flex items-center gap-4 px-4 py-3">
                <button
                  onClick={() => handleToggle(s.id)}
                  className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors ${
                    s.is_active ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                  role="switch"
                  aria-checked={s.is_active}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                    s.is_active ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium text-sm ${s.is_active ? 'text-gray-900' : 'text-gray-400'}`}>
                      {s.label}
                    </span>
                    <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${
                      s.action === 'open' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {s.action === 'open' ? 'Buka' : 'Tutup'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatTime(s.hour, s.minute)} · {formatDays(s.days)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(s)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal !== null && (
        <Modal
          title={modal === 'create' ? 'Tambah Jadwal' : 'Edit Jadwal'}
          form={form}
          setForm={setForm}
          onSubmit={handleSubmit}
          onClose={() => setModal(null)}
          saving={saving}
        />
      )}
    </div>
  )
}
