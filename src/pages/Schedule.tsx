import { type FormEvent, useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Schedule } from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const DAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

interface ScheduleFormData {
  label: string;
  action: "open" | "close";
  hour: number;
  minute: number;
  days: number[];
  is_active: boolean;
}

const defaultForm = (): ScheduleFormData => ({
  label: "",
  action: "open",
  hour: 6,
  minute: 0,
  days: [],
  is_active: true,
});

function ScheduleModal({
  form,
  setForm,
  onSubmit,
  onClose,
  saving,
}: {
  form: ScheduleFormData;
  setForm: (f: ScheduleFormData) => void;
  onSubmit: (e: FormEvent) => void;
  onClose: () => void;
  saving: boolean;
}) {
  function toggleDay(d: number) {
    setForm({
      ...form,
      days: form.days.includes(d)
        ? form.days.filter((x) => x !== d)
        : [...form.days, d].sort((a, b) => a - b),
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="label" className="text-xs">
          Label
        </Label>
        <Input
          id="label"
          required
          value={form.label}
          onChange={(e) => setForm({ ...form, label: e.target.value })}
          placeholder="cth. Buka Pagi"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Aksi</Label>
        <RadioGroup
          value={form.action}
          onValueChange={(v) => setForm({ ...form, action: v as "open" | "close" })}
          className="flex gap-4 grid-cols-none"
        >
          {(["open", "close"] as const).map((v) => (
            <div key={v} className="flex items-center gap-2">
              <RadioGroupItem value={v} id={`action_${v}`} />
              <Label htmlFor={`action_${v}`} className="font-normal cursor-pointer">
                {v === "open" ? "Buka" : "Tutup"}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Waktu (WITA)</Label>
        <div className="flex gap-2 items-center">
          <Input
            type="number"
            min={0}
            max={23}
            value={form.hour}
            onChange={(e) => setForm({ ...form, hour: Number(e.target.value) })}
            className="w-16 text-center"
          />
          <span className="text-muted-foreground">:</span>
          <Input
            type="number"
            min={0}
            max={59}
            value={form.minute}
            onChange={(e) => setForm({ ...form, minute: Number(e.target.value) })}
            className="w-16 text-center"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">
          Hari{" "}
          <span className="text-muted-foreground font-normal">
            {form.days.length === 0 ? "(semua hari)" : ""}
          </span>
        </Label>
        <div className="flex gap-1.5 flex-wrap">
          {DAYS.map((day, i) => (
            <button
              key={i}
              type="button"
              onClick={() => toggleDay(i)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                form.days.includes(i)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {day}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Kosong = berlaku setiap hari</p>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="is_active"
          checked={form.is_active}
          onCheckedChange={(checked) => setForm({ ...form, is_active: checked as boolean })}
        />
        <Label htmlFor="is_active" className="font-normal cursor-pointer">
          Aktifkan jadwal
        </Label>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onClose} className="flex-1">
          Batal
        </Button>
        <Button type="submit" disabled={saving} className="flex-1">
          {saving ? "Menyimpan..." : "Simpan"}
        </Button>
      </div>
    </form>
  );
}

export function SchedulePage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"create" | number | null>(null);
  const [form, setForm] = useState<ScheduleFormData>(defaultForm());
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "error" | "success" } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  function showToast(msg: string, type: "error" | "success" = "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  async function load() {
    setLoading(true);
    try {
      setSchedules(await api.getSchedules());
    } catch {
      /* ignore */
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setForm(defaultForm());
    setModal("create");
  }

  function openEdit(s: Schedule) {
    setForm({
      label: s.label,
      action: s.action,
      hour: s.hour,
      minute: s.minute,
      days: s.days,
      is_active: s.is_active,
    });
    setModal(s.id);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal === "create") {
        await api.postSchedule(form);
      } else if (typeof modal === "number") {
        await api.putSchedule(modal, form);
      }
      setModal(null);
      await load();
    } catch (err) {
      showToast(`Gagal menyimpan: ${err instanceof Error ? err.message : err}`);
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(id: number) {
    setConfirmDeleteId(id);
  }

  async function executeDelete() {
    if (confirmDeleteId === null) return;
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    try {
      await api.deleteSchedule(id);
      await load();
    } catch (err) {
      showToast(`Gagal menghapus: ${err instanceof Error ? err.message : err}`);
    }
  }

  async function handleToggle(id: number) {
    try {
      const updated = await api.toggleSchedule(id);
      setSchedules((prev) => prev.map((s) => (s.id === id ? updated : s)));
    } catch (err) {
      showToast(`Gagal: ${err instanceof Error ? err.message : err}`);
    }
  }

  function formatTime(h: number, m: number) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  function formatDays(days: number[]) {
    if (days.length === 0) return "Setiap hari";
    return days.map((d) => DAYS[d]).join(", ");
  }

  return (
    <div className="space-y-4">
      {confirmDeleteId !== null && (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>Hapus jadwal ini?</span>
            <div className="flex gap-2 shrink-0">
              <Button
                size="xs"
                onClick={executeDelete}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Ya, Hapus
              </Button>
              <Button size="xs" variant="outline" onClick={() => setConfirmDeleteId(null)}>
                Batal
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {toast && (
        <Alert variant={toast.type === "error" ? "destructive" : "default"}>
          <AlertDescription>{toast.msg}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Jadwal</h2>
        <Button onClick={openCreate}>+ Tambah</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="h-[480px] flex items-center justify-center text-sm text-muted-foreground">
              Memuat...
            </div>
          ) : schedules.length === 0 ? (
            <div className="h-[480px] flex items-center justify-center text-sm text-muted-foreground">
              Belum ada jadwal
            </div>
          ) : (
            <div className="h-[480px] overflow-y-auto [&>[data-slot=table-container]]:overflow-x-visible">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card">
                  <TableRow>
                    <TableHead className="w-12">Aktif</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead>Tindakan</TableHead>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Hari</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.map((s) => (
                    <TableRow key={s.id} className={s.is_active ? "" : "opacity-50"}>
                      <TableCell>
                        <Switch checked={s.is_active} onCheckedChange={() => handleToggle(s.id)} />
                      </TableCell>
                      <TableCell className="font-medium">{s.label}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            s.action === "open"
                              ? "bg-green-100 text-green-700 border-transparent"
                              : "bg-red-100 text-red-700 border-transparent"
                          }
                        >
                          {s.action === "open" ? "Buka" : "Tutup"}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatTime(s.hour, s.minute)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {formatDays(s.days)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-3 justify-end">
                          <Button
                            variant="link"
                            size="xs"
                            onClick={() => openEdit(s)}
                            className="text-xs text-blue-600 h-auto p-0"
                          >
                            Edit
                          </Button>
                          <Button
                            variant="link"
                            size="xs"
                            onClick={() => handleDelete(s.id)}
                            className="text-xs text-red-500 h-auto p-0"
                          >
                            Hapus
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={modal !== null}
        onOpenChange={(open) => {
          if (!open) setModal(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{modal === "create" ? "Tambah Jadwal" : "Edit Jadwal"}</DialogTitle>
          </DialogHeader>
          <ScheduleModal
            form={form}
            setForm={setForm}
            onSubmit={handleSubmit}
            onClose={() => setModal(null)}
            saving={saving}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
