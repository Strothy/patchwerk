# Origin: from SYB Live Cable to Patchwerk

Patchwerk replaces a Python/PySide6 prototype ("SYB Live Cable", internally also called "patchwerk", Apr–Jun 2026). A salvage audit on 2026-09-25 concluded that the code could not be saved and that its behaviour should be kept as spec.

## Why the prototype died

- **One 28.5k-line file.** `MainWindow` (8.3k lines) and `ModuleNode` (8.3k lines) held the UI, simulation and device I/O, all on one 60 Hz GUI-thread timer.
- **Copies instead of version control.** 388 full copies of that file were committed, one per revision. Git history duplicated filename versioning.
- **Errors were hidden.** 635 `except Exception` handlers, most of which printed and carried on. A native crash on "disconnect all" survived its own fix.
- **Rendering ceiling.** About 470 items were painted per frame in `QGraphicsScene`, around 66 ms per frame zoomed out. The prototype's own studies found the cause was architectural, not the language.
- **Process overhead.** Nine parallel agent tracks and a 410 KB coordination file. About a third of commits were bookkeeping.

## Salvaged (see `fixtures/`)

| What | Where |
|---|---|
| 80 module behaviours as golden I/O traces | `fixtures/modules/` |
| Module manifests (ports, controls, ranges) | `fixtures/manifests/` |
| Saved patches and blueprints | `fixtures/patches/` |
| Faceplate visual specs | `docs/design-locks/` |
| ESP32 servo firmware and calibration notes | `firmware/esp32-servo/`, `docs/SERVO_CAL_ELEVATION_PLAN.md` |

## Engine semantics to keep

- **Signals:** plain floats, conventionally 0–100. Port kinds are `signal`, `gate` and `trigger`. A gate or trigger counts as high at **≥ 0.5**.
- **Evaluation:** modules run in topological order once per tick. Feedback cycles read the previous tick's output.
- **Time:** a fixed `dt` and one simulation clock (`sim_time`) shared by all modules. Pausing sets `dt = 0`. No module may read the wall clock.
- **Cable into an input-backed knob:** it moves the knob around its base value by `raw / 100 × depth × (hi − lo)`, clamped to the range. The range is `ui.control_ranges[key]` (else the manifest's), and `depth` is `ui.control_mod_depths[key]` / 100 (default 100). If the range dips below 0, the cable is an offset in the knob's own units, `base + raw × depth`, so a bipolar LFO swings it both ways. Gate-like knobs, and 2-option input selectors, snap the cable to 0/1. Anything that is not an input-backed control takes the cable value as it is.
- **Several cables on one port:**
  - Gate and trigger ports take the max.
  - Signal ports: the first cable replaces the base value, and each later cable adds `(mapped − base)`.
  - After summing, clamp to the control's range.
- **MIDI-sourced cables** (`midi_cv` with `_midi_map=true`) map absolutely and ignore the stored base.
- **Grabbing a modulated control** snaps the display to the unmodulated base while it's held.

## Patch format (legacy, `meta.version` 1)

- **Top level:** `name, modules[], connections[], annotations, module_groups, canvas_boxes, meta`.
- **Module:** `{id, type, name, params, inputs, ui}`.
  - `ui.control_ranges`, `ui.control_mod_depths` and `ui.control_units` change behaviour; they are not just layout.
  - Params starting with `_` (e.g. `_midi_map`, `_saved_out`) carry runtime state.
- **Connection:** `{src_module, src_port, dst_module, dst_port, color_index}`.
- **Migration:** LFO input `depth` → `amp`.
- The importer should read v1 and write the new format as v2.

## Hardware protocol

- USB serial at **115200 baud**, ASCII lines ending in `\n`. The legacy firmware wants `L0NNNN` / `R0NNNN` with exactly 4 digits.
- The host sends 0–9999; the calibrated servo range lives on the ESP32.
- **MIDI:** strip the Windows enumeration suffix from device names, and persist the last CC value per device and channel.

## Safety requirements

These are mandatory, because the device is in contact with a person. The legacy app broke every one of them.

1. **Safe rest is 0.** Stop, panic, pause, disconnect and patch load all go to T-Code 0 (logical min), never to a mid value.
2. **Every exit path sends rest.** That covers a normal quit, a runtime error, a panic handler and dropping the connection. In Rust, use a `Drop` guard plus a panic hook on the output thread.
3. **Heartbeat.** The host re-sends the current value at least every 100 ms, even when it hasn't changed. The firmware watchdog slews to rest if the heartbeat stops.
4. **Device I/O owns its own thread.** A UI stall or render hitch must never delay or freeze output.
5. **Rate and range limits on the host too.** Don't rely only on the firmware's slew limit. Min/max ceilings can't be raised by modulation or MIDI mapping past a user-set hard limit.
6. **The e-stop doesn't depend on the UI.** It's a hotkey, handled at the input layer, that bypasses the patch graph.
