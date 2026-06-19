import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { UserAvatar } from "./UserAvatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

function formatLastLogin(isoString: string | undefined): string {
  if (!isoString) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoString)) + " WIB";
}

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileDialog({ open, onOpenChange }: ProfileDialogProps) {
  const { user, signOut, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [fullName, setFullName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) {
      setMode("view");
      setError(null);
      setNewPassword("");
      setConfirmPassword("");
    }
  }

  function enterEdit() {
    setFullName((user?.user_metadata?.full_name as string) ?? "");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
    setMode("edit");
  }

  async function handleSave() {
    if (newPassword && newPassword !== confirmPassword) {
      setError("Password tidak cocok.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const updates: { full_name?: string; password?: string } = {};
      if (fullName.trim()) updates.full_name = fullName.trim();
      if (newPassword) updates.password = newPassword;
      await updateProfile(updates);
      setMode("view");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    onOpenChange(false);
    await signOut();
    navigate("/login", { replace: true });
  }

  if (!user) return null;

  const displayName =
    (user.user_metadata?.full_name as string | undefined)?.trim() ||
    user.email?.split("@")[0] ||
    "User";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        {mode === "view" ? (
          <>
            <DialogHeader>
              <DialogTitle>Profil</DialogTitle>
            </DialogHeader>

            <div className="flex flex-col items-center gap-3 py-2">
              <UserAvatar user={user} size="lg" />
              <div className="text-center">
                <p className="font-semibold text-base leading-tight">{displayName}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{user.email}</p>
              </div>
            </div>

            <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Login terakhir</span>
              <br />
              {formatLastLogin(user.last_sign_in_at)}
            </div>

            <DialogFooter>
              <Button variant="destructive" size="sm" onClick={handleLogout} className="mr-auto">
                Keluar
              </Button>
              <Button variant="outline" size="sm" onClick={enterEdit}>
                Edit Profil
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Edit Profil</DialogTitle>
            </DialogHeader>

            <div className="flex flex-col gap-3">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fullName">Nama Tampilan</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nama kamu"
                />
              </div>

              <div className="flex flex-col gap-1 pt-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Ganti Password
                </p>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="newPassword">Password Baru</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Kosongkan jika tidak diganti"
                  />
                </div>
                <div className="flex flex-col gap-1.5 mt-1.5">
                  <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi password baru"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMode("view")}
                disabled={saving}
              >
                Batal
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? "Menyimpan…" : "Simpan"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
