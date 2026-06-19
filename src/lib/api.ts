import { supabase } from "./supabase";
import type { AdminUser, Config, LogsResponse, Schedule, Status } from "../types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

async function authHeader(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");
  return `Bearer ${session.access_token}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: await authHeader(),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  getStatus: () => request<Status>("/api/status"),

  getConfig: () => request<Config>("/api/config"),
  putConfig: (partial: Partial<Omit<Config, "id" | "updated_at">>) =>
    request<Config>("/api/config", { method: "PUT", body: JSON.stringify(partial) }),

  postCommand: (command: "open" | "close") =>
    request("/api/command", { method: "POST", body: JSON.stringify({ command }) }),

  getLogs: (page = 1, limit = 30, source?: string, dateFrom?: string, dateTo?: string) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (source) params.set("source", source);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    return request<LogsResponse>(`/api/logs?${params}`);
  },

  getSchedules: () => request<Schedule[]>("/api/schedule"),
  postSchedule: (body: Omit<Schedule, "id" | "created_at" | "updated_at">) =>
    request<Schedule>("/api/schedule", { method: "POST", body: JSON.stringify(body) }),
  putSchedule: (id: number, body: Partial<Omit<Schedule, "id" | "created_at" | "updated_at">>) =>
    request<Schedule>(`/api/schedule/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteSchedule: (id: number) => request<void>(`/api/schedule/${id}`, { method: "DELETE" }),
  toggleSchedule: (id: number) =>
    request<Schedule>(`/api/schedule/${id}/toggle`, { method: "PATCH" }),

  getUsers: () => request<AdminUser[]>("/api/users"),
  inviteUser: (email: string) =>
    request<{ ok: boolean }>("/api/users/invite", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  deleteUser: (id: string) => request<{ ok: boolean }>(`/api/users/${id}`, { method: "DELETE" }),
};
