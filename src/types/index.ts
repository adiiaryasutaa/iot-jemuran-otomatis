export interface Status {
  id: number
  status: 'hujan' | 'cerah'
  servo_angle: number
  mode: 'auto' | 'manual'
  updated_at: string
}

export interface Config {
  id: number
  angle_open: number
  angle_closed: number
  debounce_ms: number
  rain_active: 'LOW' | 'HIGH'
  led_mode: 'solid' | 'blink'
  led_blink_ms: number
  updated_at: string
}

export interface Log {
  id: number
  created_at: string
  status: 'hujan' | 'cerah'
  servo_angle: number
  source: 'sensor' | 'manual' | 'schedule'
}

export interface Schedule {
  id: number
  label: string
  action: 'open' | 'close'
  hour: number
  minute: number
  days: number[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface LogsResponse {
  data: Log[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}
