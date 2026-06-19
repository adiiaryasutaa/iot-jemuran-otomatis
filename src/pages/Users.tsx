import { type ColumnDef } from "@tanstack/react-table";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "../lib/api";
import type { AdminUser } from "../types";
import { useAuth } from "../context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DataTable } from "@/components/ui/data-table";

const COLORS = [
  "bg-blue-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-orange-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-amber-500",
  "bg-pink-500",
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function avatarColor(email: string): string {
  return COLORS[hashStr(email) % COLORS.length];
}

function getInitials(full_name: string | null, email: string): string {
  if (full_name?.trim()) {
    const parts = full_name.trim().split(/\s+/);
    return parts.length > 1
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  return email[0].toUpperCase();
}

function formatWITA(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Makassar",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      setUsers(await api.getUsers());
    } catch {
      /* ignore */
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleInvite(e: FormEvent) {
    e.preventDefault();
    setInviting(true);
    try {
      await api.inviteUser(inviteEmail);
      toast.success(`Undangan dikirim ke ${inviteEmail}`);
      setInviteEmail("");
      setSheetOpen(false);
      await load();
    } catch (err) {
      toast.error(`Gagal mengundang: ${err instanceof Error ? err.message : err}`);
    } finally {
      setInviting(false);
    }
  }

  async function executeDelete() {
    if (!confirmDeleteId) return;
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    try {
      await api.deleteUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      toast.success("Pengguna dihapus");
    } catch (err) {
      toast.error(`Gagal menghapus: ${err instanceof Error ? err.message : err}`);
    }
  }

  const columns = useMemo<ColumnDef<AdminUser>[]>(
    () => [
      {
        id: "user",
        header: "Pengguna",
        cell: ({ row }) => {
          const u = row.original;
          return (
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white select-none ${avatarColor(u.email)}`}
              >
                {getInitials(u.full_name, u.email)}
              </span>
              <div>
                {u.full_name && (
                  <p className="text-sm font-medium leading-tight">{u.full_name}</p>
                )}
                <p className="text-xs text-muted-foreground leading-tight">{u.email}</p>
              </div>
            </div>
          );
        },
        enableSorting: false,
      },
      {
        id: "created_at",
        accessorFn: (row) => new Date(row.created_at),
        header: "Bergabung",
        cell: ({ row }) => <span className="text-sm">{formatWITA(row.original.created_at)}</span>,
        sortingFn: "datetime",
        enableSorting: true,
      },
      {
        id: "last_sign_in_at",
        accessorFn: (row) =>
          row.last_sign_in_at ? new Date(row.last_sign_in_at) : new Date(0),
        header: "Login terakhir",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatWITA(row.original.last_sign_in_at)}
          </span>
        ),
        sortingFn: "datetime",
        enableSorting: true,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const isSelf = row.original.id === currentUser?.id;
          return (
            <div className="flex justify-end">
              <Button
                variant="link"
                size="xs"
                disabled={isSelf}
                onClick={() => setConfirmDeleteId(row.original.id)}
                className="text-xs text-red-500 h-auto p-0 disabled:opacity-30"
              >
                Hapus
              </Button>
            </div>
          );
        },
        enableSorting: false,
      },
    ],
    [currentUser?.id],
  );

  return (
    <div className="space-y-4">
      <Dialog
        open={confirmDeleteId !== null}
        onOpenChange={(open) => { if (!open) setConfirmDeleteId(null); }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Hapus Pengguna</DialogTitle>
            <DialogDescription>Tindakan ini tidak bisa dibatalkan.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>
              Batal
            </Button>
            <Button onClick={executeDelete} className="bg-red-600 hover:bg-red-700 text-white">
              Ya, Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Pengguna</h2>
        <Button size="sm" onClick={() => setSheetOpen(true)}>
          Undang Pengguna
        </Button>
      </div>

      <Card className="py-0">
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={users}
            loading={loading}
            emptyMessage="Belum ada pengguna"
          />
        </CardContent>
      </Card>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Undang Pengguna</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleInvite} className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label htmlFor="invite-email" className="text-xs">
                Email
              </Label>
              <Input
                id="invite-email"
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="email@contoh.com"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSheetOpen(false)}
                className="flex-1"
              >
                Batal
              </Button>
              <Button type="submit" disabled={inviting} className="flex-1">
                {inviting ? "Mengirim..." : "Kirim Undangan"}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
