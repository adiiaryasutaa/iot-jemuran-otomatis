import { type FormEvent, useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Config } from "../types";

type ConfigDraft = Omit<Config, "id" | "updated_at">;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">{title}</h3>
      {children}
    </div>
  );
}

export function ConfigPage() {
  const [draft, setDraft] = useState<ConfigDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  useEffect(() => {
    api
      .getConfig()
      .then((cfg) => {
        setDraft({
          angle_open: cfg.angle_open,
          angle_closed: cfg.angle_closed,
          debounce_ms: cfg.debounce_ms,
          rain_active: cfg.rain_active,
          led_mode: cfg.led_mode,
          led_blink_ms: cfg.led_blink_ms,
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function set<K extends keyof ConfigDraft>(key: K, value: ConfigDraft[K]) {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!draft) return;
    setSaving(true);
    try {
      await api.putConfig(draft);
      setToast({ msg: "Konfigurasi disimpan — perangkat memperbarui dalam ~60 detik", type: "ok" });
    } catch (err) {
      setToast({ msg: `Gagal: ${err instanceof Error ? err.message : "error"}`, type: "err" });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 5000);
    }
  }

  if (loading) {
    return <div className="h-40 bg-gray-100 rounded-xl animate-pulse" />;
  }

  if (!draft) {
    return <p className="text-sm text-red-600">Gagal memuat konfigurasi.</p>;
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Konfigurasi</h2>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {saving ? "Menyimpan..." : "Simpan"}
        </button>
      </div>

      {toast && (
        <div
          className={`rounded-lg px-4 py-3 text-sm border ${
            toast.type === "ok"
              ? "bg-green-50 border-green-200 text-green-700"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          {toast.msg}
        </div>
      )}

      <Section title="Servo">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Sudut Terbuka (0–180°)
            </label>
            <input
              type="number"
              min={0}
              max={180}
              value={draft.angle_open}
              onChange={(e) => set("angle_open", Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Sudut Tertutup (0–180°)
            </label>
            <input
              type="number"
              min={0}
              max={180}
              value={draft.angle_closed}
              onChange={(e) => set("angle_closed", Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </Section>

      <Section title="Sensor Hujan">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Debounce (ms)</label>
            <input
              type="number"
              min={0}
              value={draft.debounce_ms}
              onChange={(e) => set("debounce_ms", Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Durasi sinyal stabil sebelum status berubah
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-600 mb-2">Level aktif saat hujan</p>
            <div className="flex gap-4">
              {(["LOW", "HIGH"] as const).map((v) => (
                <label key={v} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="rain_active"
                    value={v}
                    checked={draft.rain_active === v}
                    onChange={() => set("rain_active", v)}
                    className="accent-blue-600"
                  />
                  <span className="text-sm text-gray-700">{v}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section title="LED Indikator">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium text-gray-600 mb-2">Mode LED saat aktif (hujan)</p>
            <div className="flex gap-4">
              {(["solid", "blink"] as const).map((v) => (
                <label key={v} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="led_mode"
                    value={v}
                    checked={draft.led_mode === v}
                    onChange={() => set("led_mode", v)}
                    className="accent-blue-600"
                  />
                  <span className="text-sm text-gray-700 capitalize">
                    {v === "solid" ? "Menyala" : "Berkedip"}
                  </span>
                </label>
              ))}
            </div>
          </div>
          {draft.led_mode === "blink" && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Kecepatan kedip: {draft.led_blink_ms} ms
              </label>
              <input
                type="range"
                min={100}
                max={5000}
                step={100}
                value={draft.led_blink_ms}
                onChange={(e) => set("led_blink_ms", Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Cepat (100 ms)</span>
                <span>Lambat (5000 ms)</span>
              </div>
            </div>
          )}
        </div>
      </Section>
    </form>
  );
}
