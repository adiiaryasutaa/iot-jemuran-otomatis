# LED Confirm Blink on Config Change

**Date:** 2026-06-16  
**Status:** Approved

## Summary

ESP32 blinks LED 3 times (non-blocking) when `fetchConfig()` detects that values fetched from the API differ from the current `cfg`. Gives physical feedback that a setting change reached the device.

## Trigger Condition

Inside `fetchConfig()` (`api.cpp`), snapshot `cfg` before applying JSON values. After applying, compare all fields. If any field differs, trigger confirm blink sequence.

Fields compared:
- `angle_open`
- `angle_closed`
- `debounce_ms`
- `led_blink_ms`
- `rain_active_low`
- `led_mode` (via `strcmp`)

## State Variables

Three new globals, defined in `firmware.ino`, extern-declared in `config.h`:

| Variable | Type | Purpose |
|---|---|---|
| `confirmBlinksRemaining` | `int` | Blink cycles left (0 = inactive) |
| `confirmBlinkDeadlineMs` | `unsigned long` | `millis()` deadline for current phase |
| `confirmBlinkPhase` | `bool` | `false` = waiting to turn ON, `true` = waiting to turn OFF |

## Blink Sequence

Each "blink" = 150ms ON + 150ms OFF. Three blinks = 900ms total.  
Sequence driven non-blocking inside `updateLed()` using `millis()`.

## Changes Per File

### `config.h`
Add three `extern` declarations.

### `firmware.ino`
Define three new globals (zero-initialized).

### `api.cpp` — `fetchConfig()`
Snapshot `cfg` before JSON apply. Compare after. Set globals if changed.

### `hardware.cpp` — `updateLed()`
At top of function: if `confirmBlinksRemaining > 0`, run blink state machine and `return` early — skips normal rain LED logic for duration of confirmation.

## Constraints

- No `delay()` — all timing via `millis()`
- Confirm blink overrides normal LED state for ~900ms
- After confirmation, normal LED behavior resumes immediately
- If config changes again during confirmation, `confirmBlinksRemaining` resets to 3
