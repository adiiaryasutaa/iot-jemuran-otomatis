import { type ColumnDef } from "@tanstack/react-table";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { api } from "../lib/api";
import type { Schedule } from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";

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

function formatTime(h: number, m: number) {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatDays(days: number[]) {
  if (days.length === 0) return "Setiap hari";
  return days.map((d) => DAYS[d]).join(", ");
}

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
              className={`cursor-pointer px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"create" | number | null>(null);

  const filterAction = searchParams.get("action") ?? "";
  const filterStatus = searchParams.get("status") ?? "";

  function setParams(updates: Record<string, string | null>) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === "") next.delete(k);
        else next.set(k, v);
      }
      return next;
    }, { replace: true });
  }

  const filteredSchedules = useMemo(
    () =>
      schedules.filter(
        (s) =>
          (!filterAction || s.action === filterAction) &&
          (!filterStatus ||
            (filterStatus === "active" ? s.is_active : !s.is_active)),
      ),
    [schedules, filterAction, filterStatus],
  );

  const hasActiveFilter = filterAction || filterStatus;
  const [form, setForm] = useState<ScheduleFormData>(defaultForm());
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

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
      toast.error(`Gagal menyimpan: ${err instanceof Error ? err.message : err}`);
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
      toast.error(`Gagal menghapus: ${err instanceof Error ? err.message : err}`);
    }
  }

  async function handleToggle(id: number) {
    try {
      const updated = await api.toggleSchedule(id);
      setSchedules((prev) => prev.map((s) => (s.id === id ? updated : s)));
    } catch (err) {
      toast.error(`Gagal: ${err instanceof Error ? err.message : err}`);
    }
  }

  const columns = useMemo<ColumnDef<Schedule>[]>(
    () => [
      {
        accessorKey: "label",
        header: "Label",
        cell: ({ row }) => <span className="font-medium">{row.original.label}</span>,
        enableSorting: true,
      },
      {
        id: "action",
        header: "Tindakan",
        cell: ({ row }) => (
          <Badge
            className={
              row.original.action === "open"
                ? "bg-green-100 text-green-700 border-transparent"
                : "bg-red-100 text-red-700 border-transparent"
            }
          >
            {row.original.action === "open" ? "Buka" : "Tutup"}
          </Badge>
        ),
        enableSorting: false,
      },
      {
        id: "time",
        header: "Waktu",
        cell: ({ row }) => (
          <span className="whitespace-nowrap">
            {formatTime(row.original.hour, row.original.minute)}
          </span>
        ),
        sortingFn: (a, b) =>
          a.original.hour * 60 + a.original.minute - (b.original.hour * 60 + b.original.minute),
        enableSorting: true,
      },
      {
        id: "days",
        header: "Hari",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-xs">{formatDays(row.original.days)}</span>
        ),
        enableSorting: false,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex gap-3 justify-end">
            <Button
              variant="link"
              size="xs"
              onClick={() => openEdit(row.original)}
              className="text-xs text-blue-600 h-auto p-0"
            >
              Edit
            </Button>
            <Button
              variant="link"
              size="xs"
              onClick={() => handleDelete(row.original.id)}
              className="text-xs text-red-500 h-auto p-0"
            >
              Hapus
            </Button>
          </div>
        ),
        enableSorting: false,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

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

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Jadwal</h2>
        <Button size="sm" onClick={openCreate}>Tambah Jadwal</Button>
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        <Select
          value={filterAction || "_all"}
          onValueChange={(v) => setParams({ action: v != null && v !== "_all" ? v : null })}
        >
          <SelectTrigger size="sm" className="w-auto">
            <SelectValue>{(v) => ({ _all: "Semua Tindakan", open: "Buka", close: "Tutup" }[v as string] ?? "Semua Tindakan")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Semua Tindakan</SelectItem>
            <SelectItem value="open">Buka</SelectItem>
            <SelectItem value="close">Tutup</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filterStatus || "_all"}
          onValueChange={(v) => setParams({ status: v != null && v !== "_all" ? v : null })}
        >
          <SelectTrigger size="sm" className="w-auto">
            <SelectValue>{(v) => ({ _all: "Semua Status", active: "Aktif", inactive: "Nonaktif" }[v as string] ?? "Semua Status")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Semua Status</SelectItem>
            <SelectItem value="active">Aktif</SelectItem>
            <SelectItem value="inactive">Nonaktif</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilter && (
          <Button variant="outline" size="sm" onClick={() => setParams({ action: null, status: null })}>
            Reset Filter
          </Button>
        )}
      </div>

      <Card className="py-0">
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={filteredSchedules}
            loading={loading}
            emptyMessage="Belum ada jadwal"
            getRowClassName={(s) => (s.is_active ? "" : "opacity-50")}
          />
        </CardContent>
      </Card>

      <Sheet
        open={modal !== null}
        onOpenChange={(open) => {
          if (!open) setModal(null);
        }}
      >
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{modal === "create" ? "Tambah Jadwal" : "Edit Jadwal"}</SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto flex-1">
            <ScheduleModal
              form={form}
              setForm={setForm}
              onSubmit={handleSubmit}
              onClose={() => setModal(null)}
              saving={saving}
            />
            {typeof modal === "number" && (
              <div className="-mx-6 px-6 border-t mt-2 divide-y">
                <div className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <p className="text-sm font-medium">
                      {form.is_active ? "Nonaktifkan" : "Aktifkan"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {form.is_active
                        ? "Jadwal tidak akan berjalan sementara"
                        : "Aktifkan kembali jadwal ini"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={async () => {
                      await handleToggle(modal);
                      setForm((f) => ({ ...f, is_active: !f.is_active }));
                    }}
                  >
                    {form.is_active ? "Nonaktifkan" : "Aktifkan"}
                  </Button>
                </div>
                <div className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <p className="text-sm font-medium">Hapus jadwal</p>
                    <p className="text-xs text-muted-foreground">
                      Tindakan ini tidak bisa dibatalkan
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="shrink-0"
                    onClick={() => {
                      setModal(null);
                      handleDelete(modal);
                    }}
                  >
                    Hapus
                  </Button>
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
