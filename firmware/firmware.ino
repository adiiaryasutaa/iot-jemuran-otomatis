#include <ESP32Servo.h>
#include <WiFi.h>
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"
#include "credentials.h"  // copy from credentials.h.example and fill in values
#include "config.h"
#include "hardware.h"
#include "api.h"

const char* WIFI_SSID     = WIFI_SSID_VAL;
const char* WIFI_PASSWORD = WIFI_PASSWORD_VAL;
const char* API_BASE      = API_BASE_VAL;
const char* API_KEY       = API_KEY_VAL;

DeviceConfig  cfg;
Servo         canopyServo;

bool          confirmedRaining = false;
bool          lastRawRaining   = false;
unsigned long lastChangeMs     = 0;
bool          ledState         = false;

unsigned long lastStateChangeMs   = 0;
unsigned long lastCommandPollMs   = 0;
unsigned long lastConfigRefreshMs = 0;

// Moves servo, updates state, and reports to API.
static void triggerState(bool isRaining, const char* statusMode, const char* logSource) {
  confirmedRaining  = isRaining;
  lastStateChangeMs = millis();
  applyState(isRaining);
  postStatus(isRaining, statusMode);
  postLog(isRaining, logSource);
}

void setup() {
  // Disable brownout reset: servo current spikes sag the 5V rail and would
  // otherwise reboot the chip mid-move. Masks weak power — add a bulk cap /
  // separate 5V supply for a real fix.
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);

  Serial.begin(115200);
  delay(200);

  pinMode(Pin::RAIN_SENSOR, INPUT);
  pinMode(Pin::LED, OUTPUT);
  canopyServo.setPeriodHertz(50);
  canopyServo.attach(Pin::SERVO, 500, 2400);

  // Phase 1: connect WiFi — fast blink until connected
  Serial.print(F("Connecting to WiFi..."));
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  while (WiFi.status() != WL_CONNECTED) {
    digitalWrite(Pin::LED, HIGH); delay(100);
    digitalWrite(Pin::LED, LOW);  delay(100);
  }
  digitalWrite(Pin::LED, LOW);

  delay(500); // let WiFi stack stabilise before first HTTP call

  Serial.print(F("\nIP: "));
  Serial.println(WiFi.localIP());

  // Phase 2: fetch config — slow blink, retry until success
  Serial.println(F("Fetching config..."));

  while (!fetchConfig()) {
    Serial.println(F("[Config] failed, retrying..."));
    digitalWrite(Pin::LED, HIGH); delay(500);
    digitalWrite(Pin::LED, LOW);  delay(500);
  }
  digitalWrite(Pin::LED, LOW);

  // Phase 3: read initial sensor state and sync to API
  triggerState(readRainRaw(), "auto", "sensor");
  Serial.println(F("=== Ready ==="));
}

void loop() {
  // Sensor debounce: only act after signal is stable for debounce_ms
  bool raw = readRainRaw();
  if (raw != lastRawRaining) {
    lastRawRaining = raw;
    lastChangeMs   = millis();
  }

  if (millis() - lastChangeMs >= (unsigned long)cfg.debounce_ms && raw != confirmedRaining) {
    bool isManual = (strcmp(cfg.mode, "manual") == 0);

    if (isManual) {
      // Manual mode: sensor only closes on rain (safety). User opens manually.
      if (raw) triggerState(true, "auto", "sensor");
    } else {
      // Auto mode: sensor fully governs, cooldown prevents rapid toggling.
      if (millis() - lastStateChangeMs >= SENSOR_COOLDOWN_MS)
        triggerState(raw, "auto", "sensor");
    }
  }

  updateLed();

  if (millis() - lastCommandPollMs >= COMMAND_POLL_INTERVAL) {
    lastCommandPollMs = millis();
    pollCommand();
  }

  if (millis() - lastConfigRefreshMs >= CONFIG_REFRESH_INTERVAL) {
    lastConfigRefreshMs = millis();
    fetchConfig();
  }
}
