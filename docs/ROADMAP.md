# Roadmap

Patchwerk rebuilds the legacy SYB Live Cable app as it stood when development stopped in June 2026: 83 module types, serial T-Code to an ESP32 servo rig, MIDI mapping from an AKAI MPK mini, and a canvas-first patcher. The legacy app is the reference, not the target; the rebuild fixes its safety defaults and its architecture. See [ORIGIN.md](ORIGIN.md) for what was salvaged and why.

**Stack** (the Cylix approach): Tauri 2 with a Rust backend, React 19 + TypeScript + Vite, plain CSS with theme tokens, `node --test` for TypeScript logic, `cargo test` for Rust, and a CDP-driven e2e harness.

## Architecture

```
┌──────────────── React (src/) ─────────────────┐        ┌───────── Rust (src-tauri/) ─────────┐
│ canvas: modules (DOM), cables + scopes (canvas) │ invoke │ commands: load_patch, set_input,    │
│ patch document (source of truth for editing)    │ ─────► │ set_param, transport, devices       │
│ transport, panels, settings                     │ ◄───── │ Channel<Frame>: scope + meter data  │
└─────────────────────────────────────────────────┘        │        │                            │
                                                          │  crates/engine (pure Rust, no Tauri) │
                                                          │  fixed-rate tick thread, graph,      │
                                                          │  80 modules, cable mapping           │
                                                          │        │ device I/O on its own thread │
                                                          └────────┼────────────────────────────┘
                                                                   ▼ T-Code serial → ESP32
```

- **`crates/engine` is a plain Rust library** with no UI or Tauri dependency. It holds the `Module` trait, the registry, the graph (topological order; feedback reads the previous tick), input resolution (the cable-mapping rules in ORIGIN.md), and every module. It's tested headless against `fixtures/`.
- **The engine runs on its own thread** at a fixed rate (60 Hz, the rate of the legacy fixtures) with a fixed `dt` and one sim clock. When a tick overruns, the engine catches up or drops ticks; it never stretches `dt`. The UI can stall without touching timing or output.
- **The patch document lives in the frontend.** Structural edits (add, remove, connect) send the whole patch to `load_patch`. The engine rebuilds and keeps module state by id, as the legacy engine's `preserve_from` did. Knob moves send a cheap `set_input`/`set_param`, never a rebuild.
- **High-rate data flows to the UI in batches.** Scope and meter values go through a `tauri::ipc::Channel` at about 30 Hz, and the frontend draws them on a canvas with `requestAnimationFrame`.
- **Rendering:**
  - Modules are DOM elements inside one CSS-transformed canvas layer, so zooming and panning are GPU-composited transforms, not repaints.
  - Cables and scope traces are drawn on `<canvas>`.
  - A live value repaints only its own element.
  - The legacy problem was about 470 separately painted items per frame. The M5 performance gate checks this design against it: 200 modules with live values at 60 fps.
- **Device output is owned by the engine side, never the UI.** Every safety requirement in ORIGIN.md applies.

## Milestones

Each milestone ends with something runnable and a check that proves it. Status lives in the local tracker.

### M0 Scaffold
- Tauri 2 + React + Vite project from the Cylix configs: tsconfig, oxlint, vite `strictPort`, CI, NSIS per-user.
- A Cargo workspace with `crates/engine` and `src-tauri`, and the opt-level-3 dev profile for the engine.
- The Cylix design tokens and building blocks: `index.css`, `Panel`, `ErrorBoundary`, `errlog`.
- The e2e harness (`e2e/run.mjs`, `cdp.mjs`, a `tauri.devtools.json` debug port), `Patchwerk Dev.cmd`, and a public `CLAUDE.md` with the contributor rules.
- **Check:** `npm run lint && npm test && npm run build` and `cargo test` pass; the window opens.

### M1 Engine core
- The `Module` trait, the registry built from `fixtures/manifests`, and the patch graph with topological order and previous-tick feedback.
- Input resolution: port defaults, then instance inputs, then cables. That covers range mapping, bipolar offset, depth, multi-cable sum/max and the final clamp.
- The fixed-rate tick thread: transport (start, stop, pause with `dt = 0`) and the sim clock.
- A fixture runner: every ported module replays `fixtures/modules/<type>.json` and must match to about 1e-9. It writes `lab/ported.json` for the lab.
- The first modules: `lfo`, `oscillator`, `scope_4ch`, `constant`, `add`, `multiply`.
- **Check:** `cargo test` passes the fixture scenarios for every ported module.

### M2 First light (the goal of the first build push)
- Tauri commands `load_patch`, `set_input`, `set_param` and `transport`, plus a scope Channel.
- A canvas with pan and zoom. Modules render as Cylix-style panels with knobs, selectors and jacks. Cables are dragged jack to jack and drawn on canvas.
- Transport controls in the top bar.
- A `scope_4ch` faceplate that draws live traces: time window, per-channel colour, gain and offset.
- **Check:** in the running app, add an LFO and a scope, cable them, press play, and the scope shows the wave. An e2e suite asserts that the scope receives samples matching the LFO formula.

### M3 Patch files and editing basics
- A legacy v1 importer tested on `fixtures/patches/*`, including the LFO `depth`→`amp` migration and the hidden `_` params. It saves the v2 format.
- New, Open, Save and Save As, the unsaved-changes prompt, and a Home screen with recent patches.
- **Autosave and restore-last-session.** These are new; the legacy app had neither.
- Undo/redo as whole-patch snapshots (limit 200); module drags count as undo steps.

### M4 Module waves (fixture-driven)
Port in batches, and each batch must pass its fixtures:
1. **Math and utility:** abs, add, subtract, multiply, divide, min, max, clamp, invert, scale_bias, attenuverter, crossfade, mixer4, mult, mult_2x4, vca, comparator, signal_gate, switch_4, smooth_switch, track_hold, sample_hold, slew, slew_limiter, quantize, quantizer
2. **Generators and motion:** vco, pulse, noise, particle_noise, spring_osc, gravity_attractor, waveshaper
3. **Envelopes, logic and clock:** envelope_adsr, edge_detector, gate_delay, trigger_to_gate, trigger_divider, logic_gate, sr_latch, sr_latch_4, toggle, toggle_4, counter, clock, clock_divider, clock_divider_stack, burst_gen, bernoulli_gate
4. **Sequencers:** step_seq_16, step_seq_64, euclidean_seq, pattern_gate, shift_reg_8, arp, scene_changer_8ch
5. **Monitor:** scope_tap, status_light_2, status_light_4, status_light_8

Random modules (arp, bernoulli_gate, noise, particle_noise, shift_reg_8, step_seq_16) are checked statistically: range, mean and rate. Modules fed by the host (MIDI, hotkey, manual trigger, runtime command) get hand-written specs in M8.
The duplicate pairs (quantize/quantizer, slew/slew_limiter, oscillator/vco) stay separate types so legacy patches load, but they share one implementation where their fixtures agree.

### M5 Canvas parity
- The module browser (`A`, categories, preview) and Add-module-here.
- Selection: rubber band, select all, cut/copy/paste/duplicate, delete, rename.
- Groups, boxes and annotations. Snap, grid, align, distribute, nudge.
- Frame all/selection, centre, reset zoom. Cable colour cycling, re-plugging and cable physics (cosmetic, last).
- Blueprints: save a selection, insert, and a manager.
- Every legacy shortcut (see the inventory in the tracker).
- **Performance gate:** 200 modules with live values stay at 60 fps while panning; low-detail rendering when zoomed far out.

### M6 Control parity
- Per-control ranges, modulation depth and units (`ui.control_ranges`, `control_mod_depths`, `control_units`), and an Advanced Settings panel.
- Modulation display: a modulated control shows its live value, and grabbing it snaps to the base (the legacy "grab to base").
- Knob menu (reset, min, max, custom value, unmap), inline value editor, Ctrl+wheel and Ctrl+drag for depth.
- Faceplates follow `docs/design-locks/`: knobs, sliders, buttons, LEDs, 7-segment, Nixie, scope inset.

### M7 Devices and safety
- A serial T-Code output thread inside the engine process, with every safety requirement:
  - rest = 0 on every exit path, through a `Drop` guard and a panic hook
  - a 100 ms heartbeat
  - host-side rate and range limits
  - an e-stop that doesn't go through the UI
- Port picker, profiles (serial_main, aux_1–3), baud, interval, auto-connect, and an output status bar.
- `serial_axis_out` (fixing the legacy readout typo) and `sr6_multiaxis_out`.
- **Firmware R0.005:** a heartbeat watchdog on by default that slews to rest, slewed boot, standard fractional T-Code, and `SPEED` restricted to calibration mode.
- A servo calibration panel inside the app, replacing the separate legacy tool.
- **Check:**
  - Unit tests on the output thread: rest on drop, rest on panic, heartbeat cadence, limits.
  - A bench test with the rig: unplug the cable, kill the app, and confirm the servo goes to rest.

### M8 MIDI and live control
- MIDI input with hotplug and stable device names (strip the Windows ` <N>` suffix).
- midi_cc, midi_cv, midi_lfo and midi_note_gate, with Teach.
- Map mode (Ctrl+Shift+M): absolute mapping and saved CC state.
- MIDI out: midi_out_8, midi_rx_8, and a CC monitor.
- runtime_command_8, hotkeys (F8–F12, Ctrl+1–9), hotkey_trigger, edge_mode, manual_trigger_8.
- Transport shortcuts F5, F6 and F7 (panic).

### M9 More outputs
- sr6_sim with a 3D preview.
- The T-Code WebSocket server.
- Buttplug/Intiface scalar and linear output. In the legacy app, linear never reached a device.
- funscript_recorder and export.

### M10 Release
- Persisted settings and skins (the Cylix `usePref`/skins approach) and display settings.
- Help in the app: per-module docs from `docs_gen`.
- Diagnostics and logs, the NSIS installer, and a signed release.
- A public manual.

## Parked (not before M10 unless asked)
- Automation and MIDI recorders (legacy spec only).
- Dockable panels (a legacy spec on hold).
- Faceplate Studio, an authoring tool for faceplates.
- A plugin system for third-party modules. Probably WASM; decide when someone asks.
- A batched-GL renderer. Only needed if the M5 performance gate fails with the DOM + canvas approach.

## Known legacy bugs not to carry over
- Panic, stop and neutral went to 50%, and the watchdog was disabled (see ORIGIN.md, Safety).
- The `serial_axis_out` renderer asked for `pos_disp`, but the manifest calls it `value_disp`.
- LEDs were drawn at half the recipe radius.
- `buttplug_linear_out` commands never reached a device.
- Restore-last-patch was written but never called, and display settings were never persisted.
