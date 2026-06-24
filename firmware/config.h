#pragma once
#include <Arduino.h>

#define COUNTOF(a) (sizeof(a) / sizeof(a[0]))

namespace Pin {
  constexpr uint8_t RAIN_SENSOR = 27;
  constexpr uint8_t SERVO       = 13;
  constexpr uint8_t LED         = 2;
}

constexpr unsigned long COMMAND_POLL_INTERVAL   = 3000;   // ms
constexpr unsigned long CONFIG_REFRESH_INTERVAL = 15000;  // ms — mode switch takes effect within this window
constexpr unsigned long SENSOR_COOLDOWN_MS      = 30000;  // ms — min gap between sensor-triggered state changes
constexpr unsigned long SERVO_SLOW_STEP_MS      = 15;     // ms per 1° when servo_speed == "slow"

// Runtime config fetched from API; all fields have safe defaults.
struct DeviceConfig {
  int  angle_open      = 0;
  int  angle_closed    = 90;
  int  debounce_ms     = 400;
  bool rain_active_low = true;  // true = sensor reads LOW when wet
  char mode[8]         = "auto"; // "auto" = sensor governs, "manual" = user governs
  char servo_speed[8]  = "fast"; // "fast" = instant write, "slow" = stepped rotation
};

// One step in a non-blocking LED animation sequence.
struct LedStep {
  uint16_t ms;
  bool     on;
};

extern DeviceConfig  cfg;
extern bool          confirmedRaining;
extern bool          ledState;
extern const char*   API_BASE;
extern const char*   API_KEY;
extern unsigned long lastStateChangeMs;
