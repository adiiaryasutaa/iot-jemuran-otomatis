# Jemuran Otomatis — Web App

Web control panel + REST API for an IoT clothesline that auto-closes when it rains. ESP32 polls the same API.

## Stack

- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS
- **Backend**: Express 5 (runs via `tsx`, deployed as Vercel serverless)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (browser) · shared `x-api-key` (ESP32)

## Prerequisites

- Node.js 18+
- A Supabase project with the schema migrated (see below)
- For ESP32: Arduino IDE with libraries listed in `firmware/` section

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in `.env`:

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase `service_role` key (server-side only) |
| `DEVICE_API_KEY` | Shared secret for ESP32 ↔ API auth |
| `WEB_ORIGIN` | Frontend origin for CORS (e.g. `http://localhost:5173`) |
| `VITE_API_BASE_URL` | API base URL seen by browser (e.g. `http://localhost:3000`) |
| `VITE_SUPABASE_URL` | Supabase project URL (public) |
| `VITE_SUPABASE_ANON_KEY` | Supabase `anon` key (public) |

### 3. Run database migrations

In Supabase dashboard → SQL editor, run all migration files from the `migrations/` folder in order.

Tables created: `device_status`, `device_config`, `commands`, `event_logs`, `schedules`.

### 4. Create a login user

In Supabase dashboard → Authentication → Users → Add user. This account is used to log into the web UI.

### 5. Start dev server

```bash
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:3000

---

## Commands

```bash
npm run dev          # Express API (port 3000) + Vite frontend (port 5173) concurrently
npm run dev:client   # Vite only
npm run dev:server   # Express only
npm run build        # tsc -b && vite build
npx tsc --project tsconfig.server.json   # typecheck server code
```

---

## Deploy to Vercel

1. Push repo to GitHub
2. Import project in Vercel
3. Set all env vars from `.env` in Vercel dashboard (without `VITE_` prefix for server-side vars)
4. Vercel picks up `api/index.ts` as serverless entry automatically via `vercel.json`

---

## ESP32 Firmware

Located in `firmware/`. Open folder as a sketch in Arduino IDE.

**Required libraries** (install via Library Manager):

- `ArduinoJson` by Benoit Blanchon (v7)
- `ESP32Servo` by Kevin Harrington

**Setup:**

```bash
cp firmware/credentials.h.example firmware/credentials.h
```

Edit `firmware/credentials.h`:

```cpp
#define WIFI_SSID_VAL     "your_wifi_ssid"
#define WIFI_PASSWORD_VAL "your_wifi_password"
#define API_BASE_VAL      "http://<server-ip>:3000"   // or deployed URL
#define API_KEY_VAL       "your_device_api_key"       // must match DEVICE_API_KEY in .env
```

Flash to ESP32. It polls commands every 3s and config every 60s.

---

## Architecture

```
ESP32 (WiFi, polls every 3s)
  ↕  HTTP · x-api-key
Express API (server/)
  ↕  Supabase JS SDK (service_role, server-side only)
Supabase PostgreSQL
  ↑
React frontend (src/) — talks to Express, NOT Supabase directly
  ↑  Supabase Auth (anon key) — login only
```

Status strings are Indonesian: `hujan` (rain), `cerah` (clear) — ESP32 checks these literals.
Timestamps display in `Asia/Jakarta` (WIB, UTC+7).
