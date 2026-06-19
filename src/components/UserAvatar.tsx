import type { User } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";

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

function hashEmail(email: string): number {
  let h = 0;
  for (let i = 0; i < email.length; i++) {
    h = (h * 31 + email.charCodeAt(i)) >>> 0;
  }
  return h;
}

function getInitials(user: User): string {
  const name = user.user_metadata?.full_name as string | undefined;
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    return parts.length > 1
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  return (user.email?.[0] ?? "?").toUpperCase();
}

const SIZE_CLASSES = {
  sm: "size-7 text-xs",
  md: "size-9 text-sm",
  lg: "size-18 text-2xl",
};

interface UserAvatarProps {
  user: User;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}

export function UserAvatar({ user, size = "md", className }: UserAvatarProps) {
  const color = COLORS[hashEmail(user.email ?? "") % COLORS.length];
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold text-white select-none shrink-0",
        color,
        SIZE_CLASSES[size],
        className,
      )}
    >
      {getInitials(user)}
    </span>
  );
}
