#pragma once
#include <Arduino.h>
#include <ESP32Servo.h>
#include "config.h"

extern Servo canopyServo;

bool readRainRaw();
void applyState(bool isRaining);
void updateLed();
