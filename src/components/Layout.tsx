import { NavLink, Outlet } from "react-router-dom";
import { useStatus } from "../context/StatusContext";
import { UserDropdown } from "./UserDropdown";
import { Badge } from "@/components/ui/badge";
import { Toaster } from "@/components/ui/sonner";

const navItems = [
  { to: "/", label: "Dashboard" },
  { to: "/schedule", label: "Jadwal" },
  { to: "/config", label: "Konfigurasi" },
  { to: "/logs", label: "Riwayat" },
  { to: "/users", label: "Pengguna" },
];

export function Layout() {
  const { inCooldown, cooldownSec } = useStatus();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <span className="font-semibold text-gray-900">{import.meta.env.VITE_APP_NAME}</span>
            <nav className="hidden sm:flex gap-1">
              {navItems.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/"}
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {inCooldown && (
              <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">
                Cooldown {cooldownSec}d
              </Badge>
            )}
            <UserDropdown />
          </div>
        </div>
        <nav className="sm:hidden flex border-t border-gray-100">
          {navItems.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex-1 py-2 text-xs font-medium text-center transition-colors ${
                  isActive ? "text-blue-700 border-t-2 border-blue-600 -mt-px" : "text-gray-500"
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
        <Outlet />
      </main>
      <Toaster richColors position="bottom-right" />
    </div>
  );
}
