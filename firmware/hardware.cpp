#include "hardware.h"

bool readRainRaw() {
  return digitalRead(Pin::RAIN_SENSOR) == (cfg.rain_active_low ? LOW : HIGH);
}

void applyState(bool isRaining) {
  canopyServo.write(isRaining ? cfg.angle_closed : cfg.angle_open);
  // LED diurus updateLed() secara non-blocking
}

void updateLed() {
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
