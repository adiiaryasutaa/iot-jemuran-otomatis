# LED Confirm Blink Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Blink LED 3 times (non-blocking) when `fetchConfig()` detects that fetched config values differ from current `cfg`.

**Architecture:** Three new globals track blink state. `fetchConfig()` snapshots cfg before applying JSON, compares after, and sets the globals if any field changed. `updateLed()` checks the globals at the top of every call and runs the blink state machine before returning early — bypassing normal rain LED logic for ~900ms.

**Tech Stack:** Arduino/ESP32 C++, no external libs. No test suite — verify via Serial monitor + physical LED.

---

### Task 1: Add extern declarations to `config.h`

**Files:**
- Modify: `firmware/config.h`

- [ ] **Step 1: Add three extern declarations at the bottom of `config.h`**

Open `firmware/config.h`. After the existing `extern` block (lines 26–31), add:

```cpp
extern int           confirmBlinksRemaining;
extern unsigned long confirmBlinkDeadlineMs;
extern bool          confirmBlinkPhase;
```

Final extern block should look like:

```cpp
extern DeviceConfig    cfg;
extern bool            confirmedRaining;
extern bool            ledState;
extern unsigned long   lastLedToggleMs;
extern const char*     API_BASE;
extern const char*     API_KEY;
extern int             confirmBlinksRemaining;
extern unsigned long   confirmBlinkDeadlineMs;
extern bool            confirmBlinkPhase;
```

- [ ] **Step 2: Commit**

```bash
git add firmware/config.h
git commit -m "feat(firmware): extern declarations for confirm blink state"
```

---

### Task 2: Define globals in `firmware.ino`

**Files:**
- Modify: `firmware/firmware.ino`

- [ ] **Step 1: Add three global definitions in `firmware.ino`**

Open `firmware/firmware.ino`. After the existing LED globals block (after `unsigned long lastLedToggleMs = 0;`, around line 22), add:

```cpp
int           confirmBlinksRemaining = 0;
unsigned long confirmBlinkDeadlineMs = 0;
bool          confirmBlinkPhase      = false;
```

The globals section should look like:

```cpp
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
```

- [ ] **Step 2: Commit**

```bash
git add firmware/firmware.ino
git commit -m "feat(firmware): define confirm blink globals"
```

---

### Task 3: Trigger confirm blink in `fetchConfig()`

**Files:**
- Modify: `firmware/api.cpp`

- [ ] **Step 1: Snapshot cfg before applying JSON, compare after**

Open `firmware/api.cpp`. Replace the `fetchConfig()` function (starting at line 64) with:

```cpp
void fetchConfig() {
  String resp = apiGet("/api/config");
  if (resp.isEmpty()) return;

  JsonDocument doc;
  if (deserializeJson(doc, resp)) return;

  DeviceConfig old = cfg;

  cfg.angle_open   = doc["angle_open"]   | cfg.angle_open;
  cfg.angle_closed = doc["angle_closed"] | cfg.angle_closed;
  cfg.debounce_ms  = doc["debounce_ms"]  | cfg.debounce_ms;
  cfg.led_blink_ms = doc["led_blink_ms"] | cfg.led_blink_ms;

  if (doc["rain_active"].is<const char*>())
    cfg.rain_active_low = (strcmp(doc["rain_active"], "LOW") == 0);
  if (doc["led_mode"].is<const char*>())
    strlcpy(cfg.led_mode, doc["led_mode"].as<const char*>(), sizeof(cfg.led_mode));

  bool changed = old.angle_open      != cfg.angle_open
              || old.angle_closed    != cfg.angle_closed
              || old.debounce_ms     != cfg.debounce_ms
              || old.led_blink_ms    != cfg.led_blink_ms
              || old.rain_active_low != cfg.rain_active_low
              || strcmp(old.led_mode, cfg.led_mode) != 0;

  if (changed) {
    confirmBlinksRemaining = 3;
    confirmBlinkDeadlineMs = millis();
    confirmBlinkPhase      = false;
    Serial.println(F("[Config] diperbarui — konfirmasi blink"));
  } else {
    Serial.println(F("[Config] diperbarui dari API"));
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add firmware/api.cpp
git commit -m "feat(firmware): trigger 3x confirm blink when config values change"
```

---

### Task 4: Handle confirm blink in `updateLed()`

**Files:**
- Modify: `firmware/hardware.cpp`

- [ ] **Step 1: Add confirm blink state machine at top of `updateLed()`**

Open `firmware/hardware.cpp`. Replace the `updateLed()` function with:

```cpp
void updateLed() {
  if (confirmBlinksRemaining > 0) {
    if (millis() >= confirmBlinkDeadlineMs) {
      if (!confirmBlinkPhase) {
        digitalWrite(Pin::LED, HIGH);
        confirmBlinkPhase      = true;
        confirmBlinkDeadlineMs = millis() + 150;
      } else {
        digitalWrite(Pin::LED, LOW);
        confirmBlinkPhase      = false;
        confirmBlinkDeadlineMs = millis() + 150;
        confirmBlinksRemaining--;
      }
    }
    return;
  }

  if (!confirmedRaining) {
    digitalWrite(Pin::LED, LOW);
    ledState = false;
    return;
  }

  if (strcmp(cfg.led_mode, "solid") == 0) {
    digitalWrite(Pin::LED, HIGH);
    ledState = true;
    return;
  }

  // Mode blink — toggle setiap led_blink_ms tanpa delay()
  if (millis() - lastLedToggleMs >= (unsigned long)cfg.led_blink_ms) {
    ledState = !ledState;
    digitalWrite(Pin::LED, ledState ? HIGH : LOW);
    lastLedToggleMs = millis();
  }
}
```

- [ ] **Step 2: Verify build compiles**

In Arduino IDE: Sketch → Verify/Compile. Expected: no errors.

- [ ] **Step 3: Flash and verify via Serial monitor**

Flash to ESP32. In Serial monitor (115200 baud):
1. Change any config value in the web UI (e.g., `angle_open`)
2. Wait up to 60s for next config fetch
3. Expected Serial output: `[Config] diperbarui — konfirmasi blink`
4. Expected physical LED: 3 quick blinks (~150ms each), then resumes normal state

- [ ] **Step 4: Commit**

```bash
git add firmware/hardware.cpp
git commit -m "feat(firmware): non-blocking LED confirm blink in updateLed()"
```
