import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { api } from "../lib/api";
import type { Log, Schedule } from "../types";
import { useStatus } from "../context/StatusContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

const sourceBadgeClass: Record<Log["source"], string> = {
  sensor: "bg-blue-100 text-blue-700 border-transparent",
  manual: "bg-orange-100 text-orange-700 border-transparent",
  schedule: "bg-green-100 text-green-700 border-transparent",
};

const sourceLabel: Record<Log["source"], string> = {
  sensor: "Sensor",
  manual: "Manual",
  schedule: "Jadwal",
};

function formatWITA(iso: string) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Makassar",
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(iso));
}

function formatTime(h: number, m: number) {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

// Current weekday + minutes-of-day in WITA (Asia/Makassar).
function witaNow(): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Makassar",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const day = WEEKDAY_INDEX[get("weekday")] ?? 0;
  const hour = Number(get("hour")) % 24;
  const minute = Number(get("minute"));
  return { day, minutes: hour * 60 + minute };
}

// Minutes from now until the schedule next fires.
function minutesUntil(s: Schedule, now: { day: number; minutes: number }): number {
  const days = s.days.length ? s.days : [0, 1, 2, 3, 4, 5, 6];
  const target = s.hour * 60 + s.minute;
  let best = Infinity;
  for (const d of days) {
    let diff = ((d - now.day + 7) % 7) * 1440 + (target - now.minutes);
    if (diff < 0) diff += 7 * 1440;
    best = Math.min(best, diff);
  }
  return best;
}

function formatUntil(m: number): string {
  if (m <= 0) return "sekarang";
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  const min = m % 60;
  if (d > 0) return `${d}h ${h}j`;
  if (h > 0) return `${h}j ${min}m`;
  return `${min}m`;
}

export function Dashboard() {
  const { status, error, inCooldown, markAction, mode, setMode } = useStatus();
  const [cmdLoading, setCmdLoading] = useState<"open" | "close" | null>(null);
  const [logs, setLogs] = useState<Log[] | null>(null);
  const [schedules, setSchedules] = useState<Schedule[] | null>(null);

  useEffect(() => {
    api
      .getLogs(1, 5)
      .then((res) => setLogs(res.data))
      .catch(() => setLogs([]));
    api
      .getSchedules()
      .then(setSchedules)
      .catch(() => setSchedules([]));
  }, []);

  async function sendCommand(command: "open" | "close") {
    setCmdLoading(command);
    try {
      await api.postCommand(command);
      markAction();
      toast.success(
        `Perintah "${command === "open" ? "Buka" : "Tutup"}" terkirim — berlaku dalam ~3 detik`,
      );
    } catch (e) {
      toast.error(`Gagal: ${e instanceof Error ? e.message : "error tidak diketahui"}`);
    } finally {
      setCmdLoading(null);
    }
  }

  const isHujan = status?.status === "close";
  const toggleDisabled = cmdLoading !== null || inCooldown || mode === "auto" || !status;

  const now = witaNow();
  const upcoming = (schedules ?? [])
    .filter((s) => s.is_active)
    .map((s) => ({ s, until: minutesUntil(s, now) }))
    .sort((a, b) => a.until - b.until)
    .slice(0, 3);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Dashboard</h2>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>Gagal memuat status: {error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Servo
          </p>
          {status ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white ${isHujan ? "bg-red-500" : "bg-green-500"}`}
                >
                  {isHujan ? "T" : "B"}
                </span>
                <div>
                  <p className={`text-xl font-bold ${isHujan ? "text-red-600" : "text-green-600"}`}>
                    {isHujan ? "Tertutup" : "Terbuka"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {status.servo_angle}° · Mode: <span className="font-medium">{status.mode}</span>
                  </p>
                </div>
              </div>
              <Button
                onClick={() => sendCommand(isHujan ? "open" : "close")}
                disabled={toggleDisabled}
                className={
                  isHujan
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : "bg-red-600 hover:bg-red-700 text-white"
                }
              >
                {cmdLoading !== null ? "Mengirim..." : isHujan ? "Buka" : "Tutup"}
              </Button>
            </div>
          ) : (
            <div className="h-12 bg-muted rounded-lg animate-pulse" />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Kontrol Manual
            </p>
            <div className="inline-flex rounded-lg border p-0.5">
              {(["auto", "manual"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`cursor-pointer px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    mode === m
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m === "auto" ? "Sensor" : "Manual"}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            {mode === "auto"
              ? "Mode sensor aktif — kontrol manual nonaktif. Servo mengikuti sensor hujan."
              : "Mode manual aktif. Hujan tetap menutup otomatis sebagai pengaman."}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Riwayat Terakhir
              </p>
              <Link to="/logs" className="text-xs text-blue-600 hover:underline">
                Semua
              </Link>
            </div>
            {logs === null ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-8 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : logs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Belum ada riwayat</p>
            ) : (
              <ul className="divide-y">
                {logs.map((log) => (
                  <li key={log.id} className="flex items-center justify-between gap-2 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge className={sourceBadgeClass[log.source]}>
                        {sourceLabel[log.source]}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{log.servo_angle}°</span>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                      {formatWITA(log.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Jadwal Berikutnya
              </p>
              <Link to="/schedule" className="text-xs text-blue-600 hover:underline">
                Semua
              </Link>
            </div>
            {schedules === null ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-8 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Tidak ada jadwal aktif
              </p>
            ) : (
              <ul className="divide-y">
                {upcoming.map(({ s, until }) => (
                  <li key={s.id} className="flex items-center justify-between gap-2 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge
                        className={
                          s.action === "open"
                            ? "bg-green-100 text-green-700 border-transparent"
                            : "bg-red-100 text-red-700 border-transparent"
                        }
                      >
                        {s.action === "open" ? "Buka" : "Tutup"}
                      </Badge>
                      <span className="text-sm font-medium truncate">{s.label}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium">{formatTime(s.hour, s.minute)}</p>
                      <p className="text-xs text-muted-foreground">dalam {formatUntil(until)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
