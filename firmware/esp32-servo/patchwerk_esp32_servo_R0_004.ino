// PATCHWERK ESP32 dual-servo controller — 270° travel
// Firmware target: ESP32 (any DevKitC / WROOM variant), 2 RC servos on PWM
// Companion GUI:   python/patchwerk_servo_cal_gui.py (serial @ 115200)
//
// Servo model assumption: hobby RC servo with 270° mechanical travel,
// PWM range 500us..2500us mapping to 0°..270°. Centre = 1500us = 135°.
// Standard 50 Hz refresh.
//
// R0.004: the RUN-mode disconnect watchdog (auto-return-to-min on serial
// silence) is DISABLED by default — on silence the device HOLDS its last
// commanded position. See kSafeRestOnSilence below.
//
// Protocol (UTF-8 lines, \n terminated):
//   RUN-mode TCode targets (continuous motion at speed limit):
//     L0####                 (L0 0..9999 → axis L0 logical min..max)
//     R0####                 (R0 0..9999 → axis R0 logical min..max)
//     L0#### R0####          (both in one frame)
//   General:
//     HELP                   print this help
//     STATUS                 print mode + per-axis state
//     MODE RUN               accept TCode targets
//     MODE CAL               accept manual GOTO/NUDGE on selected axis
//     CENTER                 snap both axes to mid of their saved range
//     STOP                   freeze: target := current
//   Calibration (MODE CAL only):
//     SEL L0 | SEL R0        choose axis for GOTO/NUDGE/SAVE
//     GOTO <deg>             move selected axis to logical degree
//     NUDGE <deg>            relative move on selected axis
//     SAVE MIN | SAVE MAX    capture current manual angle as axis bound
//     SPEED <deg/sec>        speed limit for selected axis (RUN-mode slew)
//     FACTORY                clear stored calibration + reload defaults

#include <Arduino.h>
#include <ESP32Servo.h>
#include <Preferences.h>

// ─── Pins ─────────────────────────────────────────────────────────────────
static const int kPinServoL0 = 18;
static const int kPinServoR0 = 19;

// ─── PWM / mechanical bounds ──────────────────────────────────────────────
static const int   kServoFreqHz     = 50;
static const int   kServoUsMin      = 500;    // → physical 0°
static const int   kServoUsNeutral  = 1500;   // → physical 135° (centre)
static const int   kServoUsMax      = 2500;   // → physical 270°
static const float kPhysAngleMin    = 0.0f;
static const float kPhysAngleMax    = 270.0f;

// ─── Logical (calibrated) range ───────────────────────────────────────────
// Logical angles share the same 0..270° axis as physical, but the user's
// calibrated min/max define a usable sub-range that TCode 0..9999 maps onto.
static const float kLogicalMin          = 0.0f;
static const float kLogicalMax          = 270.0f;
static const float kDefaultLogicalMin   = 30.0f;     // 30° safety margin from
static const float kDefaultLogicalMax   = 240.0f;    // each mechanical end
static const float kDefaultCenter       = 135.0f;
static const float kDefaultSpeedDegPerS = 120.0f;

// ─── Direction (compile-time) ─────────────────────────────────────────────
// +1 = logical positive turns CW (as wired); -1 = mirror.
// INVERT runtime command was dropped 2026-05-20. Re-flash to change.
static const int kDirectionL0 = -1;
static const int kDirectionR0 = -1;

// ─── Preferences schema version ───────────────────────────────────────────
// Bump when storage shape changes (e.g. range expansion to 270°).
// On mismatch we ignore old keys and store fresh defaults.
static const char* kPrefsNamespace = "patchwerk";
static const char* kPrefsKeyFwVer  = "fw_ver";
static const int   kPrefsFwVersion = 2;          // v1 = legacy 180° build

// ─── Firmware revision (informational; not a prefs trigger) ───────────────
// Printed at boot + in STATUS so the device tells you which rev is loaded.
// R0.004 = disconnect-watchdog 'slew to min on silence' DISABLED by default
//          (kSafeRestOnSilence) — fixes the MFP idle-hold snap-to-0; the
//          device now HOLDS its last commanded position on serial silence.
//          Reversible: flip kSafeRestOnSilence + re-flash.
static const char* kFirmwareRev = "R0.004";

Preferences prefs;
Servo       servoL0;
Servo       servoR0;

enum ControllerMode { MODE_RUN, MODE_CAL };
ControllerMode g_mode = MODE_RUN;

struct Axis {
  const char*  name;
  Servo*       servo;
  int          direction;        // +1 or -1

  float        logicalCurrent;   // current angle (slewed toward target)
  float        logicalTarget;    // requested angle (RUN) or manual (CAL)
  float        logicalManual;    // last manual position set via GOTO/NUDGE

  float        logicalMin;       // calibrated lower bound
  float        logicalMax;       // calibrated upper bound

  float        speedDegPerSec;   // RUN-mode slew rate
  unsigned long lastUpdateMs;
};

Axis g_axisL0 = {
  "L0", &servoL0, kDirectionL0,
  kDefaultCenter, kDefaultCenter, kDefaultCenter,
  kDefaultLogicalMin, kDefaultLogicalMax,
  kDefaultSpeedDegPerS,
  0
};

Axis g_axisR0 = {
  "R0", &servoR0, kDirectionR0,
  kDefaultCenter, kDefaultCenter, kDefaultCenter,
  kDefaultLogicalMin, kDefaultLogicalMax,
  kDefaultSpeedDegPerS,
  0
};

Axis*  g_selected = &g_axisL0;
String g_rxBuffer;

// ─── Disconnect watchdog (RUN mode only) ──────────────────────────────────
// DISABLED BY DEFAULT as of R0.004 (kSafeRestOnSilence = false).
//
// WHY: a TCode host (e.g. MultiFunPlayer) legitimately stops sending when the
// commanded position is steady/paused — serial silence does NOT mean the host
// disconnected. The firmware cannot tell "idle hold" from "disconnect" in-band
// (no host keepalive; DTR/RTS not readable on a classic ESP32 + USB-UART
// bridge), so the old "slew to logicalMin on silence" snapped the device to
// TCode 0 during a normal idle hold. With the watchdog off, on silence both
// axes simply HOLD their last commanded target (no motion) — the standard
// safe-hold behaviour for haptic gear. The PATCHWERK app still actively parks
// the device itself on stop/disconnect, so this is not its only backstop.
//
// To re-enable the auto-return-to-min backstop, flip kSafeRestOnSilence to
// true and re-flash (mirrors the compile-time INVERT/direction pattern). When
// enabled: on serial silence > kDisconnectTimeoutMs, slew both axes to their
// saved logicalMin (= TCode 0 = safe rest), MODE_RUN only (CAL exempt so
// manual GOTO/NUDGE positions stay put). g_lastCommandMs is bumped by every
// valid TCode token in parseTCodeLine and stays 0 until the first TCode after
// boot, so the boot-time centerAxis() position is held until first command.
static const bool          kSafeRestOnSilence   = false;  // R0.004: off (MFP idle-hold fix)
static const unsigned long kDisconnectTimeoutMs = 5000;   // only used when kSafeRestOnSilence
static unsigned long g_lastCommandMs = 0;

// ──────────────────────────────────────────────────────────────────────────
// Math helpers
// ──────────────────────────────────────────────────────────────────────────
static float clampf(float v, float lo, float hi) {
  return v < lo ? lo : (v > hi ? hi : v);
}

// Map logical angle (0..270 after direction flip) to servo PWM microseconds.
static int logicalAngleToMicroseconds(const Axis& a, float logicalAngle) {
  logicalAngle = clampf(logicalAngle, kLogicalMin, kLogicalMax);

  float normalized = (logicalAngle - kLogicalMin) / (kLogicalMax - kLogicalMin);
  if (a.direction == -1) normalized = 1.0f - normalized;

  return (int)(kServoUsMin + normalized * (kServoUsMax - kServoUsMin) + 0.5f);
}

static void driveServoToLogical(const Axis& a, float logicalAngle) {
  int us = logicalAngleToMicroseconds(a, logicalAngle);
  a.servo->writeMicroseconds(us);
}

// ──────────────────────────────────────────────────────────────────────────
// Preferences (per-axis: min, max, speed) — namespace versioned
// ──────────────────────────────────────────────────────────────────────────
static String keyFor(const Axis& a, const char* suffix) {
  String k = a.name;
  k += "_";
  k += suffix;
  return k;
}

static void saveAxisCalibration(const Axis& a) {
  prefs.putFloat(keyFor(a, "min").c_str(), a.logicalMin);
  prefs.putFloat(keyFor(a, "max").c_str(), a.logicalMax);
  prefs.putFloat(keyFor(a, "spd").c_str(), a.speedDegPerSec);
}

static void loadAxisCalibration(Axis& a) {
  a.logicalMin     = prefs.getFloat(keyFor(a, "min").c_str(), kDefaultLogicalMin);
  a.logicalMax     = prefs.getFloat(keyFor(a, "max").c_str(), kDefaultLogicalMax);
  a.speedDegPerSec = prefs.getFloat(keyFor(a, "spd").c_str(), kDefaultSpeedDegPerS);

  a.logicalMin = clampf(a.logicalMin, kLogicalMin, kLogicalMax);
  a.logicalMax = clampf(a.logicalMax, kLogicalMin, kLogicalMax);
  if (a.logicalMax < a.logicalMin) {
    float t = a.logicalMin;
    a.logicalMin = a.logicalMax;
    a.logicalMax = t;
  }
  if (a.speedDegPerSec < 1.0f)    a.speedDegPerSec = 1.0f;
  if (a.speedDegPerSec > 1000.0f) a.speedDegPerSec = 1000.0f;
}

static void factoryReset() {
  prefs.clear();
  prefs.putInt(kPrefsKeyFwVer, kPrefsFwVersion);

  g_axisL0.logicalMin     = kDefaultLogicalMin;
  g_axisL0.logicalMax     = kDefaultLogicalMax;
  g_axisL0.speedDegPerSec = kDefaultSpeedDegPerS;

  g_axisR0.logicalMin     = kDefaultLogicalMin;
  g_axisR0.logicalMax     = kDefaultLogicalMax;
  g_axisR0.speedDegPerSec = kDefaultSpeedDegPerS;

  saveAxisCalibration(g_axisL0);
  saveAxisCalibration(g_axisR0);
}

// ──────────────────────────────────────────────────────────────────────────
// Motion
// ──────────────────────────────────────────────────────────────────────────
static void slewAxis(Axis& a) {
  unsigned long now = millis();
  if (a.lastUpdateMs == 0) { a.lastUpdateMs = now; return; }

  float dt = (now - a.lastUpdateMs) / 1000.0f;
  if (dt < 0.01f) return;
  a.lastUpdateMs = now;

  float maxStep = a.speedDegPerSec * dt;
  float diff    = a.logicalTarget - a.logicalCurrent;

  if (fabs(diff) <= maxStep) {
    a.logicalCurrent = a.logicalTarget;
  } else {
    a.logicalCurrent += (diff > 0.0f) ? maxStep : -maxStep;
  }
  driveServoToLogical(a, a.logicalCurrent);
}

static void centerAxis(Axis& a) {
  float center = (a.logicalMin + a.logicalMax) * 0.5f;
  a.logicalCurrent = center;
  a.logicalTarget  = center;
  a.logicalManual  = center;
  driveServoToLogical(a, center);
}

static void freezeAll() {
  g_axisL0.logicalTarget = g_axisL0.logicalCurrent;
  g_axisR0.logicalTarget = g_axisR0.logicalCurrent;
}

// ──────────────────────────────────────────────────────────────────────────
// TCode parsing — handles "L0####", "R0####", "L0#### R0####"
// ──────────────────────────────────────────────────────────────────────────
static float tcodeToLogical(const Axis& a, int value) {
  value = constrain(value, 0, 9999);
  return a.logicalMin + (value / 9999.0f) * (a.logicalMax - a.logicalMin);
}

static void parseTCodeLine(const String& line) {
  int start = 0;
  while (start < (int)line.length()) {
    while (start < (int)line.length() && line.charAt(start) == ' ') start++;
    if (start >= (int)line.length()) break;

    int end = line.indexOf(' ', start);
    if (end < 0) end = line.length();

    String token = line.substring(start, end);
    token.trim();

    if (token.length() >= 3) {
      char axisType = toupper(token.charAt(0));
      char axisId   = token.charAt(1);

      if ((axisType == 'L' || axisType == 'R') && axisId == '0') {
        int i = 2;
        String digits;
        while (i < (int)token.length() && isDigit(token.charAt(i))) {
          digits += token.charAt(i);
          i++;
        }
        if (digits.length() > 0) {
          int value = digits.toInt();
          Axis& a = (axisType == 'L') ? g_axisL0 : g_axisR0;
          a.logicalTarget = tcodeToLogical(a, value);
          g_lastCommandMs = millis();   // watchdog keepalive (used when kSafeRestOnSilence)
        }
      }
    }
    start = end + 1;
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Reporting
// ──────────────────────────────────────────────────────────────────────────
static void printAxisStatus(const Axis& a) {
  Serial.printf(
    "%s | min=%.1f max=%.1f cur=%.1f tgt=%.1f man=%.1f spd=%.1f inv=%d\n",
    a.name,
    a.logicalMin, a.logicalMax,
    a.logicalCurrent, a.logicalTarget, a.logicalManual,
    a.speedDegPerSec,
    (a.direction == -1) ? 1 : 0
  );
}

static void printStatus() {
  Serial.printf("Firmware: %s\n", kFirmwareRev);
  Serial.printf("Mode: %s\n", g_mode == MODE_RUN ? "RUN" : "CAL");
  Serial.printf("SafeRestOnSilence: %s\n", kSafeRestOnSilence ? "ON" : "OFF");
  printAxisStatus(g_axisL0);
  printAxisStatus(g_axisR0);
  Serial.printf("Selected: %s\n", g_selected->name);
}

static void printHelp() {
  Serial.println();
  Serial.println("=== PATCHWERK ESP32 dual-servo (270deg) ===");
  Serial.println("RUN mode TCode targets:");
  Serial.println("  L0####");
  Serial.println("  R0####");
  Serial.println("  L0#### R0####");
  Serial.println();
  Serial.println("General:");
  Serial.println("  HELP | STATUS | MODE RUN | MODE CAL | CENTER | STOP");
  Serial.println();
  Serial.println("Calibration (MODE CAL only):");
  Serial.println("  SEL L0 | SEL R0");
  Serial.println("  GOTO <deg 0..270>");
  Serial.println("  NUDGE <+/- deg>");
  Serial.println("  SAVE MIN | SAVE MAX");
  Serial.println("  SPEED <deg/sec 1..1000>");
  Serial.println("  FACTORY    clears all calibration");
  Serial.println();
}

// ──────────────────────────────────────────────────────────────────────────
// Command dispatch
// ──────────────────────────────────────────────────────────────────────────
static void handleCommand(String line) {
  line.trim();
  if (line.length() == 0) return;

  // TCode targets (any case) — only honoured in RUN mode
  if (line.startsWith("L0") || line.startsWith("l0") ||
      line.startsWith("R0") || line.startsWith("r0")) {
    if (g_mode == MODE_RUN) parseTCodeLine(line);
    return;
  }

  String upper = line;
  upper.toUpperCase();

  if (upper == "HELP")     { printHelp();   return; }
  if (upper == "STATUS")   { printStatus(); return; }

  if (upper == "MODE RUN") {
    g_mode = MODE_RUN;
    g_axisL0.logicalTarget = g_axisL0.logicalCurrent;
    g_axisR0.logicalTarget = g_axisR0.logicalCurrent;
    Serial.println("Mode: RUN");
    return;
  }
  if (upper == "MODE CAL") {
    g_mode = MODE_CAL;
    g_selected->logicalManual = g_selected->logicalCurrent;
    Serial.println("Mode: CAL");
    return;
  }

  if (upper == "CENTER") {
    centerAxis(g_axisL0);
    centerAxis(g_axisR0);
    Serial.println("Both axes centered");
    return;
  }
  if (upper == "STOP") {
    freezeAll();
    Serial.println("Motion stopped");
    return;
  }

  if (upper == "SEL L0") {
    g_selected = &g_axisL0;
    g_selected->logicalManual = g_selected->logicalCurrent;
    Serial.println("Selected L0");
    return;
  }
  if (upper == "SEL R0") {
    g_selected = &g_axisR0;
    g_selected->logicalManual = g_selected->logicalCurrent;
    Serial.println("Selected R0");
    return;
  }

  if (upper.startsWith("GOTO ")) {
    if (g_mode != MODE_CAL) { Serial.println("GOTO requires MODE CAL"); return; }
    float v = line.substring(5).toFloat();
    g_selected->logicalManual  = clampf(v, kLogicalMin, kLogicalMax);
    g_selected->logicalCurrent = g_selected->logicalManual;
    g_selected->logicalTarget  = g_selected->logicalManual;
    driveServoToLogical(*g_selected, g_selected->logicalManual);
    Serial.printf("%s manual: %.1f\n", g_selected->name, g_selected->logicalManual);
    return;
  }

  if (upper.startsWith("NUDGE ")) {
    if (g_mode != MODE_CAL) { Serial.println("NUDGE requires MODE CAL"); return; }
    float d = line.substring(6).toFloat();
    g_selected->logicalManual  = clampf(g_selected->logicalManual + d, kLogicalMin, kLogicalMax);
    g_selected->logicalCurrent = g_selected->logicalManual;
    g_selected->logicalTarget  = g_selected->logicalManual;
    driveServoToLogical(*g_selected, g_selected->logicalManual);
    Serial.printf("%s manual: %.1f\n", g_selected->name, g_selected->logicalManual);
    return;
  }

  if (upper == "SAVE MIN") {
    g_selected->logicalMin = g_selected->logicalManual;
    if (g_selected->logicalMin > g_selected->logicalMax) {
      float t = g_selected->logicalMin;
      g_selected->logicalMin = g_selected->logicalMax;
      g_selected->logicalMax = t;
    }
    saveAxisCalibration(*g_selected);
    Serial.printf("%s MIN saved: %.1f\n", g_selected->name, g_selected->logicalMin);
    return;
  }
  if (upper == "SAVE MAX") {
    g_selected->logicalMax = g_selected->logicalManual;
    if (g_selected->logicalMax < g_selected->logicalMin) {
      float t = g_selected->logicalMin;
      g_selected->logicalMin = g_selected->logicalMax;
      g_selected->logicalMax = t;
    }
    saveAxisCalibration(*g_selected);
    Serial.printf("%s MAX saved: %.1f\n", g_selected->name, g_selected->logicalMax);
    return;
  }

  if (upper.startsWith("SPEED ")) {
    float spd = line.substring(6).toFloat();
    g_selected->speedDegPerSec = clampf(spd, 1.0f, 1000.0f);
    saveAxisCalibration(*g_selected);
    Serial.printf("%s speed: %.1f deg/sec\n", g_selected->name, g_selected->speedDegPerSec);
    return;
  }

  if (upper == "FACTORY") {
    factoryReset();
    centerAxis(g_axisL0);
    centerAxis(g_axisR0);
    Serial.println("Factory defaults restored (range 30..240, speed 120, center 135)");
    return;
  }

  Serial.print("Unknown command: ");
  Serial.println(line);
}

// ──────────────────────────────────────────────────────────────────────────
// Setup / loop
// ──────────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(300);

  prefs.begin(kPrefsNamespace, false);

  // Schema-version gate: if storage is from older firmware, wipe and re-seed.
  int storedVersion = prefs.getInt(kPrefsKeyFwVer, 0);
  if (storedVersion != kPrefsFwVersion) {
    Serial.printf("Prefs version %d != %d, applying factory reset\n",
                  storedVersion, kPrefsFwVersion);
    factoryReset();
  } else {
    loadAxisCalibration(g_axisL0);
    loadAxisCalibration(g_axisR0);
  }

  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  servoL0.setPeriodHertz(kServoFreqHz);
  servoR0.setPeriodHertz(kServoFreqHz);
  servoL0.attach(kPinServoL0, kServoUsMin, kServoUsMax);
  servoR0.attach(kPinServoR0, kServoUsMin, kServoUsMax);

  centerAxis(g_axisL0);
  centerAxis(g_axisR0);
  g_axisL0.lastUpdateMs = millis();
  g_axisR0.lastUpdateMs = millis();

  Serial.printf("PATCHWERK ESP32 dual-servo (270deg) %s ready\n", kFirmwareRev);
  printHelp();
  printStatus();
}

void loop() {
  while (Serial.available()) {
    char c = (char)Serial.read();
    if (c == '\n' || c == '\r') {
      if (g_rxBuffer.length() > 0) {
        handleCommand(g_rxBuffer);
        g_rxBuffer = "";
      }
    } else {
      g_rxBuffer += c;
      if (g_rxBuffer.length() > 200) g_rxBuffer = "";   // overflow guard
    }
  }

  if (g_mode == MODE_RUN) {
    // Disconnect watchdog (default OFF — see kSafeRestOnSilence). When ON: on
    // serial silence beyond the timeout, re-aim both axes at their saved
    // logicalMin (TCode 0); slewAxis() carries them there at each saved speed.
    // When OFF (R0.004 default): silence is harmless — both axes hold their
    // last commanded target, so a steady/idle TCode host (e.g. MFP that stops
    // sending while paused) no longer snaps the device to the bottom.
    if (kSafeRestOnSilence &&
        g_lastCommandMs != 0 && (millis() - g_lastCommandMs) > kDisconnectTimeoutMs) {
      g_axisL0.logicalTarget = g_axisL0.logicalMin;
      g_axisR0.logicalTarget = g_axisR0.logicalMin;
    }
    slewAxis(g_axisL0);
    slewAxis(g_axisR0);
  }
}
