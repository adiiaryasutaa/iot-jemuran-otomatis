export interface Status {
  id: number;
  status: "open" | "close";
  servo_angle: number;
  mode: "auto" | "manual";
  updated_at: string;
}

export interface Config {
  id: number;
  angle_open: number;
  angle_closed: number;
  debounce_ms: number;
  rain_active: "LOW" | "HIGH";
  led_mode: "solid" | "blink";
  led_blink_ms: number;
  cooldown_ms: number;
  mode: "auto" | "manual";
  updated_at: string;
}

export interface Log {
  id: number;
  created_at: string;
  servo_angle: number;
  source: "sensor" | "manual" | "schedule";
}

export interface Schedule {
  id: number;
  label: string;
  action: "open" | "close";
  hour: number;
  minute: number;
  days: number[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
}

export interface LogsResponse {
  data: Log[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
