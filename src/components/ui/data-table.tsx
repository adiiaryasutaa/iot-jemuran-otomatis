import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, ChevronDown, ChevronUp } from "lucide-react";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  loading?: boolean;
  emptyMessage?: string;
  getRowClassName?: (row: TData) => string;
  pageSize?: number;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  loading = false,
  emptyMessage = "Belum ada data",
  getRowClassName,
  pageSize,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const paginated = pageSize !== undefined;

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    ...(paginated && {
      getPaginationRowModel: getPaginationRowModel(),
      initialState: { pagination: { pageSize, pageIndex: 0 } },
    }),
  });

  const emptyHeight = "h-[420px]";

  return (
    <div>
      <div className={paginated ? "min-h-[432px]" : "h-[480px] overflow-y-auto [&>[data-slot=table-container]]:overflow-x-visible"}>
        <Table>
          <TableHeader className={paginated ? undefined : "sticky top-0 z-10 bg-card"}>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  return (
                    <TableHead
                      key={header.id}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                      className={canSort ? "cursor-pointer select-none" : ""}
                    >
                      {header.isPlaceholder ? null : (
                        <span className="inline-flex items-center gap-1">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {canSort && (
                            <span className="text-muted-foreground">
                              {sorted === "asc" ? (
                                <ChevronUp className="h-3.5 w-3.5" />
                              ) : sorted === "desc" ? (
                                <ChevronDown className="h-3.5 w-3.5" />
                              ) : (
                                <ArrowUpDown className="h-3.5 w-3.5" />
                              )}
                            </span>
                          )}
                        </span>
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className={`${emptyHeight} text-center text-sm text-muted-foreground`}>
                  Memuat...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className={`${emptyHeight} text-center text-sm text-muted-foreground`}>
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className={getRowClassName?.(row.original)}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {paginated && (
        <div className="flex items-center justify-between border-t px-4 py-2">
          <p className="text-xs text-muted-foreground">
            {table.getFilteredRowModel().rows.length} data
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="xs"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              &lsaquo; Sebelumnya
            </Button>
            <span className="text-xs text-muted-foreground">
              {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
            </span>
            <Button
              variant="outline"
              size="xs"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Berikutnya &rsaquo;
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
