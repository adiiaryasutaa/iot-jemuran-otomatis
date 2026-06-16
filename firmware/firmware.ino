#include <ESP32Servo.h>
#include <WiFi.h>
#include "credentials.h"   // ← salin dari credentials.h.example, isi nilainya
#include "config.h"
#include "hardware.h"
#include "api.h"

const char* WIFI_SSID     = WIFI_SSID_VAL;
const char* WIFI_PASSWORD = WIFI_PASSWORD_VAL;
const char* API_BASE      = API_BASE_VAL;
const char* API_KEY       = API_KEY_VAL;

// ─── Definisi global ──────────────────────────────────────────────────────
DeviceConfig  cfg;
Servo         canopyServo;

bool          confirmedRaining = false;
bool          lastRawRaining   = false;
unsigned long lastChangeMs     = 0;

bool          ledState        = false;
unsigned long lastLedToggleMs = 0;

int           confirmBlinksRemaining = 0;
unsigned long confirmBlinkDeadlineMs = 0;
bool          confirmBlinkPhase      = false;

unsigned long lastCommandPollMs   = 0;
unsigned long lastConfigRefreshMs = 0;

// ─── Setup ────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(200);

  pinMode(Pin::RAIN_SENSOR, INPUT);
  pinMode(Pin::LED, OUTPUT);

  canopyServo.setPeriodHertz(50);
  canopyServo.attach(Pin::SERVO, 500, 2400);

  Serial.print(F("Menghubungkan ke WiFi"));

  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  delay(100);
  Serial.println(F("Scan jaringan..."));
  int n = WiFi.scanNetworks();
  for (int i = 0; i < n; i++) {
    Serial.print(WiFi.SSID(i));
    Serial.print(F("  RSSI: "));
    Serial.print(WiFi.RSSI(i));
    Serial.print(F("  Band: "));
    Serial.println(WiFi.channel(i) > 13 ? F("5GHz") : F("2.4GHz"));
  }
  Serial.println(F("---"));

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print('.');
    attempts++;
  }
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println(F("\nGAGAL konek! Cek SSID/password/band 2.4GHz"));
  } else {
    Serial.print(F("\nTerhubung, IP: "));
    Serial.println(WiFi.localIP());
  }

  // Serial.print(F("Menghubungkan ke WiFi"));
  // WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  // while (WiFi.status() != WL_CONNECTED) {
  //   delay(500);
  //   Serial.print('.');
  // }
  // Serial.print(F("\nTerhubung, IP: "));
  // Serial.println(WiFi.localIP());

  fetchConfig();

  confirmedRaining = readRainRaw();
  applyState(confirmedRaining);
  postStatus(confirmedRaining, "auto");
  postLog(confirmedRaining, "sensor");

  Serial.println(F("=== Jemuran Otomatis ==="));
}

// ─── Loop ─────────────────────────────────────────────────────────────────
void loop() {
  // Debounce sensor hujan
  bool raw = readRainRaw();
  if (raw != lastRawRaining) {
    lastRawRaining = raw;
    lastChangeMs   = millis();
  }
  if (millis() - lastChangeMs >= (unsigned long)cfg.debounce_ms) {
    if (raw != confirmedRaining) {
      confirmedRaining = raw;
      applyState(confirmedRaining);
      postStatus(confirmedRaining, "auto");
      postLog(confirmedRaining, "sensor");
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
