# LED Recipe Lock — Section 3 of the design-language spec

_Locked 2026-05-14. This is the canonical implementation spec for the LED / indicator-lamp
element across all PATCHWERK / SYB Live Cable modules. Mainline must lift these
primitives verbatim when refactoring all existing LED draw paths (step LED rows,
seq64 LED rows, clock LEDs, status LEDs, envelope stage indicator, MIDI-learn button)._

---

## TL;DR — the lock

| Component | Recipe |
|---|---|
| **Variants (5 sub-types)** | HARDWARE (round bezel) · RECESSED (well) · PILOT LAMP (round dome) · SQUARE (1:1) · RECTANGULAR (1:N) |
| **Variant picks (R1+R2)** | HARDWARE: `HEAVY_SNAP` + `SNAP_2X` · RECESSED: `DEEP_CSUNK` + `CSUNK_60` · PILOT LAMP: `CAB_TRIPLE_RIM` + `CAB_DBL_DIFF` · SQUARE: `SQ_FRAMED` + `SQ_GROOVE_FRAMED` · RECT: `RECT_DBL_GROOVE` + `RECT_GROOVE_RAISED` |
| **State vocabulary (17 total)** | Layer 1 basic (7): OFF / DIM / LIT / BLINK / MOD / ERROR / DISABLED · Layer 2 semantic (6): PROBABILITY / GATE_OFF / FIRED / INACTIVE / LEARN / PULSE · Layer 3 envelope stage (4): ATTACK / DECAY / SUSTAIN / RELEASE |
| **Tier sizes (XS/S/M/L/XL)** | Production radii 4 / 7 / 9* / 11 / 17 px (real T-1, T-1¾, ~7mm synthesised, T-3, T-5) — preview render ×~1.85-2.25 = 9 / 14 / 18 / 21 / 32 px. * M is a synthesised intermediate (no standard 7mm LED package); slot exists for design-language uniformity with sliders + knobs. |
| **Bloom geometry** | RADIAL for round sub-types (HW / RC / PL) — RECT for SQ / RECT sub-types (new primitive `_additive_halo_rect`) |
| **Animation rates** | BLINK 1.0 Hz square · MOD 0.4 Hz sine breath · ERROR 1.5 Hz pulse · PULSE 2.0 Hz tick (150 ms) · LEARN 0.6 Hz slow breath · FIRED 1.0 Hz pop + 250 ms afterglow |
| **Bloom theme presets** | OFF / SUBTLE / STANDARD / CINEMATIC (from `demos/bloom_theme.py`) — `idle_led_peak` for DIM, `active_peak` for LIT, `modulated_peak` for MOD, `error_peak` for ERROR |
| **Reflectivity / finish** | matte 0.0 · semi 0.5 · reflective 1.0 — halo size + alpha scales per `bloom_theme` mults |

---

## Canonical source files (lift targets)

1. **`demos/design_iterations_sheet_v2_leds.py`** — defines LED-body primitives:
   `LED_BEZEL_HI` `(0x60,0x62,0x66)`, `LED_BEZEL_LO` `(0x36,0x38,0x3C)`, `LED_LENS_HI` `(0xC0,0xC4,0xCC)`, `LED_LENS_MID` `(0x88,0x8C,0x94)`, `LED_LENS_LO` `(0x44,0x46,0x4A)`, `LED_RECESS` `(0x18,0x1A,0x1E)`. Plus `_aa()`, `_polygon()`, `_bezel_grad()` helpers.

2. **`demos/design_iterations_sheet_v2_leds_r2.py`** — defines the 10 locked sub-type renderers (one per R2 pick):
   - `_hw_heavy_snap(p, cx, cy, r)`, `_hw_snap_2x(p, cx, cy, r)`
   - `_rc_deep_csunk(p, cx, cy, r)`, `_rc_csunk_60(p, cx, cy, r)`
   - `_pl_cab_triple_rim(p, cx, cy, r)`, `_pl_cab_dbl_diff(p, cx, cy, r)`
   - `_sq_bezel_framed(p, cx, cy, r)`, `_sq_groove_framed(p, cx, cy, r)`
   - `_rect_bezel_dbl_groove(p, cx, cy, r)`, `_rect_groove_raised(p, cx, cy, r)`

3. **`demos/preview_engine_leds_full.py`** — combined Phase 3.5/3.6/3.7/4 preview. Contains:
   - `_led_bloom(p, cx, cy, col, radius, peak, reflectivity)` — radial bloom with reflectivity multiplier
   - `_base_heavy_snap_with_lens(p, cx, cy, r, lens_col, lens_alpha)` — state-lens overwrite helper
   - All 17 state renderer functions (`_state_off`, `_state_dim`, ..., `_state_release`)
   - State-colour constants (`COL_PROBABILITY`, `COL_GATE_OFF`, `COL_FIRED`, `COL_INACTIVE`, `COL_LEARN`, `COL_PULSE_HOT`, `COL_PULSE_TAIL`, `COL_STAGE_*`)
   - Animation constants (`ANIM_HZ` dict)

4. **`demos/bloom_theme.py`** — `BloomTheme` dataclass + `THEMES` registry (OFF/SUBTLE/STANDARD/CINEMATIC). LEDs consume the `idle_led_peak`, `active_peak`, `modulated_peak`, `error_peak`, `learning_peak` fields + `*_radius_mult` + reflectivity mults.

5. **`demos/preview_engine_leds_phase45.py` (STEP 4 of this task)** — final variant × tier × state × finish × theme matrix.

Mainline integration imports (or copy-pastes) from those files.

---

## Per-sub-type paint recipe

Each sub-type has its own body-paint sequence. The state lens colour overrides the lens layer of any sub-type. The state's bloom is layered ON TOP of the body using the sub-type's bloom geometry (radial vs rect).

### HARDWARE — `_hw_heavy_snap` / `_hw_snap_2x`

```
1. Bezel:        QRadialGradient — LED_BEZEL_HI → LED_BEZEL_LO over r
2. Lens:         state.lens_col radial → state.lens_col-60 → state.lens_col-100
                 (radius r*0.7, offset by (-r*0.3, -r*0.3) for top-left highlight)
3. Snap groove:  QPen black α240, 2.2px, drawEllipse r*0.85  (HEAVY_SNAP only)
                 SNAP_2X adds a 2nd concentric groove at r*0.72
4. Bloom:        _led_bloom (radial) at (cx,cy) using state.bloom_col, state.peak
```

### RECESSED — `_rc_deep_csunk` / `_rc_csunk_60`

```
1. Outer rim:    LED_BEZEL_LO ring at r
2. Recess well:  LED_RECESS dark fill — drawEllipse r*0.82
3. Lens (bottom of well, scaled down):
                 state.lens_col radial — radius r*0.55, deeper inside the well
4. Bloom:        _led_bloom (radial) — peak reduced to 65% of state.peak
                 to simulate occlusion by well walls
                 (CSUNK_60 uses 70% — slightly wider exit cone)
```

### PILOT LAMP — `_pl_cab_triple_rim` / `_pl_cab_dbl_diff`

```
1. Outer collar:    LED_BEZEL_HI → LED_BEZEL_LO bezel at r
2. Rim 1 (outer):   black α200, 1.2px, drawEllipse r*0.94
3. Rim 2 (middle):  black α180, 1.0px, drawEllipse r*0.78  (TRIPLE_RIM only)
4. Rim 3 (inner):   black α160, 0.8px, drawEllipse r*0.62
5. Dome lens:       state.lens_col radial — broad gradient simulating jewel dome
                    radius r*0.70, lens highlight offset (-r*0.18, -r*0.28)
6. Bloom:           _led_bloom (radial) — full state.peak (dome lets all light out)
                    + DBL_DIFF: outer diffuser layer at r*0.85 with α60 white tint
```

### SQUARE — `_sq_bezel_framed` / `_sq_groove_framed`

```
1. Body:        rounded square QRectF(cx-r, cy-r, 2r, 2r) — LED_BEZEL_LO fill, corner radius r*0.15
2. Frame:       1.2px LED_BEZEL_HI stroke
3. Inner groove (SQ_GROOVE_FRAMED only): inset 0.15r second stroke α150
4. Lens square: state.lens_col fill — inset 0.25r, corner radius r*0.10
5. Lens highlight: linear-gradient white α(90→0) top-half of lens
6. Bloom:       _additive_halo_rect (rect bloom) — rect=(cx-r*1.4, cy-r*1.4, r*2.8, r*2.8)
                using state.bloom_col, state.peak
```

### RECTANGULAR — `_rect_bezel_dbl_groove` / `_rect_groove_raised`

```
1. Body:        QRectF (LED has 2:1 aspect — w = 2r, h = r) — LED_BEZEL_LO fill, corner r*0.08
2. Frame:       1.4px LED_BEZEL_HI stroke
3. Two grooves: inset 0.10r and 0.20r horizontal lines  (RECT_DBL_GROOVE)
                RECT_GROOVE_RAISED adds a third raised centre bar
4. Lens rect:   state.lens_col fill — inset 0.18r, corner r*0.05
                aspect preserved — wider than tall
5. Lens sheen:  linear-gradient white α(80→0) top-third of lens
6. Bloom:       _additive_halo_rect (rect bloom) — elongated along long axis
                rect=(cx - w*0.95, cy - h*1.2, w*1.9, h*2.4)
```

If any step is skipped, the result drifts from the locked recipe.

---

## Tier sizes (canonical — XS/S/M/L/XL, locked 2026-05-14)

LEDs are physically smaller than user controls (slider handles, knobs). Sizes derived from real-world LED packages; M is a synthesised intermediate.

| Tier | Production radius | Production mm | Preview radius | Square side (prod) | Rect W×H (prod) | Real-world reference |
|---|---|---|---|---|---|---|
| **XS** | 4 px | 3 mm | 9 px | 6×6 | — | T-1 / 3 mm — status pin LED |
| **S** | 7 px | 5 mm | 14 px | 10×10 | — | T-1¾ / 5 mm — standard panel (workhorse) |
| **M** | 9 px | 7 mm * | 18 px | 13×13 | 18×9 | **synthesised intermediate** — slot reserved for tier-uniformity with sliders + knobs |
| **L** | 11 px | 10 mm | 21 px | 16×16 | 20×10 | T-3 / 10 mm — module status (DEFAULT) |
| **XL** | 17 px | 20 mm | 32 px | 24×24 | 32×16 | T-5 / 20 mm — large pilot lamp |

Production rendering uses the production radius column. Preview rendering uses the preview radius column per `feedback-larger-demo-icons`.

\* M has no real-world standard LED package at exactly 7mm — the design language reserves the slot anyway so XS/S/M/L/XL is uniform across sliders, knobs, and LEDs. Production modules may skip M if no intermediate size is needed.

Tier selection rule (production):
- **XS**: dense status arrays (step LEDs, mute/solo banks). Detail rim treatment dropped → render as plain dot (see Risk #1).
- **S**: per-knob value-indicator dots, small per-channel status.
- **M**: rare intermediate use; mostly available for design flexibility.
- **L**: per-module status lights, clock/divider indicators (DEFAULT).
- **XL**: large standalone pilot lamps (power, error, master-arm).

---

## State recipe — palette + animation per state

All 17 states render on every sub-type. State-colour constants live in `preview_engine_leds_full.py` (see Canonical source files §3 above) and mirror the main-app values.

### Layer 1 — basic universal (7)

| State | Lens colour | Bloom colour | Bloom radius mult | Peak source | Animation |
|---|---|---|---|---|---|
| OFF | `#44464A` dark grey | — | 0 | 0 | static |
| DIM | `#A0A8B0` neutral | `PAL_DIM` `#C0C8D2` | 0.9 | `theme.idle_led_peak` | static |
| LIT | `PAL_LIT.hi` deep amber | `PAL_LIT.mid` | 1.6 | `theme.active_peak` | static |
| BLINK | `PAL_LIT.hi` ↔ `#605240` | `PAL_LIT.mid` | 1.6 | `theme.active_peak` | 1.0 Hz square — half period LIT, half DIM-amber |
| MOD | amber↔dim breathing | `PAL_MOD.mid` | 1.2 + 0.4·m | `theme.modulated_peak * m` | 0.4 Hz sine: `m = breath_lo + (hi-lo) * 0.5 * (1+sin(2πft))` |
| ERROR | `PAL_ERROR.hi` red | `PAL_ERROR.mid` | 1.4 + 0.3·m | `theme.error_peak * m` | 1.5 Hz pulse using same `_mod_sin` formula with `error_pulse_lo/hi` |
| DISABLED | `COL_DISABLE` `#606066` | — | 0 | 0 | static, opacity 0.32 |

### Layer 2 — semantic overlays (6)

| State | Lens colour | Bloom colour | Bloom radius mult | Peak source | Animation |
|---|---|---|---|---|---|
| PROBABILITY | `COL_PROBABILITY` `(178,112,154)` pink / dim base `(78,56,62)` between fires | pink | 1.5 (fire) / 0.9 (rest) | `theme.active_peak` peak / `theme.idle_led_peak*0.8` rest | 1.0 Hz fire pulse; `fire > 0.85` shows lit, else dim base |
| GATE_OFF | `COL_GATE_OFF` `(255,118,96)` red-orange | red-orange | 1.0 | `theme.idle_led_peak * 1.2` | static (held off-state glow) |
| FIRED | `COL_FIRED` `(255,215,90)` yellow-amber | yellow-amber | 1.2 + 0.4·level | `theme.active_peak * level` | 1.0 Hz fire trigger, 250 ms afterglow decay; between triggers shows INACTIVE blue |
| INACTIVE | `COL_INACTIVE` `(94,150,210)` blue | blue | 0.85 | `theme.idle_led_peak` | static (powered, ready, not current) |
| LEARN | `COL_LEARN` `#B06000` orange | orange | 1.1 + 0.3·m | `theme.modulated_peak * m` | 0.6 Hz slow breath (`learning_pulse_lo/hi`) |
| PULSE | white→amber tick lens | white-amber mix | 1.3 + 0.5·spike | `theme.active_peak * spike` | 2.0 Hz tick rate, 150 ms spike per tick, white peak fades through amber |

### Layer 3 — envelope stage colours (4)

All four use the same recipe — only the lens/bloom colour varies. Static within the stage; transitions handled by envelope state machine (not the LED draw path).

| State | Lens colour | Bloom radius mult | Peak source |
|---|---|---|---|
| ATTACK | `COL_STAGE_ATTACK` `(255,230,120)` yellow | 1.4 | `theme.active_peak * 0.9` |
| DECAY | `COL_STAGE_DECAY` `(150,235,255)` cyan | 1.4 | `theme.active_peak * 0.9` |
| SUSTAIN | `COL_STAGE_SUSTAIN` `(150,255,170)` green | 1.4 | `theme.active_peak * 0.9` |
| RELEASE | `COL_STAGE_RELEASE` `(255,170,135)` orange-pink | 1.4 | `theme.active_peak * 0.9` |

### Combination rules

- **Layer 2 overlay + Layer 1 base**: e.g. PROBABILITY + FIRED → pink LIT with fire-pulse afterglow. Overlay wins on lens colour; bloom inherits overlay colour.
- **Layer 3 stage is exclusive** within one envelope LED; only one stage at a time.
- **No MIDI-MAPPED marker** on standalone status LEDs (LEDs don't get MIDI-mapped directly — the CONTROL they indicate does).

---

## Bloom geometry per sub-type

LEDs are real point/area light sources. Bloom shape MUST match the LED's emitter geometry (per `feedback-realistic-light-physics`).

| Sub-type | Bloom primitive | Notes |
|---|---|---|
| HARDWARE | `_led_bloom` (radial) | Standard point-source halo |
| RECESSED | `_led_bloom` (radial, peak × 0.65–0.70) | Well walls occlude; tighter peak, smaller exit cone |
| PILOT LAMP | `_led_bloom` (radial, full peak) | Dome diffuses light broadly; no occlusion |
| SQUARE | `_additive_halo_rect` (rect bloom, w=h) | Rounded-rect-bounded halo (1:1) — NEW primitive (STEP 3) |
| RECTANGULAR | `_additive_halo_rect` (rect bloom, w>h) | Elongated halo along long axis (1:2) |

### `_additive_halo_rect` spec (NEW primitive, added 2026-05-14)

```python
def _additive_halo_rect(p, rect: QRectF, color: QColor,
                       peak: int, reflectivity: float = 0.0,
                       theme: BloomTheme | None = None):
    """Aspect-preserving smooth bloom for SQ_FRAMED / RECT_DBL_GROOVE LEDs.

    A single radial gradient scaled along both axes to match the LED's aperture
    aspect ratio (1:1 for square, 1:2 for rect bar). Mirrors `_additive_halo_linear`'s
    technique — the rect-character comes from aspect ratio, not from a hard rect
    boundary. Honours BloomTheme reflectivity multipliers for matte/semi/reflective.
    """
```

Implementation (lifted into `demos/bloom_theme.py` 2026-05-14, after a 2026-05-14 fix from a 6-shell rounded-rect approach that produced visible alpha-step banding):

1. **Single smooth gradient** — not multi-shell. Translate → scale by (`bw*1.6, bh*1.6`) → unit-radius QRadialGradient → drawEllipse(0,0,1,1). Result: ellipse of width `bw*3.2` × height `bh*3.2` with smooth radial alpha falloff.
2. **Composition mode**: `Plus` (additive blend).
3. **4-stop gradient**: peak α at 0.00, α×0.55 at 0.30, α×0.20 at 0.60, 0 at 1.00.
4. **Reflection halo** (semi/reflective): same primitive, called with `bw*2.0*size_mult × bh*2.0*size_mult` extent and `peak × peak_mult` alpha.
5. **Mirror reflection** (reflective only): same primitive at `cy + bh*0.55`, vertically stretched (`bw*1.85 × bh*2.4`).
6. **Antialiasing on, Pen=NoPen.**

Why aspect-scaled ellipse and not a true rectangular path: multi-shell rounded-rect approaches produce visible alpha-step banding (each shell shows a hard edge). A single radial gradient with axis scaling preserves the aperture aspect (rect LEDs get elongated halos, square LEDs get round-ish halos) while staying perfectly smooth. The "rectangle character" comes from the aspect ratio matching, not from a hard rect boundary — matching how real LED bloom photographs (the halo is approximately elliptical with the aperture's aspect ratio; only the LED body itself has hard rect edges).

---

## Animation rates (locked)

| Animation | Hz | Period | Use |
|---|---|---|---|
| BLINK | 1.0 | 1.0 s | Layer 1 BLINK — square wave |
| MOD | 0.4 | 2.5 s | Layer 1 MOD — sine breath |
| ERROR | 1.5 | 0.67 s | Layer 1 ERROR — alarm pulse |
| FIRED_PER | 1.0 | 1.0 s | Layer 2 FIRED + PROBABILITY — fire trigger period |
| LEARN | 0.6 | 1.67 s | Layer 2 LEARN — slow breath |
| PULSE | 2.0 | 0.50 s | Layer 2 PULSE — clock tick (150 ms spike per tick) |

All animation phases are driven by a global `t` (seconds, 30 fps tick) and parameterised by `_mod_sin(hz, t, lo, hi)` for sine breath or `_blink_square(hz, t)` for binary. Spike/decay animations (FIRED, PULSE) use direct phase math (see `_state_fired` / `_state_pulse` in `preview_engine_leds_full.py`).

---

## Integration plan — what mainline must do

### Files to refactor

`main_app/syb_modular_ui_prototype_<latest>.py` — multiple LED draw paths:

| Path | Lines (16_5_11) | Currently uses |
|---|---|---|
| `_set_pulse_led_visual` (generic) | 6088 | Custom radial gradient inline; no bloom theme integration |
| Step-seq step LED row | 6195–6253 | Body radial + glow grad + glass — hand-rolled colours, no canonical state recipe |
| Seq64 LED row | 6328–6497 | Same hand-rolled pattern, with prob_skipped pink overlay |
| Clock LED + clock_stack divider LEDs | 6529–6984 | `_set_pulse_led_visual` wrapper |
| Envelope stage indicator | 7452–7491 | Marker dot with stage_colors dict — already uses correct colours |
| MIDI learn button (`midi_learn_button`) | 5158–5161 | QPushButton stylesheet `#b06000` — works but not part of LED widget; consider a status LED next to button instead |

### Refactor steps

1. **Move primitives into shared module** (single source of truth):
   ```
   syb_core/
     widgets/
       led_recipe.py    # _additive_halo_rect, _led_bloom, _base_*_with_lens helpers
       led_states.py    # 17 state renderers + COL_* constants + ANIM_HZ
       led_subtypes.py  # 10 R2 sub-type body renderers (HW/RC/PL/SQ/RECT)
   ```
   Both `demos/preview_engine_leds_*.py` and `main_app/syb_modular_ui_prototype_*.py` import from `syb_core.widgets.led_recipe`.

2. **Define a `StatusLEDWidget` class** (new) — Qt widget wrapping one LED:
   ```python
   class StatusLEDWidget(QWidget):
       def __init__(self, parent=None, *, sub_type="HARDWARE", tier=3):
           ...
           self._state: str = "OFF"
           self._reflectivity: float = 0.0
           self._theme: BloomTheme = DEFAULT_THEME

       def set_state(self, state: str): ...
       def set_reflectivity(self, v: float): ...
       def set_theme(self, theme: BloomTheme): ...

       def paintEvent(self, _ev):
           p = QPainter(self)
           p.setRenderHint(QPainter.Antialiasing)
           sub_renderer = SUBTYPE_REGISTRY[self._sub_type]
           state_renderer = STATE_REGISTRY[self._state]
           sub_renderer(p, cx, cy, self._radius)
           state_renderer(p, cx, cy, self._radius, self._t, self._reflectivity)
   ```

3. **Refactor step-seq LED row** — replace the hand-rolled radial gradient + glow + glass with a column of `StatusLEDWidget(sub_type="HARDWARE", tier=2)`. Map the existing `result` / `is_modded` / `gate_on` semantics to the canonical state names:
   - `result == "fired"` → `FIRED`
   - `result == "prob_skipped"` → `PROBABILITY`
   - `result == "gate_off"` → `GATE_OFF`
   - `result == "inactive"` → `INACTIVE`
   - `is_modded and not active` → `PROBABILITY` (dim base)

4. **Refactor clock-LED path** — `_set_pulse_led_visual` becomes a wrapper that toggles a `StatusLEDWidget` between `PULSE` and `OFF` (or `LIT` for held-on clock).

5. **Wire envelope stage indicator** — replace the marker-dot painting in `paintEvent` with a `StatusLEDWidget(sub_type="PILOT LAMP", tier=2)` whose state is `ATTACK`/`DECAY`/`SUSTAIN`/`RELEASE`/`OFF`.

6. **Wire MIDI-learn indicator** — add a small `StatusLEDWidget(sub_type="HARDWARE", tier=1)` next to the learn button that goes to state `LEARN` while listening, `OFF` otherwise. The button itself keeps its stylesheet for now.

### Required new primitives (STEP 3 + downstream)

| Primitive | Source after STEP 3 | Description |
|---|---|---|
| `_additive_halo_rect` | `demos/bloom_theme.py` | Rectangle-bounded additive bloom — used by SQ + RECT sub-types |
| `_led_bloom` | already in `demos/preview_engine_leds_full.py`; move to `syb_core/widgets/led_recipe.py` | Radial bloom with reflectivity mults |
| `SUBTYPE_REGISTRY` | new in `syb_core/widgets/led_subtypes.py` | Dict `{name: (renderer_fn, default_tier, bloom_geometry)}` |
| `STATE_REGISTRY` | new in `syb_core/widgets/led_states.py` | Dict `{name: renderer_fn}` covering all 17 states |
| `ANIM_HZ` | move to `syb_core/widgets/led_states.py` | Locked rate constants |

### Suggested shared-module location

```
syb_core/
  widgets/
    __init__.py
    slider_recipe.py   # (from sliders lock)
    slider_track.py    # (from sliders lock)
    led_recipe.py      # _additive_halo_rect, _led_bloom, _base_*_with_lens
    led_subtypes.py    # 10 sub-type body renderers + SUBTYPE_REGISTRY
    led_states.py      # 17 state renderers + STATE_REGISTRY + ANIM_HZ + COL_*
    bloom_theme.py     # BloomTheme dataclass + THEMES (already in demos/, move up)
```

Single source of truth — demos and main_app both import from `syb_core.widgets`.

---

## Integration test plan

Mainline must:

1. Build a new revision `syb_modular_ui_prototype_<next>.py` containing the new `syb_core/widgets/led_*.py` modules and `StatusLEDWidget` class.
2. Refactor step-seq step-LED row in one module first (smallest blast radius — step_seq_16). Map semantics per the table above.
3. `py_compile` clean.
4. Launch app, open a patch with a step_seq_16, view the module.
5. **Compare visually against `demos/preview_engine_leds_phase45.py`** (STEP 4) — colours should match per state. Acceptable diff: minor anti-aliasing from QWidget vs QOpenGLWidget. NOT acceptable: missing states, wrong colours, missing bloom.
6. Test each main-app state path: gate off → GATE_OFF · prob<100 → PROBABILITY · fired → FIRED · idle → INACTIVE · pulse (clock LED) → PULSE.
7. Once verified for step_seq_16: roll out to seq64 row, clock LEDs, envelope stage, MIDI-learn indicator.
8. If pass: section is truly LOCKED. Update memory `feedback-integration-plan-documented-tested` status board.
9. If fail: identify the broken layer, surgical fix, re-test.

---

## Acceptance criteria

Section is LOCKED only when ALL four are true:

- ✅ Engine preview (`preview_engine_leds_full.py`) shows all 17 states + all 5 sub-types using canonical primitives.
- ⏳ Final preview matrix (`preview_engine_leds_phase45.py`) renders every variant × tier × state × finish × theme combination (STEP 4 of this task).
- ⏳ `_additive_halo_rect` primitive added to `demos/bloom_theme.py` and integrated into SQ/RECT sub-type bloom paths (STEP 3 of this task).
- ⏳ Mainline integration revision built, launched, visually verified against previews. **Currently pending.**

Until all four pass, LEDs are "preview-locked but integration-pending."

---

## What's NEW vs what's CANONICAL

| Item | Source |
|---|---|
| 10 R2 sub-type body renderers | CANONICAL (demo-agent 2026-05-13, R2 picks) |
| 5 sub-type lock (HW/RC/PL/SQ/RECT) | CANONICAL (audit 2026-05-13) |
| 7 basic Layer 1 states | CANONICAL (audit 2026-05-13) |
| 6 semantic Layer 2 states | **NEW** (audit gap closure 2026-05-14, lifted from main_app) |
| 4 envelope Layer 3 states | **NEW** (audit gap closure 2026-05-14, lifted from main_app envelope_adsr) |
| `_led_bloom` radial bloom | CANONICAL (preview_engine_leds_full 2026-05-13) |
| `_additive_halo_rect` rect bloom | **NEW pending** (STEP 3 of this task) |
| 5 tiers (XS/S/M/L/XL) | CANONICAL (renamed + M added 2026-05-14 for cross-element uniformity) |
| 4 bloom themes (OFF/SUBTLE/STANDARD/CINEMATIC) | CANONICAL (`bloom_theme.py` 2026-05-13) |
| Matte/semi/reflective finish toggle | CANONICAL (lifted from sliders) |
| `StatusLEDWidget` widget class | **NEW pending** (integration phase) |
| Move primitives to `syb_core/widgets/led_*.py` | **NEW pending** (integration phase) |

---

## STRUCTURAL VARIANTS (5 sub-types)

LEDs differ from sliders in that the "variants" are structural sub-types of the LED itself (not behavioural like dual-handle / detent). All five share the locked state vocabulary and bloom theme framework; only the body silhouette + bloom geometry varies.

Reference preview: `demos/preview_engine_leds_full.py` (SCALE section).

### HARDWARE — round bezel
**Use case:** standard status indicator on any module. The workhorse — pick this when no other sub-type is explicitly justified.

- **R2 picks:** `_hw_heavy_snap` (single deep snap groove), `_hw_snap_2x` (two concentric snap grooves).
- **Real-world refs:** Marl 100 series with snap-retainer rim, deep groove variants.
- **Bloom:** radial.
- **Tier default:** L (11 px production).

### RECESSED — well shape
**Use case:** when the design language wants the LED to look "recessed" into the panel rather than flush (Mil-spec, industrial machinery feel). Visually deeper.

- **R2 picks:** `_rc_deep_csunk` (countersunk well), `_rc_csunk_60` (steeper 60° cone).
- **Real-world refs:** Marl countersunk pilots, telegraph-key indicator wells.
- **Bloom:** radial with reduced peak (65–70 % of standard) — well walls occlude.
- **Tier default:** L. **Risk:** at XS, the lens is at the bottom of a tiny well and barely visible. Avoid XS for RECESSED.

### PILOT LAMP — round dome
**Use case:** large panel-mounted pilot lamps (master power, master arm, master error). High-visibility from a distance.

- **R2 picks:** `_pl_cab_triple_rim` (cabochon + 3 concentric rims), `_pl_cab_dbl_diff` (cabochon + 2 rims + diffuser outer ring).
- **Real-world refs:** Studer/Neumann console cabochon jewels, Allen-Bradley 800F multi-collar pilots.
- **Bloom:** radial, full peak — dome diffuses broadly.
- **Tier default:** XL (17 px production). Smaller tiers lose the multi-rim detail.

### SQUARE — 1:1 form factor
**Use case:** modern industrial-square panel pilots, sequencer step LEDs where the silhouette is intentionally chunky-square.

- **R2 picks:** `_sq_bezel_framed` (square bezel + framed lens), `_sq_groove_framed` (bezel + inner groove + framed lens).
- **Real-world refs:** Allen-Bradley plastic square pilots, modern industrial square indicators.
- **Bloom:** rectangle bloom (`_additive_halo_rect`, w=h aspect, slight horizontal/vertical bias matching aperture).
- **Tier default:** L (16×16 production).

### RECTANGULAR — 1:N form factor
**Use case:** LED bar indicators, level-meter segments, status-bar pilots, gate-flow direction indicators.

- **R2 picks:** `_rect_bezel_dbl_groove` (double-grooved rect), `_rect_groove_raised` (raised centre bar + outer grooves).
- **Real-world refs:** Bivar / Kingbright LED bars, industrial status-bar pilots.
- **Bloom:** rectangle bloom (`_additive_halo_rect`) elongated along the LED's long axis (2:1 aspect bloom for 2:1 LED).
- **Tier default:** L (20×10 production); XL (32×16) for large bars.

### Variant compositions (deferred)

Multi-LED arrays (step seq LED row, level-meter ladder, segment bar) are compositions of single LEDs — not their own structural variant. Future work: define a **LED Group** widget that arranges N copies of any single sub-type. Deferred per `feedback-final-preview-all-variants` (single-element first, group compositions after).

---

## Acceptance criteria (variants)

A sub-type is LOCKED when:
- ✅ Renders correctly in `preview_engine_leds_full.py` under all 4 bloom themes × 3 finishes
- ✅ Inherits all 17 states (basic + semantic + stage) from the universal state vocabulary
- ✅ Documented in this section of LED_RECIPE_LOCK.md
- ✅ Real-world reference identified
- ⏳ Mainline widget class extension built (deferred to mainline integration phase)
- ⏳ Production tier defaults validated against real module faceplates (deferred to faceplate design phase)
