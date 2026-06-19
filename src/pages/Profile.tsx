import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { UserAvatar } from "../components/UserAvatar";
import { ProfileDialog } from "../components/ProfileDialog";
import { Button } from "@/components/ui/button";

function formatLastLogin(isoString: string | undefined): string {
  if (!isoString) return "—";
  return (
    new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(isoString)) + " WIB"
  );
}

export function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!user) return null;

  const displayName =
    (user.user_metadata?.full_name as string | undefined)?.trim() ||
    user.email?.split("@")[0] ||
    "User";

  async function handleLogout() {
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <div className="max-w-sm mx-auto py-8">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Profil</h1>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex flex-col items-center gap-3 px-6 py-8 border-b border-gray-100">
          <UserAvatar user={user} size="lg" />
          <div className="text-center">
            <p className="font-semibold text-lg leading-tight">{displayName}</p>
            <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
          </div>
        </div>

        <dl className="divide-y divide-gray-100">
          <div className="flex items-center justify-between px-6 py-3 text-sm">
            <dt className="text-muted-foreground">Email</dt>
            <dd className="font-medium text-right">{user.email}</dd>
          </div>
          <div className="flex items-center justify-between px-6 py-3 text-sm">
            <dt className="text-muted-foreground">Login terakhir</dt>
            <dd className="font-medium text-right">{formatLastLogin(user.last_sign_in_at)}</dd>
          </div>
        </dl>

        <div className="flex gap-2 px-6 py-4 border-t border-gray-100">
          <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
            Edit Profil
          </Button>
          <Button variant="destructive" size="sm" onClick={handleLogout} className="ml-auto">
            Keluar
          </Button>
        </div>
      </div>

      <ProfileDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
