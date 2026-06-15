#include "api.h"
#include "hardware.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ─── HTTP helpers ─────────────────────────────────────────────────────────

static String apiGet(const String& path) {
  if (WiFi.status() != WL_CONNECTED) return "";
  HTTPClient http;
  http.begin(String(API_BASE) + path);
  http.addHeader("x-api-key", API_KEY);
  int code = http.GET();
  String body = (code > 0) ? http.getString() : "";
  http.end();
  return body;
}

static bool apiPost(const String& path, const String& body) {
  if (WiFi.status() != WL_CONNECTED) return false;
  HTTPClient http;
  http.begin(String(API_BASE) + path);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", API_KEY);
  int code = http.POST(body);
  http.end();
  return code >= 200 && code < 300;
}

static bool apiPatch(const String& path) {
  if (WiFi.status() != WL_CONNECTED) return false;
  HTTPClient http;
  http.begin(String(API_BASE) + path);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", API_KEY);
  int code = http.sendRequest("PATCH", "{}");
  http.end();
  return code >= 200 && code < 300;
}

// ─── API calls ────────────────────────────────────────────────────────────

void postStatus(bool isRaining, const char* mode) {
  JsonDocument doc;
  doc["status"]      = isRaining ? "hujan" : "cerah";
  doc["servo_angle"] = isRaining ? cfg.angle_closed : cfg.angle_open;
  doc["mode"]        = mode;
  String body;
  serializeJson(doc, body);
  apiPost("/api/status", body);
}

void postLog(bool isRaining, const char* source) {
  JsonDocument doc;
  doc["status"]      = isRaining ? "hujan" : "cerah";
  doc["servo_angle"] = isRaining ? cfg.angle_closed : cfg.angle_open;
  doc["source"]      = source;
  String body;
  serializeJson(doc, body);
  apiPost("/api/logs", body);
}

void fetchConfig() {
  String resp = apiGet("/api/config");
  if (resp.isEmpty()) return;

  JsonDocument doc;
  if (deserializeJson(doc, resp)) return;

  cfg.angle_open   = doc["angle_open"]   | cfg.angle_open;
  cfg.angle_closed = doc["angle_closed"] | cfg.angle_closed;
  cfg.debounce_ms  = doc["debounce_ms"]  | cfg.debounce_ms;
  cfg.led_blink_ms = doc["led_blink_ms"] | cfg.led_blink_ms;

  if (doc["rain_active"].is<const char*>())
    cfg.rain_active_low = (strcmp(doc["rain_active"], "LOW") == 0);
  if (doc["led_mode"].is<const char*>())
    cfg.led_mode = doc["led_mode"].as<const char*>();

  Serial.println(F("[Config] diperbarui dari API"));
}

void pollCommand() {
  String resp = apiGet("/api/command/pending");
  if (resp.isEmpty() || resp == "null") return;

  JsonDocument doc;
  if (deserializeJson(doc, resp)) return;
  if (doc.isNull()) return;

  long        id      = doc["id"];
  const char* command = doc["command"];

  bool targetRaining = (strcmp(command, "close") == 0);
  confirmedRaining   = targetRaining;
  applyState(confirmedRaining);
  postStatus(confirmedRaining, "manual");
  postLog(confirmedRaining, "manual");

  apiPatch("/api/command/" + String(id) + "/executed");

  Serial.print(F("[Command] eksekusi: "));
  Serial.println(command);
}
