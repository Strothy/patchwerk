# Patchwerk

A modular patching environment for driving motion hardware. Modules, jacks and cables are patched live, like a modular synth, and the result streams to devices over T-Code serial, MIDI and funscript.

This is a clean rewrite of an earlier Python prototype (SYB Live Cable, 2026). None of that code carries over. What does carry over is its behaviour, captured as specs and golden test fixtures. See [docs/ORIGIN.md](docs/ORIGIN.md).

**Status:** pre-alpha. There's no code yet, only specs, fixtures and reference firmware.

## Layout

| Path | What |
|---|---|
| `fixtures/` | Golden I/O traces for all 80 legacy modules, module manifests, and a corpus of saved patches. The rewrite must reproduce these. See [fixtures/README.md](fixtures/README.md). |
| `docs/ORIGIN.md` | Why the rewrite exists, what was salvaged, and the non-negotiable requirements, including safety. |
| `docs/design-locks/` | Visual specs for faceplate elements: knobs, LEDs, displays, cables. |
| `docs/SERVO_CAL_ELEVATION_PLAN.md` | Servo calibration notes for the ESP32 rig. |
| `firmware/esp32-servo/` | Reference ESP32 servo firmware (Arduino). ⚠️ Read its README before flashing. |

## Safety

This software moves physical hardware that is in contact with a person. Any change that touches device output must keep the safety rules in [docs/ORIGIN.md](docs/ORIGIN.md#safety-requirements).

## License

GPL-3.0-only. See [LICENSE](LICENSE).
