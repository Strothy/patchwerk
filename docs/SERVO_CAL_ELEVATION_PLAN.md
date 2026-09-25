# Servo Calibration Tool — Elevation Plan

> From "quick-and-dirty bench tool" → something packageable into PATCHWERK.
> Author: calib-agent · 2026-05-27 · owns `CALIBRATION_SUB/`

---

## 0. TL;DR

The fastest path to "in the app" is **not** to port the tkinter window into Qt as-is.
It's to **split the tool into two halves** and reuse what the app already has:

1. **A toolkit-free protocol/transport core** (`servo_protocol.py` + `servo_link.py`) —
   the single source of truth for "what bytes go on the wire" and "how a STATUS
   line is parsed." No tkinter, no Qt, hardware-free unit tests.
2. **Thin views on top of that core** — keep the current tkinter window as the
   standalone bench tool, and add a **PySide6 "Servo Calibration" panel** that the
   main app can host. The Qt panel borrows the app's **existing `SerialOutputManager`**
   (`main_app/syb_hardware.py`) instead of opening its own port — which structurally
   removes the COM-port tug-of-war we hit today.

Everything else (live dial gauges, e-stop, profiles, streaming telemetry) layers on
top of that core cleanly. Recommended target = **Option C (shared core + both views)**.

---

## 1. Honest assessment of what exists today

`python/patchwerk_servo_cal_gui.py` (530 lines, one `CalibrationApp(tk.Tk)` class).

Strengths:
- It works, it's readable, the threaded `SerialLink` with an rx queue is a sound pattern.
- The README documents the protocol and the 270° rationale well.

Limitations that block "package into the app":

| # | Limitation | Why it blocks elevation |
|---|---|---|
| L1 | **Toolkit mismatch** — tkinter; the app is PySide6/Qt. | You can't embed a tk widget in a Qt app. Needs a Qt view. |
| L2 | **No protocol abstraction** — frames are inline f-strings (`f"GOTO {angle:.1f}"`, `f"L0{l0:04d} R0{r0:04d}"`). | The wire format now lives in **3 places** (this GUI, the app's `_build_tcode_frame`, the firmware parser). They *will* drift. |
| L3 | **No model/view split** — serial logic, parsing, and tk `Var`s are all tangled in one God-class. | Can't reuse the logic from a Qt view or a test without dragging in tkinter. |
| L4 | **Fragile STATUS parsing** — `startswith`/`split` with a blanket `except: pass`. | A malformed line silently does nothing; no structured `AxisStatus`. |
| L5 | **Text-only feedback** — no visual servo position. | A 270° tool that can't *show* you 270° feels quick-and-dirty. |
| L6 | **No safety affordances** — no prominent e-stop, no arm/disarm, no confirm on big jumps. | In CAL mode a `GOTO 30→240` is an **instant full-speed jump** (firmware only slews in RUN mode); a hardware tool needs guards. |
| L7 | **No disconnect/hotplug handling** — reader thread just emits `[SERIAL ERROR]` forever. | Unplugging the ESP32 leaves the UI in a lying "connected" state. |
| L8 | **Auto-STATUS clobbers fields** — `_sync_selected_axis_fields` overwrites the manual-angle entry even while you type in it. | Minor, but the kind of papercut a packaged tool can't have. |
| L9 | **No port arbitration** — both this tool and the app want the one COM port. | Exactly today's conflict. Disappears if the in-app panel shares the app's serial manager. |
| L10 | **No tests, no packaging** — hand-rolled venv, no entry point, no round-trip tests. | Can't ship or CI it. |

---

## 2. Where it could live — three target shapes

**Option A — In-app PySide6 dialog only.** A "Servo Calibration…" entry in the app's
Tools menu opens a Qt dialog that drives the device through the app's `SerialOutputManager`.
- ✅ One serial owner, one design language, no separate process.
- ❌ Can't calibrate without launching the whole app; loses the standalone bench tool.

**Option B — Polished standalone Qt app.** Replace the tk window with a distributable
Qt app (its own packaging).
- ✅ Bench-friendly, independent of the app.
- ❌ Still a second serial stack; still duplicates protocol logic unless we extract a core.

**Option C — Shared core + both views (RECOMMENDED).** Extract a toolkit-free core; keep
a thin standalone view (tk now, Qt later) **and** an in-app Qt panel, both on the same core.
- ✅ One protocol source of truth; standalone bench tool survives; in-app panel shares the
  app's serial manager; everything is unit-testable.
- ❌ More upfront refactor — but it's the only option that doesn't create a third copy of
  the wire format.

---

## 3. The refactor that unlocks all three: a shared protocol core

Two new modules under `CALIBRATION_SUB/python/` (later promotable to `syb_core/` so the
app imports the *same* code — coordinate via RELAY since `syb_core/` is module-dev's tree):

### `servo_protocol.py` — pure, no I/O, no toolkit
- Constants synced to the `.ino` (`US_MIN=500`, `US_MAX=2500`, `ANGLE_MAX=270`,
  `CENTER=135`, `TCODE_MAX=9999`, default min/max/speed). One place; a test asserts they
  match the firmware header so drift fails CI.
- Command builders returning the exact wire string:
  `mode_run()`, `mode_cal()`, `sel(axis)`, `goto(deg)`, `nudge(delta)`, `save_min()`,
  `save_max()`, `speed(dps)`, `center()`, `stop()`, `factory()`,
  `tcode(axis, value_0_9999)`, `tcode_frame({L0:..,R0:..})`.
- `angle_to_us(deg, direction)` / `us_to_angle()` — a Python mirror of the firmware map,
  so the gauge can show µs and the tool can sanity-check the firmware.
- A **STATUS grammar**: parse `L0 | min=.. max=.. cur=.. tgt=.. man=.. spd=.. inv=..`
  → `AxisStatus(min,max,cur,tgt,man,spd,inverted)` and `Mode:`/`Selected:` lines →
  `DeviceStatus`. Replaces L4's fragile parsing; fully unit-testable with canned lines.

### `servo_link.py` — transport, framework-agnostic
- The current threaded `SerialLink`, but emitting parsed events via a callback/queue
  (no tk/Qt import), plus: **disconnect detection** (flip to a real "disconnected" state
  instead of spamming errors) and optional **auto-reconnect / hotplug** by polling
  `list_ports`.

Then the views get thin: the tk window keeps its widgets but calls `servo_protocol`
builders; a Qt panel does the same.

---

## 4. UX elevation (what stops it feeling quick-and-dirty)

- **Per-axis 270° arc gauge** — live `cur` needle, a ghost `tgt` needle, a shaded wedge for
  the calibrated `min..max`, a centre tick at 135°, and the live µs. This is the single
  biggest "feels like a product" win and maps directly onto PATCHWERK's existing rotary/arc
  primitives (`RotaryKnobV3` / `syb_core/design`) in the Qt view.
- **Connection state machine** with an honest indicator: `disconnected → connecting →
  connected → device-confirmed (got first STATUS) → error`.
- **Safety layer** (see §6 of the brief — hardware caution): a prominent **E-STOP**
  (sends `STOP`), an **arm/disarm** gate before any GOTO/NUDGE/TCode, a **confirm on
  large jumps** (e.g. > 45° in CAL where the move is instantaneous), and a visual
  **soft-limit band** so you can't accidentally drive past saved bounds.
- **Calibration profiles to disk** — export/import the per-axis min/max/speed to a JSON
  file (the firmware already persists to NVS; a file lets you back up / clone / diff cals).
  Share the schema with the app's `SerialOutputManager.export_profiles_dict`.
- **Firmware handshake banner** — show `fw_ver` and axis set; warn loudly if the firmware
  is older/newer than the tool expects.
- **Don't clobber fields while editing** (fix L8): only sync entry widgets from STATUS when
  the field isn't focused.

---

## 5. Firmware companion changes (we own `CALIBRATION_SUB/firmware/`)

Small, additive, enable the UX above:
- **`STREAM ON [hz]` / `STREAM OFF`** — opt-in telemetry so the gauges move smoothly
  (today the GUI must poll STATUS at 1.5 s; far too slow for a live needle). Default OFF;
  bounded rate; RUN-mode only.
- **Machine-readable identity line on boot/`VER`** — e.g. `FW patchwerk-servo v2 AXES=L0,R0
  US=500..2500 ANGLE=0..270` — lets the tool verify it's talking to the firmware it thinks.
- **Optional `ACK`/`NAK` consistency** so the tool can confirm a SAVE actually landed
  rather than inferring from the echoed STATUS.

(These are firmware-only and within our track; they don't touch the app.)

---

## 6. Cross-track finding — app ↔ firmware protocol reconciliation

Read of the app's `main_app/syb_hardware.py` `SerialOutputManager._build_tcode_frame`
vs the firmware `parseTCodeLine`. The app emits frames like **`L05000I20`** (one axis per
line). Three things the mainline serial-out bench session should know (RELAY'd):

1. **The firmware ignores the `I<interval>` move-time suffix.** Its TCode parser reads
   contiguous digits after `L0`/`R0` and stops at the `I`; the leftover `I20` is dropped.
   Device velocity is governed by the **NVS-saved SPEED limit (per axis)**, *not* the app's
   frame interval. → To change how fast the servo travels, **calibrate SPEED**, not the
   app's `interval_ms` (which only rate-limits *send* frequency).
2. **This firmware accepts only `L0` and `R0`.** The parser requires the second char to be
   `'0'` and the first to be `L`/`R`, so `L1/L2/R1/R2` and `C*/D*/E*` from
   `TCODE_AXIS_OPTIONS` are silently ignored. A `serial_axis_out` module must be assigned
   **axis L0 or R0** to drive this 2-servo build (it's a strict subset of the 6-axis SR6).
3. **TCode 0..9999 maps to the device's *calibrated* logical min..max**, not raw 0..270°,
   and direction is mirrored (`kDirection=-1`). So app value 0→saved-min, 100→saved-max,
   and physical sweep direction depends on the firmware constant. Calibration in this tool
   therefore defines the app's usable output range end-to-end.

None of this requires an app change today — it's a compatibility map. If mainline wants the
app to honor true interval-timed moves or the full 6-axis set, that's a firmware decision on
our side; coordinate via RELAY.

---

## 7. Packaging

- **Standalone:** add a `pyproject.toml` with a `patchwerk-servo-cal` console entry point and
  pin `pyserial`; `pip install -e .` replaces the hand-made venv. Optionally a PyInstaller
  one-file build for a no-Python bench machine.
- **In-app:** the Qt panel ships as a module the main app imports. Because `main_app/` is
  mainline's tree, the in-app view + its Tools-menu hook are **delivered to mainline via
  RELAY**; we own the shared core + the standalone view.

---

## 8. Phased roadmap (each phase independently shippable; ★ = testable headless, no hardware)

**P1 — Foundation + de-bloat ★ (the big one; zero hardware, no new toolkit, no behaviour change beyond the listed fixes)**
The keystone. Extract the core, move the tk GUI onto it, and cut the bloat + fix the
ride-along gaps in the same pass — all unit-testable without an ESP32.
- *Extract* `servo_protocol.py`: command builders (`goto/nudge/save_min/save_max/speed/sel/
  mode_run/mode_cal/center/stop/factory/tcode/tcode_frame`) + a real STATUS parser
  (`AxisStatus`/`DeviceStatus`, replacing the `StringVar` dump) + the µs↔deg map +
  constants **asserted against the `.ino` header** so drift fails CI.
- *Extract* `servo_link.py`: the `SerialLink` transport + **disconnect detection** (kill the
  `[SERIAL ERROR]` flood → flip to a real disconnected state).
- *Refactor* the tk GUI onto both cores.
- *Cut bloat (cut-list):* (1) editable **Baud** → constant; (2) drop the **duplicate
  "Apply SPEED"** button; (3) on-screen **Workflow/Notes walls** → a Help dialog; (4)
  replace the blanket **`except: pass`** swallows with surfaced errors.
- *Fill ride-along gaps:* structured status (above), **no-clobber-while-editing**,
  cancel `_run_slider_job` on close.
- *Tests:* round-trip every command; parse canned STATUS lines; constants-match-firmware;
  fake-serial disconnect flips state. **Gate:** suite green + py_compile + same commands on the wire.

**P2 — Safety + connection UX (logic ★ headless; verify live at the bench)**
The behaviour-changing safety gaps — built headless, signed off on real hardware.
- Prominent **E-STOP** (sends `STOP`), **arm/disarm** gate before any GOTO/NUDGE/TCode,
  **confirm on large CAL jumps** (> threshold°, since CAL moves are instantaneous).
- Honest **connection state machine** (`disconnected→connecting→connected→device-confirmed
  →error`) wired to P1's disconnect detection.
- **Port hotplug watch** + **remember last port/speed** across launches.
- *Tests:* arm-gate + jump-threshold logic headless; live confirm at the bench.

**P3 — Firmware companion (our track, `CALIBRATION_SUB/firmware/`)**
- `STREAM ON [hz]`/`STREAM OFF` telemetry (smooth gauges; today's 1.5 s poll is too slow),
  machine-readable `VER`/identity line, `ACK`/`NAK` on `SAVE`. Tool consumes the stream +
  verifies firmware identity on connect.

**P4 — PySide6 view + 270° gauges**
- Qt view on the same cores; per-axis **270° arc gauge** (live `cur` needle, ghost `tgt`,
  `min..max` wedge, 135° centre tick, live µs) using the app's rotary/arc primitives.
- Calibration **profiles export/import to disk** (schema shared with the app's
  `SerialOutputManager.export_profiles_dict`).

**P5 — In-app integration**
- Qt panel **borrows the app's `SerialOutputManager`** → one port owner, conflict dissolved.
- RELAY the Tools-menu hook to mainline (they own `main_app/`). Optionally promote the shared
  core into `syb_core/` so the app imports the *same* protocol code (RELAY to module-dev).

**P6 — Packaging**
- `pyproject.toml` + `patchwerk-servo-cal` console entry point (replaces the hand-made venv);
  optional PyInstaller one-file build for a no-Python bench machine.

> **Why P1 carries the cut-list + ride-along gaps:** they all live in the same functions the
> extraction already rewrites (the parser, the reader, the command senders), they need no
> hardware, and they're covered by the same unit suite — so doing them together is strictly
> cheaper than a separate cleanup pass, and P1 still ships as "no behaviour change" bar the
> four intended fixes. Safety (P2) is split out only because it changes behaviour and wants a
> live hardware sign-off.

---

## 9. Risks / constraints

- **One COM-port owner.** Until P6, the standalone tool and the app still can't both hold the
  port — coordinate live (today's situation). P6 dissolves it for the in-app case.
- **`syb_core/` ownership.** Promoting the core so the app imports the *same* file touches
  module-dev's tree — RELAY, don't edit directly. Until then the core lives in
  `CALIBRATION_SUB/python/` and the app keeps its own `_build_tcode_frame` (P1 just documents
  the shared format; convergence is a later, coordinated step).
- **Firmware/tool version lockstep.** `STREAM`/`VER` must stay backward-tolerant so an old
  firmware + new tool degrades to poll-mode rather than breaking.
- **Hardware caution throughout.** Every new path that can move a servo stays behind explicit
  arm/confirm (CLAUDE.md §Hardware output caution).

---

## 10. Function-by-function audit (keep / bloat / gap)

Honest pass over `patchwerk_servo_cal_gui.py`. Most of it is fine — the bloat is concentrated.

### `SerialLink` (transport) — the cleanest part, KEEP almost whole
| Function | Verdict | Note |
|---|---|---|
| `__init__` | **keep** | sound: thread + Event + write lock + rx queue. Seed of `servo_link.py`. |
| `connect` | **keep** | calls `disconnect()` first — good hygiene. |
| `disconnect` | **keep** | joins reader, closes port. |
| `is_connected` | **keep** | trivial wrapper, harmless. |
| `send_line` | **keep** | strip + `\n` + utf-8 + lock + flush. Solid. |
| `_reader_loop` | **keep + FIX** | **GAP:** on a closed/unplugged port it floods the rx queue with `[SERIAL ERROR]` every 0.2 s forever — never flips to a real "disconnected" state. Needs disconnect detection. |

### `CalibrationApp` (everything else)
| Function | Verdict | Note |
|---|---|---|
| `__init__` | keep | **minor bloat:** `baud_var` is user-editable but the firmware baud is hardcoded 115200 — should be a constant, not a field. |
| `_build_ui` / `_build_connection_bar` / `_build_mode_bar` | keep | reasonable IA. |
| `_build_main_area` | keep | **bloat:** the static 10-step "Workflow" + "Notes" text panels (~35 lines of literal text) duplicate the README baked into the UI. Move to tooltips / a Help dialog. |
| `refresh_ports` | keep | manual-only; no hotplug watch (gap). |
| `connect_serial` / `disconnect_serial` | keep | good (auto-STATUS 300 ms after connect). |
| `send` | keep | core. Becomes a `servo_protocol` caller. |
| `apply_axis_selection` / `goto_manual_angle` / `nudge` / `apply_speed` | keep | clamps are correct. **Redundancy:** there are **two** "Apply SPEED" buttons wired to the same `apply_speed` (mode-bar + cal panel) — drop one. |
| `send_raw` | keep | power-user; fine for a bench tool, hide behind "advanced" in a packaged build. |
| `confirm_factory_reset` | keep | already has the right confirm-dialog pattern — the template for arm/confirm elsewhere. |
| `_schedule_tcode_send` / `_send_tcode_now` | keep | debounce is correct and good. |
| `_toggle_auto_status` / `_schedule_status_poll` | keep | clean cadence. |
| `_pump_serial` | keep | rx drain + log + parse. |
| `_parse_status_line` | keep + **FIX** | **GAP:** parses into `StringVar`s, returns no structured data → can't feed a gauge or a test. Replace with a real `AxisStatus`/`DeviceStatus` (→ §3). |
| `_sync_selected_axis_fields` | keep + **FIX** | **bug L8:** overwrites the manual-angle field even while you're typing in it. **bloat:** blanket `except Exception: pass` swallows real parse errors (classic defensive-overkill). |
| `log` | keep | fine. |
| `_on_close` | keep + tiny fix | cancels `_status_poll_job` but not `_run_slider_job` (harmless on exit). |

### Firmware `.ino`
- **Keep:** the 3-field axis model (`logicalCurrent`/`logicalTarget`/`logicalManual`) is **not** bloat — `logicalManual` is the anchor `SAVE MIN/MAX` captures. The schema-version gate, `tcodeToLogical`, `slewAxis`, `centerAxis`/`freezeAll` are all earning their keep.
- **Mild bloat:** `printHelp()` is a big wall of `Serial.println` that duplicates the header comment + README. Harmless on an ESP32; trim if you want.
- **Gaps (firmware, our track):** no telemetry stream (forces 1.5 s polling — too slow for a live needle), no machine-readable version/identity line, no `ACK` on `SAVE` (you infer success from the echoed STATUS), and direction is compile-time only (a backwards-wired servo needs a reflash).

### Net: concrete cut-list + fill-list
**Cut (bloat):** editable Baud field → constant · one of the two "Apply SPEED" buttons · on-screen Workflow/Notes walls → Help dialog · blanket `except: pass` swallows.
**Fill (gaps):** disconnect detection in the reader · structured `AxisStatus` (unblocks gauges + tests) · no-clobber-while-editing · e-stop/arm gate + big-jump confirm · port hotplug watch · remember last port/speed across launches · (firmware) `STREAM` + `VER` + `ACK`.
**Keep (good bones):** all of `SerialLink`, the command methods, the debounced TCode sender, the factory-reset confirm pattern, the poll cadence, the mode/cal/save button layout.

---

## 11. Firmware 270° correctness audit

Code review of `firmware/patchwerk_esp32_servo/patchwerk_esp32_servo.ino` (the 270° rewrite,
commit `2e20240`). **No local compile possible** — ESP32Servo isn't vendored and there's no
`arduino-cli` here; this is review-only until flashed.

### Verdict: the logic is correct for 270° servos.
- **Uses `writeMicroseconds`, never `.write(deg)`** — the legacy 180° cap (`Servo.write` tops
  out at 180°) is gone. The whole drive path is `driveServoToLogical → writeMicroseconds`. ✓
- **Linear map 500–2500 µs ↔ 0–270°**, 1500 µs = 135° centre (`logicalAngleToMicroseconds`),
  with correct nearest-rounding and a clamp to 0..270. ✓
- **Init order is correct:** `allocateTimer` → `setPeriodHertz(50)` → `attach(pin, 500, 2500)`,
  one LEDC timer per servo. ✓
- **Schema gate** bumps `fw_ver` to 2 and wipes legacy 180°-era NVS values on first boot. ✓
- **Calibrated min/max + speed** persisted per axis; defaults 30°/240°/120°·s⁻¹ give sane
  safety margins off both mechanical ends. ✓

### Caveats to verify — physical / config, NOT code bugs
- **(A) The 500–2500 µs ↔ 0–270° assumption is servo-specific.** It's the *common* 270° spec
  but there is no universal standard. **After flashing:** `MODE CAL`, then `GOTO 0` and
  `GOTO 270`, and confirm the servo reaches your intended extremes without buzzing/straining
  against a hard stop. Then use `SAVE MIN`/`SAVE MAX` to park the usable range *inside* the
  real travel — that's exactly what keeps you off the stops.
- **(B) ESP32Servo pulse clamp.** Current madhephaestus/ESP32Servo constrains
  `writeMicroseconds` to the `attach(pin,min,max)` bounds, and its absolute MIN/MAX_PULSE_WIDTH
  are 500/2500 — so 500/2500 reach both ends. Some older forks inherited classic-Servo limits
  (544/2400) which would clip ~6° off each end. The GOTO 0/270 reach test in (A) confirms which
  you have; if it can't reach the ends, check the installed ESP32Servo version.
- **(C) POWER — the most likely real-world gotcha.** Two 270° servos (often higher torque/
  current) must run from a separate 5–6 V supply with a **common ground** to the ESP32 — NOT
  the board's USB 5 V rail. Under-power → brownout resets, jitter, missed motion. Most relevant
  *while wiring now*.
- **(D) Boot snap.** `setup()` drives both axes to centre immediately on power-up — expect the
  snap; mount the servos before powering.
- **(E) Direction is compile-time** (`kDirectionL0/R0 = -1`, both mirrored). A backwards-turning
  servo needs the constant flipped + a reflash — there's no runtime INVERT.
- **(F) 50 Hz refresh** is safe for analog/standard digital servos; some digital 270° servos
  accept higher rates for snappier response, but 50 Hz always works.

### Optional firmware hardening (propose; needs a flash to verify — bundle into P3)
- Promote the µs endpoints to a clearly-labelled top-of-file config block, and consider
  **per-axis** `usMin/usMax` if the two servos are different models.
- An optional runtime `RANGE <usMin> <usMax>` command so the pulse window can be set without
  recompiling (pairs with the cal tool). Overlaps the P3 firmware pass (`STREAM`/`VER`/`ACK`) —
  do all firmware changes in one flash-and-bench-verify round.

---

## 12. Build log

- **2026-05-27 — Legacy frozen** (`9306e84`): dark GPT tool snapshotted to
  `patchwerk_servo_cal_gui_legacy.py`.
- **2026-05-27 — P1 DONE** (`c0e31a5`): `servo_protocol.py` + `servo_link.py` extracted,
  tk GUI refactored onto them, 4 bloat cuts + ride-along gap fixes, 17 unit tests. Headless.
- **2026-05-27 — Firmware audit + servo confirmed** (§11): logic correct for 270°; diymore
  25KG = DS3225-270 class, datasheet matches firmware → no firmware change needed.
- **2026-05-27 — P4 DONE** (Qt view): `servo_cal_gauge.py` (270° arc gauge), `servo_cal_panel.py`
  (embeddable `QWidget` with a **link-injection seam** for in-app use), `servo_cal_qt.py`
  (standalone launcher). 3 offscreen tests (build / structured-parse / gauge render / injected-link
  seam / malformed-no-crash) → suite now 20/20. Runs on the app's root venv (PySide6 6.11).
- **2026-05-27 — In-app entry point** (`d679c86`): `servo_cal_app.open_servo_cal_dialog`
  (frees the app's write-only serial port, hosts the panel which owns the port for the cal
  session). 3 offscreen tests → suite 23/23.
- **2026-05-27 — P5 LANDED** (mainline `main_app/patchwerk_R0_053.py`): Tools ▸ "Servo
  Calibration…" QAction → guarded lazy `open_servo_cal_dialog(self, self.output_manager)`;
  `CALIBRATION_SUB/python` added to `sys.path`. calib verified the app import chain offscreen
  (imports + builds + frees port + parses STATUS) + R0_053 py_compile clean. **Servo
  Calibration is now integrated into PATCHWERK.** Next: live hardware test at the bench.
- **2026-05-27 — Live hardware 270° rework CONFIRMED** (user at bench): user verified the
  270° servos move correctly via the **legacy GUI** *and* **MultiFunPlayer** driving the ESP32
  over COM3 — both exercise the firmware's 500–2500 µs ↔ 0–270° map end-to-end, so the
  `2e20240` rework is **hardware-validated** (not just review-confirmed). Servo: diymore 25KG
  270° (§above), datasheet-exact to firmware.
- **DEFERRED (user, other priorities)** — live-test of the **supported in-app panel**
  (R0.053 ▸ Tools ▸ Servo Calibration) on hardware: coordinate the COM3 handover (MFP currently
  owns the port), Connect/STATUS → MODE CAL walk + SAVE MIN/MAX per axis → SPEED → power-cycle
  NVS-persist check → MODE RUN slew. User will run this in the main app at a later date.
- **2026-05-31 — P5 in-app panel LIVE-VERIFIED on hardware ✅ PASS** (`CALIB_INAPP_HW_VERIFY`,
  user at bench, panel hosted live in **R1.024** ▸ Tools ▸ Servo Calibration…). End-to-end on the
  real 270° servos over COM3 (USB-SERIAL CH340): **handover-IN** — opening the dialog freed the
  app's write-only serial (`output_manager.serial.disconnect_all()`) and the panel took the port;
  **STATUS** — per-axis L0/R0 parsed into the panel + arc gauges, fallback-to-0 on no signal OK;
  **MODE RUN** — the panel's TCode sliders drove BOTH servos through its owned port with correct
  270° direction (`dir=-1`) and speed-limited slew (firmware ignores the app's `I<interval>`,
  uses saved SPEED); **handover-BACK** — port released on Disconnect (= the same path `shutdown()`
  uses on dialog close), so the app's serial can reclaim it. SAVE MIN/MAX + power-cycle NVS-persist
  were **skipped by user choice** — the firmware cal/NVS path was already hardware-confirmed via the
  legacy GUI + MFP (above); this task only needed to prove the **P5 integration / port handover**,
  which it did. Side-fix this session: the `test_servo_protocol` drift-guard pointed at the old
  single-file firmware path (firmware moved to per-rev folders R0_001..R0_003 in `f63351e`) — now
  globs the latest rev (`5b685de`), suite **23/23**. **The supported in-app Servo Calibration path
  is hardware-validated.**
- **NEXT (follow-ups, not blocking)** — P3 (firmware STREAM/VER/ACK + optional RANGE, one flash
  pass), P2 (safety: e-stop/arm/big-jump confirm). Optional: promote cores to `syb_core/`
  (module-dev RELAY) for a shared wire format.

### Servo confirmed 2026-05-27 — diymore 25KG 270° (DMY-JL0314B, ASIN B0BD3VQQJS)
This is a **DS3225-270-class** coreless waterproof digital servo. Datasheet specs vs firmware:
- **Pulse width 500–2500 µs → 270°, neutral 1500 µs** → **EXACT match** to the firmware
  `kServoUsMin/Neutral/Max` + 0–270° map. Caveats (A) and (B) **resolved — no firmware change.**
- **Operating frequency 50–330 Hz** → firmware's 50 Hz is in range. ✓ Dead band ~3 µs.
- **Stall current ≈ 1.9 A @ 5 V / 2.3 A @ 6.8 V per servo** → two servos can pull ~4–5 A peak.
  **Size the external supply ≥ 5 A at 5–6 V, common ground to the ESP32** (caveat C, quantified).
- **Operating voltage** typically 4.8–6.8 V for DS3225 (one reseller listed up to 8.4 V — confirm
  the actual unit's max before exceeding 6.8 V).
- Idle speed ~0.14–0.18 s/60°. Mechanically the servo can sweep 270° in ~0.6–0.8 s flat-out;
  the RUN-mode SPEED limit (default 120 °/s) is well within that.
