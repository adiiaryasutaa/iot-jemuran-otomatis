import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Log, LogsResponse } from "../types";

function formatWITA(iso: string) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Makassar",
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(iso));
}

const sourceBadge: Record<Log["source"], string> = {
  sensor: "bg-blue-100 text-blue-700",
  manual: "bg-orange-100 text-orange-700",
  schedule: "bg-green-100 text-green-700",
};

const sourceLabel: Record<Log["source"], string> = {
  sensor: "Sensor",
  manual: "Manual",
  schedule: "Jadwal",
};

export function Logs() {
  const [result, setResult] = useState<LogsResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api
      .getLogs(page, 30)
      .then(setResult)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page]);

  const totalPages = result?.pagination.totalPages ?? 1;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Riwayat</h2>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Memuat...</div>
        ) : !result || result.data.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">Belum ada riwayat</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Waktu (WITA)</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Sudut</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Sumber</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {result.data.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {formatWITA(log.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          log.status === "hujan"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {log.status === "hujan" ? "Hujan" : "Cerah"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{log.servo_angle}°</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${sourceBadge[log.source]}`}
                      >
                        {sourceLabel[log.source]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {result && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-xs text-gray-400">
              Halaman {page} dari {totalPages} ({result.pagination.total} data)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-xs border border-gray-200 rounded-md disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                ← Sebelumnya
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 text-xs border border-gray-200 rounded-md disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                Selanjutnya →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
