#include "hardware.h"

// (. _) × 5 : dot=150ms, dash=400ms
static const LedStep SEQ_CONFIG[] = {
  {150, true}, {150, false}, {400, true}, {400, false}
};

// (_ . _ . _ .) : alternating dash/dot with 150ms gaps, 400ms trailing gap
static const LedStep SEQ_SERVO[] = {
  {400, true}, {150, false},
  {150, true}, {150, false},
  {400, true}, {150, false},
  {150, true}, {150, false},
  {400, true}, {150, false},
  {150, true}, {400, false},
};

static const LedStep* seqSteps    = nullptr;
static uint8_t        seqLen      = 0;
static uint8_t        seqRepeats  = 0;
static uint8_t        seqStep     = 0;
static uint8_t        seqRepsDone = 0;
static unsigned long  seqDeadline = 0;

void ledPlaySequence(const LedStep* steps, uint8_t len, uint8_t repeats) {
  seqSteps    = steps;
  seqLen      = len;
  seqRepeats  = repeats;
  seqStep     = 0;
  seqRepsDone = 0;
  seqDeadline = millis();
}

void ledSignalConfig() {
  ledPlaySequence(SEQ_CONFIG, COUNTOF(SEQ_CONFIG), 5);
}

bool readRainRaw() {
  return digitalRead(Pin::RAIN_SENSOR) == (cfg.rain_active_low ? LOW : HIGH);
}

void applyState(bool isRaining) {
  canopyServo.write(isRaining ? cfg.angle_closed : cfg.angle_open);
  ledPlaySequence(SEQ_SERVO, COUNTOF(SEQ_SERVO), 1);
}

void updateLed() {
  if (seqSteps) {
    if (millis() >= seqDeadline) {
      digitalWrite(Pin::LED, seqSteps[seqStep].on ? HIGH : LOW);
      seqDeadline = millis() + seqSteps[seqStep].ms;

      if (++seqStep >= seqLen) {
        seqStep = 0;
        if (++seqRepsDone >= seqRepeats) seqSteps = nullptr;
      }
    }
    return;
  }

  // Idle: LED off — only sequences light it
  if (ledState) {
    ledState = false;
    digitalWrite(Pin::LED, LOW);
  }
}
