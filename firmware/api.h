#pragma once
#include <Arduino.h>
#include "config.h"

void postStatus(bool isRaining, const char* mode);
void postLog(bool isRaining, const char* source);
bool fetchConfig(); // returns true on success
void pollCommand();
