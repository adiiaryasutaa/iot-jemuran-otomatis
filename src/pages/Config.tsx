import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "../lib/api";
import type { Config } from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type ConfigDraft = Omit<Config, "id" | "updated_at" | "mode" | "led_mode" | "led_blink_ms">;

export function ConfigPage() {
  const [draft, setDraft] = useState<ConfigDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .getConfig()
      .then((cfg) => {
        setDraft({
          angle_open: cfg.angle_open,
          angle_closed: cfg.angle_closed,
          debounce_ms: cfg.debounce_ms,
          rain_active: cfg.rain_active,
          cooldown_ms: cfg.cooldown_ms,
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
      toast.success("Konfigurasi disimpan — perangkat memperbarui dalam ~60 detik");
    } catch (err) {
      toast.error(`Gagal: ${err instanceof Error ? err.message : "error"}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="h-40 bg-muted rounded-xl animate-pulse" />;
  }

  if (!draft) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Gagal memuat konfigurasi.</AlertDescription>
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Konfigurasi</h2>
        <Button type="submit" disabled={saving}>
          {saving ? "Menyimpan..." : "Simpan"}
        </Button>
      </div>

      <Card>
        <CardContent>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Servo</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="angle_open" className="text-xs">
                Sudut Terbuka (0–180°)
              </Label>
              <Input
                id="angle_open"
                type="text"
                inputMode="numeric"
                pattern="[0-9]+"
                value={draft.angle_open}
                onChange={(e) => set("angle_open", Number(e.target.value.replace(/[^0-9]/g, "")))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="angle_closed" className="text-xs">
                Sudut Tertutup (0–180°)
              </Label>
              <Input
                id="angle_closed"
                type="text"
                inputMode="numeric"
                pattern="[0-9]+"
                value={draft.angle_closed}
                onChange={(e) => set("angle_closed", Number(e.target.value.replace(/[^0-9]/g, "")))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Sensor Hujan</h3>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="debounce_ms" className="text-xs">
                Debounce (ms)
              </Label>
              <Input
                id="debounce_ms"
                type="text"
                inputMode="numeric"
                pattern="[0-9]+"
                value={draft.debounce_ms}
                onChange={(e) => set("debounce_ms", Number(e.target.value.replace(/[^0-9]/g, "")))}
              />
              <p className="text-xs text-muted-foreground">
                Durasi sinyal stabil sebelum status berubah
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-600">Level aktif saat hujan</p>
              <RadioGroup
                value={draft.rain_active}
                onValueChange={(v) => set("rain_active", v as "LOW" | "HIGH")}
                className="flex gap-4 grid-cols-none"
              >
                {(["LOW", "HIGH"] as const).map((v) => (
                  <div key={v} className="flex items-center gap-2">
                    <RadioGroupItem value={v} id={`rain_active_${v}`} />
                    <Label htmlFor={`rain_active_${v}`} className="font-normal cursor-pointer">
                      {v}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Kontrol</h3>
          <div className="space-y-1.5">
            <Label htmlFor="cooldown_sec" className="text-xs">
              Cooldown aksi (detik)
            </Label>
            <Input
              id="cooldown_sec"
              type="text"
              inputMode="numeric"
              pattern="[0-9]+"
              value={Math.round(draft.cooldown_ms / 1000)}
              onChange={(e) =>
                set("cooldown_ms", Number(e.target.value.replace(/[^0-9]/g, "")) * 1000)
              }
            />
            <p className="text-xs text-muted-foreground">
              Jeda setelah aksi/perubahan sebelum perintah berikutnya bisa dikirim
            </p>
          </div>
        </CardContent>
      </Card>

    </form>
  );
}
