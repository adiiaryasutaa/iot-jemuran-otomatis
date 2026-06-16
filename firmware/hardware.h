#pragma once
#include <Arduino.h>
#include <ESP32Servo.h>
#include "config.h"

extern Servo canopyServo;

bool readRainRaw();
void applyState(bool isRaining);
void updateLed();
void ledPlaySequence(const LedStep* steps, uint8_t len, uint8_t repeats);
void ledSignalConfig(); // plays (. _) × 5 — call after config changes
