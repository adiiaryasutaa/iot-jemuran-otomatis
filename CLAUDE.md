# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # start both Express API (port 3000) + Vite frontend (port 5173) concurrently
npm run dev:client   # Vite only
npm run dev:server   # Express only (tsx watch --env-file=.env server/app.ts)
npm run build        # tsc -b && vite build
npx tsc --project tsconfig.server.json   # typecheck server code
```

No test suite configured yet.

## Architecture

This is a **monorepo web app + API** for an IoT clothesline (jemuran) that auto-closes when it rains.

```
src/          React frontend (Vite, TypeScript, Tailwind)
server/       Express API (TypeScript, runs via tsx)
api/          Vercel serverless entry — re-exports server/app.ts
firmware/     ESP32 Arduino sketch (split across .ino/.h/.cpp)
```

### Data flow

```
ESP32 (WiFi, polls every 3s)
  ↕  HTTP x-api-key header
Express API (server/)
  ↕  Supabase JS SDK (service_role key, server-side only)
Supabase PostgreSQL
  ↑
React frontend (src/) — talks to Express, NOT Supabase directly
  ↑  Supabase Auth (anon key) — login only
```

### Key architectural rules

- **Single shared `x-api-key`** authenticates both ESP32 and the web frontend to the Express API (`server/middleware/auth.ts`). The key must be in `API_KEY` env var on the server and `VITE_API_KEY` for the client.
- **`server/lib/supabase.ts`** uses the `service_role` key — never expose this to the client. It is loaded via `--env-file=.env` before any module code runs (ESM hoisting issue — do not use `dotenv.config()` inside modules).
- **Supabase Auth** (`src/lib/supabase.ts`) uses the `anon` key — safe for the browser. Used only for login gating, not for DB access.
- **Single-row tables**: `device_status` and `device_config` always have `id = 1`. Always UPDATE, never INSERT.
- **Status strings are Indonesian**: `'hujan'` (rain) and `'cerah'` (clear). These literals are checked by the ESP32.
- **Timestamps** displayed in `Asia/Jakarta` (WIB, UTC+7) via `Intl.DateTimeFormat`.

### TypeScript setup (three configs)

| Config | Covers | Purpose |
|---|---|---|
| `tsconfig.app.json` | `src/` | Frontend (bundler mode, noEmit) |
| `tsconfig.node.json` | `vite.config.ts` | Vite config |
| `tsconfig.server.json` | `server/`, `api/` | Express server (bundler resolution, noEmit — tsx runs TS directly) |

### Database tables (Supabase)

| Table | Key columns | Notes |
|---|---|---|
| `device_status` | `status`, `servo_angle`, `mode` | Single row id=1, realtime enabled |
| `commands` | `command`, `is_executed` | ESP32 polls pending; app inserts |
| `device_config` | angles, debounce, rain_active, led_mode, led_blink_ms | Single row id=1 |
| `event_logs` | `status`, `source` | Append-only, paginated |
| `schedules` | `hour`, `minute`, `days[]`, `is_active` | `days=[]` means every day |

### ESP32 firmware (firmware/)

Split into tabs for Arduino IDE:
- `firmware.ino` — setup/loop + `const char*` globals from `credentials.h`
- `credentials.h` — gitignored; copy from `credentials.h.example`
- `config.h` — `DeviceConfig` struct, `Pin` namespace, `extern` declarations
- `hardware.cpp/.h` — sensor debounce, servo, non-blocking LED blink
- `api.cpp/.h` — HTTP helpers + all API calls

ESP32 polling intervals: commands 3s, config 60s. UI should communicate these latencies.

### Env vars

| Var | Where | Used by |
|---|---|---|
| `SUPABASE_URL` | `.env` | `server/lib/supabase.ts` |
| `SUPABASE_SERVICE_KEY` | `.env` | `server/lib/supabase.ts` |
| `API_KEY` | `.env` | `server/middleware/auth.ts` |
| `VITE_API_BASE_URL` | `.env` | `src/lib/api.ts` |
| `VITE_API_KEY` | `.env` | `src/lib/api.ts` |
| `VITE_SUPABASE_URL` | `.env` | `src/lib/supabase.ts` |
| `VITE_SUPABASE_ANON_KEY` | `.env` | `src/lib/supabase.ts` |

Copy `.env.example` → `.env` and fill values. For Vercel deploy, set all vars in dashboard.
