# ESP32 servo firmware (reference, R0.004)

This firmware was carried over unchanged from the legacy prototype. It drives two DS3225 270° servos on GPIO 18 and 19 at 50 Hz (500–2500 µs). It takes ASCII T-Code lines at 115200 baud, only `L0`/`R0`, and expects exactly 4 digits (0000–9999). The `I` suffix is ignored. Calibration (min, max, speed per axis) is stored on the device.

## ⚠️ Not safe as-is

- **The disconnect watchdog is disabled by default** (`.ino`, around line 142). If the host goes silent (crash, hang, unplugged cable), the servos hold their last position indefinitely.
- **The slew limit is bypassed on some moves.** Boot, `CENTER`, `FACTORY` and calibration `GOTO` jump at full speed.
- **`STOP` freezes the servos** where they are. It does not retract them to rest.
- **The T-Code parsing is non-standard.** A 3-digit value lands at about 10% of the intended position; a 5-digit value saturates.

Planned R0.005, required before the new host drives real hardware:
1. A heartbeat watchdog that is on by default and slews to logical min (T-Code 0).
2. Slewed boot and centering.
3. Standard fractional T-Code parsing.
4. `SPEED` limited to calibration mode.
