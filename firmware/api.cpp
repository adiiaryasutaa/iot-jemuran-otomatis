#include "api.h"
#include "hardware.h"
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

static WiFiClient       plainClient;
static WiFiClientSecure secureClient;

// Opens http(s) connection picking the right client by URL scheme.
// https:// → TLS without cert validation (setInsecure); http:// → plain.
static bool httpBegin(HTTPClient& http, const char* url) {
  if (strncmp(url, "https:", 6) == 0) {
    secureClient.setInsecure();
    return http.begin(secureClient, url);
  }
  return http.begin(plainClient, url);
}

// Returns response body, or "" on failure.
static String apiGet(const char* path) {
  if (WiFi.status() != WL_CONNECTED) return "";

  char url[192];
  snprintf(url, sizeof(url), "%s%s", API_BASE, path);

  HTTPClient http;
  http.setTimeout(5000);
  httpBegin(http, url);
  http.addHeader("x-api-key", API_KEY);
  
  int code = http.GET();
  Serial.printf("[GET] %s → %d\n", path, code);
  String body = (code > 0) ? http.getString() : "";
  http.end();

  return body;
}

// POST or PATCH with a JSON body; returns true on 2xx.
static bool apiSend(const char* method, const char* path, const char* body) {
  if (WiFi.status() != WL_CONNECTED) return false;

  char url[192];
  snprintf(url, sizeof(url), "%s%s", API_BASE, path);
  
  HTTPClient http;
  http.setTimeout(5000);
  httpBegin(http, url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", API_KEY);
  
  int code = http.sendRequest(method, body);
  http.end();
  
  return code >= 200 && code < 300;
}

// Builds {status, servo_angle, <key>:<value>} and POSTs to endpoint.
static void postEvent(const char* endpoint, bool isRaining, const char* key, const char* value) {
  JsonDocument doc;
  doc["status"]      = isRaining ? "close" : "open";
  doc["servo_angle"] = isRaining ? cfg.angle_closed : cfg.angle_open;
  doc[key]           = value;

  char body[96];
  serializeJson(doc, body, sizeof(body));
  apiSend("POST", endpoint, body);
}

void postStatus(bool isRaining, const char* mode) {
  postEvent("/api/status", isRaining, "mode", mode);
}

void postLog(bool isRaining, const char* source) {
  postEvent("/api/logs", isRaining, "source", source);
}

bool fetchConfig() {
  String resp = apiGet("/api/config");
  if (resp.isEmpty()) return false;

  JsonDocument doc;
  if (deserializeJson(doc, resp)) return false;

  DeviceConfig old = cfg;

  cfg.angle_open   = doc["angle_open"]   | cfg.angle_open;
  cfg.angle_closed = doc["angle_closed"] | cfg.angle_closed;
  cfg.debounce_ms  = doc["debounce_ms"]  | cfg.debounce_ms;

  if (doc["rain_active"].is<const char*>()) {
    cfg.rain_active_low = (strcmp(doc["rain_active"], "LOW") == 0);
  }

  if (doc["mode"].is<const char*>()) {
    strlcpy(cfg.mode, doc["mode"].as<const char*>(), sizeof(cfg.mode));
  }

  if (doc["servo_speed"].is<const char*>()) {
    strlcpy(cfg.servo_speed, doc["servo_speed"].as<const char*>(), sizeof(cfg.servo_speed));
  }

  bool changed = old.angle_open      != cfg.angle_open
              || old.angle_closed    != cfg.angle_closed
              || old.debounce_ms     != cfg.debounce_ms
              || old.rain_active_low != cfg.rain_active_low
              || strcmp(old.mode, cfg.mode) != 0
              || strcmp(old.servo_speed, cfg.servo_speed) != 0;

  Serial.println(changed ? F("[Config] updated") : F("[Config] unchanged"));
  if (changed) ledSignalConfig();

  return true;
}

void pollCommand() {
  String resp = apiGet("/api/command/pending");
  if (resp.isEmpty() || resp == "null") return;

  JsonDocument doc;
  if (deserializeJson(doc, resp) || doc.isNull() || !doc["id"].is<long>()) return;

  long        id      = doc["id"];
  const char* command = doc["command"] | "";

  if (!strlen(command)) return;

  bool targetRaining = (strcmp(command, "close") == 0);
  confirmedRaining = targetRaining;
  applyState(targetRaining);
  postStatus(targetRaining, "manual");
  postLog(targetRaining, "manual");

  char path[48];
  snprintf(path, sizeof(path), "/api/command/%ld/executed", id);
  apiSend("PATCH", path, "{}");

  Serial.printf("[Command] %s\n", command);
}
