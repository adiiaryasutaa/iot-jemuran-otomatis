import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { usePolling } from "../hooks/usePolling";

const SENSOR_COOLDOWN_MS = 30_000;

function formatWITA(iso: string) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Makassar",
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(iso));
}

function useCooldown(updatedAt: string | undefined) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!updatedAt) return;
    function tick() {
      const elapsed = Date.now() - new Date(updatedAt!).getTime();
      setRemaining(Math.max(0, SENSOR_COOLDOWN_MS - elapsed));
    }
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [updatedAt]);

  return remaining;
}

export function Dashboard() {
  const { data: status, error } = usePolling(api.getStatus, 3000);
  const [cmdLoading, setCmdLoading] = useState<"open" | "close" | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const cooldownMs = useCooldown(status?.updated_at);

  async function sendCommand(command: "open" | "close") {
    setCmdLoading(command);
    try {
      await api.postCommand(command);
      setToast(
        `Perintah "${command === "open" ? "Buka" : "Tutup"}" terkirim — berlaku dalam ~3 detik`,
      );
      setTimeout(() => setToast(null), 4000);
    } catch (e) {
      setToast(`Gagal: ${e instanceof Error ? e.message : "error tidak diketahui"}`);
      setTimeout(() => setToast(null), 4000);
    } finally {
      setCmdLoading(null);
    }
  }

  const isHujan = status?.status === "hujan";
  const cooldownSec = Math.ceil(cooldownMs / 1000);
  const inCooldown = cooldownMs > 0;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Dashboard</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          Gagal memuat status: {error}
        </div>
      )}

      {toast && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-700">
          {toast}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
            Status Cuaca
          </p>
          {status ? (
            <div className="flex items-center gap-3">
              <span className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white ${isHujan ? "bg-blue-500" : "bg-yellow-400"}`}>{isHujan ? "H" : "C"}</span>
              <div>
                <p className={`text-xl font-bold ${isHujan ? "text-blue-700" : "text-yellow-600"}`}>
                  {isHujan ? "Hujan" : "Cerah"}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Diperbarui {formatWITA(status.updated_at)}
                </p>
              </div>
            </div>
          ) : (
            <div className="h-12 bg-gray-100 rounded-lg animate-pulse" />
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Servo</p>
          {status ? (
            <div className="flex items-center gap-3">
              <span className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white ${isHujan ? "bg-red-500" : "bg-green-500"}`}>{isHujan ? "T" : "B"}</span>
              <div>
                <p className={`text-xl font-bold ${isHujan ? "text-red-600" : "text-green-600"}`}>
                  {isHujan ? "Tertutup" : "Terbuka"}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {status.servo_angle}° · Mode:{" "}
                  <span className="font-medium text-gray-600">{status.mode}</span>
                </p>
              </div>
            </div>
          ) : (
            <div className="h-12 bg-gray-100 rounded-lg animate-pulse" />
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Kontrol Manual
          </p>
          {inCooldown && (
            <span className="text-xs text-orange-600 font-medium">
              Sensor cooldown: {cooldownSec}d
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 mb-4">
          Perintah akan dieksekusi perangkat dalam ~3 detik. Sensor tetap aktif setelah perintah.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => sendCommand("open")}
            disabled={cmdLoading !== null}
            className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {cmdLoading === "open" ? "Mengirim..." : "Buka Jemuran"}
          </button>
          <button
            onClick={() => sendCommand("close")}
            disabled={cmdLoading !== null}
            className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {cmdLoading === "close" ? "Mengirim..." : "Tutup Jemuran"}
          </button>
        </div>

        {inCooldown && (
          <div className="mt-3">
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div
                className="bg-orange-400 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${(cooldownMs / SENSOR_COOLDOWN_MS) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
