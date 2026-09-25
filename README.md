# Patchwerk

A modular patching environment for driving motion hardware. Modules, jacks and cables are patched live, like a modular synth, and the result streams to devices over T-Code serial, MIDI and funscript.

This is a clean rewrite of an earlier Python prototype (SYB Live Cable, 2026). None of that code carries over. What does carry over is its behaviour, captured as specs and golden test fixtures. See [docs/ORIGIN.md](docs/ORIGIN.md).

**Status:** pre-alpha. The engine runs 6 of the 80 legacy modules, all matching the legacy traces. The app patches modules together on a canvas and plays them live; an LFO into a scope works end to end. See [docs/ROADMAP.md](docs/ROADMAP.md).

## Run it

You need Node 24, Rust (stable) and, on Windows, WebView2.

```
npm install
npm run tauri dev        # or double-click "Patchwerk Dev.cmd"
```

Press **A** or click **+ Module**, add an `lfo` and a `scope_4ch`, drag from the LFO's `out` jack to the scope's `in1`, then press **Space** to play. To remove a cable, click it or right-click its jack. Drag the background to pan, and use the wheel to zoom.

## Layout

| Path | What |
|---|---|
| `crates/engine/` | The engine: modules, patch graph, cable mapping, fixed-rate tick thread. Plain Rust, tested headless. |
| `src-tauri/`, `src/` | The app: Tauri 2 shell and the React + TypeScript UI. |
| `e2e/` | End-to-end suites driving the running app. |
| `fixtures/` | Golden I/O traces for all 80 legacy modules, module manifests, and a corpus of saved patches. The rewrite must reproduce these. See [fixtures/README.md](fixtures/README.md). |
| `docs/ORIGIN.md` | Why the rewrite exists, what was salvaged, and the non-negotiable requirements, including safety. |
| `docs/design-locks/` | Visual specs for faceplate elements: knobs, LEDs, displays, cables. |
| `docs/SERVO_CAL_ELEVATION_PLAN.md` | Servo calibration notes for the ESP32 rig. |
| `firmware/esp32-servo/` | Reference ESP32 servo firmware (Arduino). ⚠️ Read its README before flashing. |

## Safety

This software moves physical hardware that is in contact with a person. Any change that touches device output must keep the safety rules in [docs/ORIGIN.md](docs/ORIGIN.md#safety-requirements).

## License

GPL-3.0-only. See [LICENSE](LICENSE).
