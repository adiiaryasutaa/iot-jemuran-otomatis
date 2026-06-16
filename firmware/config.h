#pragma once
#include <Arduino.h>

// ─── Pin mapping ──────────────────────────────────────────────────────────
namespace Pin {
  constexpr uint8_t RAIN_SENSOR = 27;
  constexpr uint8_t SERVO       = 13;
  constexpr uint8_t LED         = 2;
}

// ─── Interval polling ─────────────────────────────────────────────────────
constexpr unsigned long COMMAND_POLL_INTERVAL   = 3000;   // 3 s
constexpr unsigned long CONFIG_REFRESH_INTERVAL = 60000;  // 60 s

// ─── Konfigurasi aktif (diisi dari API, bisa berubah saat runtime) ────────
struct DeviceConfig {
  int    angle_open      = 0;
  int    angle_closed    = 90;
  int    debounce_ms     = 400;
  bool   rain_active_low = true;   // true = sensor LOW saat basah
  char   led_mode[8]     = "solid";  // char[] — hindari heap fragmentation
  int    led_blink_ms    = 500;
};

// ─── Global yang dibagi antar file ────────────────────────────────────────
extern DeviceConfig    cfg;
extern bool            confirmedRaining;
extern bool            ledState;
extern unsigned long   lastLedToggleMs;
extern const char*     API_BASE;
extern const char*     API_KEY;
extern int             confirmBlinksRemaining;
extern unsigned long   confirmBlinkDeadlineMs;
extern bool            confirmBlinkPhase;
extern bool            manualMode;
