import { type ColumnDef } from "@tanstack/react-table";
import { useCallback, useEffect, useMemo } from "react";
import type { DateRange } from "react-day-picker";
import { useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { api } from "../lib/api";
import type { Log, LogsResponse } from "../types";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import { useState } from "react";

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

const columns: ColumnDef<Log>[] = [
  {
    id: "created_at",
    accessorFn: (row) => new Date(row.created_at),
    header: "Waktu (WITA)",
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-muted-foreground">
        {formatWITA(row.original.created_at)}
      </span>
    ),
    sortingFn: "datetime",
    enableSorting: true,
  },
  {
    accessorKey: "servo_angle",
    header: "Sudut",
    cell: ({ row }) => `${row.original.servo_angle}°`,
    enableSorting: true,
  },
  {
    id: "source",
    header: "Status",
    cell: ({ row }) => (
      <Badge className={sourceBadgeClass[row.original.source]}>
        {sourceLabel[row.original.source]}
      </Badge>
    ),
    enableSorting: false,
  },
];

function parseLocalDate(str: string): Date {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toUtcBound(date: Date, endOfDay: boolean): string {
  const d = new Date(date);
  endOfDay ? d.setHours(23, 59, 59, 999) : d.setHours(0, 0, 0, 0);
  return new Date(d.getTime() - 8 * 60 * 60 * 1000).toISOString();
}

export function Logs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [result, setResult] = useState<LogsResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const filterSource = searchParams.get("source") ?? "";
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));

  const dateRange: DateRange | undefined =
    fromParam
      ? { from: parseLocalDate(fromParam), to: toParam ? parseLocalDate(toParam) : undefined }
      : undefined;

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

  const load = useCallback(() => {
    setLoading(true);
    api
      .getLogs(
        page,
        30,
        filterSource || undefined,
        fromParam ? toUtcBound(parseLocalDate(fromParam), false) : undefined,
        toParam ? toUtcBound(parseLocalDate(toParam), true) : undefined,
      )
      .then(setResult)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, filterSource, fromParam, toParam]);

  useEffect(() => {
    load();
  }, [load]);

  function applySource(source: string) {
    setParams({ source: source || null, page: null });
  }

  function applyDateRange(range: DateRange | undefined) {
    setParams({
      from: range?.from ? format(range.from, "yyyy-MM-dd") : null,
      to: range?.to ? format(range.to, "yyyy-MM-dd") : null,
      page: null,
    });
  }

  function resetFilters() {
    setParams({ source: null, from: null, to: null, page: null });
  }

  const hasActiveFilter = filterSource || fromParam;
  const totalPages = result?.pagination.totalPages ?? 1;
  const data = useMemo(() => result?.data ?? [], [result]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Riwayat</h2>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Refreshing</> : "Refresh"}
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        <Select
          value={filterSource || "_all"}
          onValueChange={(v) => applySource(v != null && v !== "_all" ? v : "")}
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

        <DateRangePicker value={dateRange} onChange={applyDateRange} />

        {hasActiveFilter && (
          <Button variant="outline" size="sm" onClick={resetFilters}>
            Reset Filter
          </Button>
        )}
      </div>

      <Card className="py-0">
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={data}
            loading={loading}
            emptyMessage="Belum ada riwayat"
          />

          {result && totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <span className="text-xs text-muted-foreground">
                Halaman {page} dari {totalPages} ({result.pagination.total} data)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => setParams({ page: String(page - 1) })}
                  disabled={page === 1}
                >
                  ← Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => setParams({ page: String(page + 1) })}
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
