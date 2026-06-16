import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Log, LogsResponse } from "../types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatWITA(iso: string) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Makassar",
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(iso));
}

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

const sourceFilterLabel: Record<string, string> = {
  _all: "Semua Status",
  sensor: "Sensor",
  manual: "Manual",
  schedule: "Jadwal",
};

export function Logs() {
  const [result, setResult] = useState<LogsResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [filterSource, setFilterSource] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    api
      .getLogs(page, 30, filterSource || undefined)
      .then(setResult)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, filterSource]);

  useEffect(() => {
    load();
  }, [load]);

  function applyFilter(source: string) {
    setFilterSource(source);
    setPage(1);
  }

  const totalPages = result?.pagination.totalPages ?? 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Riwayat</h2>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? "Memuat..." : "Refresh"}
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Select
          value={filterSource || "_all"}
          onValueChange={(v) => applyFilter(v != null && v !== "_all" ? v : "")}
        >
          <SelectTrigger size="sm" className="w-auto">
            <SelectValue>{(v) => sourceFilterLabel[v as string] ?? "Semua Status"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Semua Status</SelectItem>
            <SelectItem value="sensor">Sensor</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="schedule">Jadwal</SelectItem>
          </SelectContent>
        </Select>

        {filterSource && (
          <Button variant="outline" size="sm" onClick={() => applyFilter("")}>
            Reset Filter
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="h-[480px] flex items-center justify-center text-sm text-muted-foreground">
              Memuat...
            </div>
          ) : !result || result.data.length === 0 ? (
            <div className="h-[480px] flex items-center justify-center text-sm text-muted-foreground">
              Belum ada riwayat
            </div>
          ) : (
            <div className="h-[480px] overflow-y-auto [&>[data-slot=table-container]]:overflow-x-visible">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card">
                  <TableRow>
                    <TableHead>Waktu (WITA)</TableHead>
                    <TableHead>Sudut</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.data.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatWITA(log.created_at)}
                      </TableCell>
                      <TableCell>{log.servo_angle}°</TableCell>
                      <TableCell>
                        <Badge className={sourceBadgeClass[log.source]}>
                          {sourceLabel[log.source]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {result && totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <span className="text-xs text-muted-foreground">
                Halaman {page} dari {totalPages} ({result.pagination.total} data)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  ← Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Selanjutnya →
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
