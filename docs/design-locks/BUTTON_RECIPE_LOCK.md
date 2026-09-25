# Button Recipe Lock — Section 4 of the design-language spec

_Locked 2026-05-14 after buttons R1 (3 iterations) → R2 (2 iterations) → combined
engine preview (with mid-preview bevel reduction). This is the canonical
implementation spec for the buttons element across all PATCHWERK / SYB Live
Cable modules. Mainline must lift these primitives verbatim when building
`PatchwerkButtonWidget` and any future button widget class._

---

## TL;DR — the lock

| Component | Recipe |
|---|---|
| **Sub-types (9 variants across 6 categories)** | B1 Round momentary · B2a+B2b Round latched · B3 Square momentary · B4a+B4b+B4c Square latched · B5a Hex momentary · B5b Hex latched |
| **Locked R2 winners** | B1 RIM_FRAMED FOUR_RINGS · B2a INSET_FRAMED DOT · B2b INSET_TRIPLE PLUS · B3 RAISED BIGGER · B4a BEZEL_KNURL_DOT THICKER · B4b BEZEL_DEEP_FRAME TRIPLE · B4c BEZEL_FULL BIGGER_DOT · B5a QUAD_RIM TIGHTER · B5b QUAD_RIM_LATCH_DOT |
| **Tier set (XS/S/M/L/XL)** | Production radii 4 / 6 / 9 / 12 / 17 px — preview render ~×1.85–2.25 = 9 / 12 / 16 / 22 / 30 px |
| **Indicator strategy (locked)** | MOMENTARY (B1, B3, B5a) = body-glow only · LATCHED (B2, B4, B5b) = integrated LED (dot or lit recess) — per [[project-button-state-indicator-strategy]] |
| **State vocabulary** | MOMENTARY = 6 states · LATCHED = 9 states (split by action, not by sub-type) |
| **Square bevel band** | ~0.20–0.26r per side (reduced from 0.42–0.54r at preview review 2026-05-14) |
| **Bloom geometry** | Radial for round (B1/B2) · rect-1:1 for square (B3/B4) · hex bloom for hex (B5) — fallback to radial at preview; canonical `_additive_halo_hex` lock at recipe-lock |
| **Animation rates** | LEARN 2.5 Hz · MOD 0.4 Hz · AUTO 0.3 Hz · ERROR 1.5 Hz · MOMENTARY-FIRE 1 Hz with 250 ms decay |
| **Bloom theme presets** | OFF / SUBTLE / STANDARD / CINEMATIC (`bloom_theme.py`) |
| **Reflectivity / finish** | matte 0.0 · semi 0.5 · reflective 1.0 |

---

## Canonical source files (lift targets)

1. **`demos/design_iterations_sheet_v2_buttons.py`** — original primitives: `_cap_round`, `_cap_square`, `_btn_collar`, `_btn_knurled_rim`, `_btn_indicator_dot`, `_btn_indicator_line`, `_btn_led_ring`, `_btn_fluted_face`.
2. **`demos/design_iterations_sheet_v2_buttons_clean.py`** — bauhaus-corrected primitives + helpers added 2026-05-14:
   - `_round_flush_strict` (replaces oblong "flush" profile with true 1:1 circle)
   - `_cap_hex(p, cx, cy, r, profile)` + `_hex_path()` (6-vertex hexagon QPolygonF)
   - `_hex_collar`, `_hex_frame_outline`, `_hex_knurl`, `_hex_frame_triple`, `_hex_inner_recess`, `_hex_latch_groove`
   - `_engaged_dot_lit`, `_engaged_led_ring_lit`, `_engaged_rim_lit`, `_engaged_halo` — latched-state cues
   - `_square_bezel_outer`, `_square_knurled_outer_marks`, `_square_inner_inset_frames`, `_square_led_ring` — square frame primitives
   - `_inset_frame_round`, `_deep_inset_lit` — round inset cues
   - `_collar_engraved_groove`, `_knurled_collar_marks` — collar decoration
3. **`demos/design_iterations_sheet_v2_buttons_r2.py`** — R2 winner variant functions (lift these directly):
   - `_r2b_b1_dbl_four_rings` (B1)
   - `_r2b_b2_shallower_dot` (B2a)
   - `_r2b_b2_triple_t_plus` (B2b)
   - `_r2b_b3_taller_bigger` (B3 — bevel-reduced 2026-05-14)
   - `_r2b_b4_sparse_thicker` (B4a — bevel-reduced 2026-05-14)
   - `_r2b_b4_dft_triple` (B4b — bevel-reduced 2026-05-14)
   - `_r2b_b4_full_bigger_dot` (B4c — bevel-reduced 2026-05-14)
   - `_r2_b5_quad_tighter` (B5a)
4. **`demos/preview_engine_buttons_full.py`** — combined Phase 3.5/3.6/3.7/4 preview + `_b5b_quad_rim_latch_dot` composition (B5b — locked here, lift to `_buttons_r2.py` or `syb_core/widgets/buttons.py` during integration).
5. **`demos/bloom_theme.py`** — `BloomTheme` dataclass + 4 presets (OFF/SUBTLE/STANDARD/CINEMATIC). Buttons consume `idle_led_peak` (latched IDLE), `active_peak` (cap glow / engaged), `modulated_peak`, `automated_peak`, `learning_peak`, `error_peak`, reflectivity mults, marker mults.

Mainline integration imports (or copy-pastes) from those files.

---

## Per-sub-type paint recipe

### B1 — RIM_FRAMED FOUR_RINGS (round momentary)

```
1. Collar:    _btn_collar(p, cx, cy, r, extra=0.22)
2. Cap:       _cap_round(p, cx, cy, r * 0.80, profile="low_proud")
3. 4 frames:  drawEllipse at r*0.80 × (0.90, 0.78, 0.66, 0.54)
              pen QColor(0,0,0,220) × 0.8 px
```

### B2a — INSET_FRAMED DOT (round latched, engaged shown)

```
1. Collar:        _btn_collar(p, cx, cy, r, extra=0.14)
2. Flush cap:     _round_flush_strict(p, cx, cy, r * 0.85)
3. Inset frame:   _inset_frame_round(p, cx, cy, r * 0.85)
4. Lit recess:    _deep_inset_lit(p, cx, cy, r * 0.68)
5. Central dot:   _engaged_dot_lit(p, cx, cy, r, dot_r_ratio=0.10)
```

### B2b — INSET_FRAMED_TRIPLE PLUS (round latched, engaged shown)

```
1. Collar:        _btn_collar(p, cx, cy, r, extra=0.12)
2. Flush cap:     _round_flush_strict(p, cx, cy, r * 0.88)
3. 3 rings:       drawEllipse at r * (0.78, 0.68)
                  pen QColor(0,0,0,200) × 0.7 px
4. Lit floor:     _deep_inset_lit(p, cx, cy, r * 0.55)
```

### B3 — RAISED BIGGER (square momentary, bevel-reduced)

```
1. Outer flat:    _cap_square(p, cx, cy, r, profile="flat", corner=0.06)
2. Frame:         drawRoundedRect r * 0.92 outline, pen 0.8 px black α200
3. Raised inner:  _cap_square(p, cx, cy, r * 0.82, profile="domed", corner=0.06)
```

**Bevel band per side ≈ 0.10r** (was 0.28r before 2026-05-14 reduction).

### B4a — BEZEL_KNURL_DOT THICKER (square latched, engaged shown)

```
1. Outer bezel:   _square_bezel_outer(p, cx, cy, r, extra=0.08, corner=0.05)
2. Knurl marks:   10 vertical lines, pen 0.9 px black α200, outside r*0.92
3. Inner cap:     _cap_square(p, cx, cy, r * 0.86, profile="flat", corner=0.05)
4. Lit dot:       _engaged_dot_lit(p, cx, cy, r * 0.86, dot_r_ratio=0.22)
```

**Bevel band per side ≈ 0.22r.**

### B4b — BEZEL_DEEP_FRAME TRIPLE (square latched, engaged shown)

```
1. Outer bezel:   _square_bezel_outer(p, cx, cy, r, extra=0.10, corner=0.06)
2. Inner cap:     _cap_square(p, cx, cy, r * 0.84, profile="flat", corner=0.05)
3. 3 tight frames: drawRoundedRect at r*0.84 × (0.85, 0.74, 0.62) outlines
                   pen 0.7 px black α200
4. Lit dot:       _engaged_dot_lit(p, cx, cy, r * 0.84, dot_r_ratio=0.16)
```

**Bevel band per side ≈ 0.26r.**

### B4c — BEZEL_FULL BIGGER_DOT (square latched, engaged shown — kitchen sink)

```
1. Outer bezel:   _square_bezel_outer(p, cx, cy, r, extra=0.10, corner=0.06)
2. Knurl marks:   _square_knurled_outer_marks(p, cx, cy, r, extra=0.10, n=18)
3. Inner cap:     _cap_square(p, cx, cy, r * 0.84, profile="flat", corner=0.05)
4. 2 inset frames: _square_inner_inset_frames(p, cx, cy, r * 0.84, n=2, corner=0.05)
5. Bigger lit dot: _engaged_dot_lit(p, cx, cy, r * 0.84, dot_r_ratio=0.26)
```

**Bevel band per side ≈ 0.26r.**

### B5a — QUAD_RIM TIGHTER (hex momentary, no LED)

```
1. Hex collar:    _hex_collar(p, cx, cy, r, extra=0.20)
2. Hex cap:       _cap_hex(p, cx, cy, r * 0.80, profile="low_proud")
3. 4 hex frames:  drawPolygon _hex_path at r * 0.80 × (0.90, 0.78, 0.66, 0.54)
                  pen 0.7 px black α200
```

### B5b — QUAD_RIM_LATCH_DOT (hex latched, engaged shown — composed)

```
1. As B5a            (collar + cap + 4 hex frames)
2. Latch groove:     _hex_latch_groove(p, cx, cy, r)   — horizontal line below cap
3. Central lit dot:  _engaged_dot_lit(p, cx, cy, r * 0.80, dot_r_ratio=0.16)
```

Both mechanical cue (latch groove) and integrated LED (dot) per D1c resolution.

---

## State vocabulary — split by action

Per [[project-button-state-indicator-strategy]] (locked 2026-05-14).

### MOMENTARY states (6) — B1, B3, B5a

| State | Visual cue | Animation |
|---|---|---|
| IDLE | body neutral; frames at default contrast | static |
| HOVER | thin neutral rim halo | static |
| ACTIVE / PRESSED | full-cap amber glow | 1 Hz fire + 250 ms decay |
| MIDI-LEARNING | pulsing pale-gold full-cap glow | 2.5 Hz pulse |
| DISABLED | opacity 0.32 | static |
| ERROR | pulsing red full-cap glow | 1.5 Hz pulse |

No MOD/AUTO — momentary doesn't sustain a state to modulate.

### LATCHED states (9) — B2, B4, B5b

| State | Visual cue | Animation |
|---|---|---|
| IDLE (disengaged) | LED indicator dim; body neutral | static |
| HOVER | LED slightly brighter; thin rim halo | static |
| ENGAGED | LED full amber; soft cap glow | static |
| ENGAGED+MAPPED | LED full + dashed amber MIDI-MAPPED marker ring | static |
| MIDI-LEARNING | pulsing pale-gold LED | 2.5 Hz pulse |
| MODULATED | breathing amber LED | 0.4 Hz sine |
| AUTOMATED | slow-pulse amber LED | 0.3 Hz |
| DISABLED | opacity 0.32, LED off | static |
| ERROR | pulsing red LED + cap red flash | 1.5 Hz pulse |

### MIDI-MAPPED marker ring shape (NEW primitive needed per sub-type)

| Cap silhouette | Marker primitive |
|---|---|
| Round (B1/B2) | `_marker_ring_circle(p, cx, cy, r)` — dashed circle at r×1.35 |
| Square (B3/B4) | `_marker_ring_square(p, cx, cy, r)` — dashed rounded-rect at r×1.35 |
| Hex (B5) | `_marker_ring_hex(p, cx, cy, r)` — dashed hex at r×1.35 |

All use the active theme's `marker_thick` and `marker_alpha`.

---

## Tier sizes (canonical — XS/S/M/L/XL, locked 2026-05-14)

| Tier | Production radius | Production mm | Preview radius | Real-world reference |
|---|---|---|---|---|
| **XS** | 4 px | 3 mm | 9 px | sub-mini panel push (dense trigger arrays) |
| **S** | 6 px | 5 mm | 12 px | Schurter MSM01, TR-808 step pad |
| **M** | 9 px | 8 mm | 16 px | standard panel button (workhorse) — Mutable, Make Noise |
| **L** | 12 px | 12 mm | 22 px | transport / mode-bank (mid-large) |
| **XL** | 17 px | 18 mm | 30 px | large pilot / arm / panic (mil MS25085) |

Production rendering uses production radius. Preview rendering uses preview radius per `feedback-larger-demo-icons`.

**Tier selection rule (production):**
- **XS**: ultra-dense arrays (16-step manual triggers in 1Uw)
- **S**: per-module mute / solo / mode tabs
- **M**: standalone per-module action buttons (DEFAULT)
- **L**: prominent module-level transport / arm
- **XL**: emergency / panic / master controls

### XS tier simplification (per audit risk #1–3)

At XS tier, detail must be dropped to avoid sub-pixel collapse:

| Sub-type | XS-tier simplification |
|---|---|
| B1 RIM_FRAMED FOUR_RINGS | Drop to 2 frames (0.86, 0.66) |
| B2a / B2b | Drop inset frames; keep collar + flush + lit recess + dot only |
| B3 RAISED | Drop outer frame; keep flat outer + raised inner only |
| B4a / B4b / B4c | Drop knurl marks; drop one inset frame |
| B5a / B5b QUAD_RIM | Drop to 1 hex frame; latch groove preserved on B5b |

These simplifications kick in automatically based on tier in the production `PatchwerkButtonWidget` paint dispatcher.

---

## Bloom geometry per sub-type

Per `feedback-realistic-light-physics`.

| Sub-type | Cap shape | Bloom primitive | Aspect |
|---|---|---|---|
| B1 / B2 | round | `_led_bloom` radial | 1:1 |
| B3 / B4 | square | `_additive_halo_rect` (1:1 square) | 1:1 |
| B5a / B5b | hex | `_additive_halo_hex` (NEW — lock here, build at integration) | 6-fold symmetric |

**`_additive_halo_hex` spec (deferred to integration):**
- Built like `_additive_halo_rect` but the inner gradient renders into a hex path
- Aspect-scaled radial gradient with hex falloff
- Honours `BloomTheme` reflectivity multipliers
- At preview, hex falls back to radial bloom (visually close at tier S/M/L/XL; XS irrelevant since hex bloom is sub-pixel)

---

## Bloom theme integration

Same OFF / SUBTLE / STANDARD / CINEMATIC presets. Theme attributes consumed:

| Theme attribute | Used for |
|---|---|
| `idle_led_peak` | LATCHED IDLE indicator (dim) |
| `active_peak` | MOMENTARY ACTIVE full-cap glow; LATCHED ENGAGED indicator |
| `modulated_peak` | LATCHED MOD breathing |
| `automated_peak` | LATCHED AUTO slow-pulse |
| `learning_peak` | MIDI-LEARNING pulse (both action classes) |
| `error_peak` | ERROR pulse |
| `marker_alpha` / `marker_thick` | MIDI-MAPPED dashed marker ring |
| `semi_refl_*` / `full_refl_*` | Halo size + alpha under finish toggle |

---

## Animation rates (locked)

| Animation | Hz | Period | Use |
|---|---|---|---|
| LEARN | 2.5 | 400 ms | MIDI-LEARNING pulse (both action classes) |
| MOD | 0.4 | 2.5 s | LATCHED MOD sine breathing |
| AUTO | 0.3 | 3.3 s | LATCHED AUTO slow-pulse |
| ERROR | 1.5 | 667 ms | ERROR alarm pulse |
| MOMENTARY_FIRE | 1.0 | 1.0 s | MOMENTARY ACTIVE auto-fire (preview only — production triggers from user input) + 250 ms decay |

Preview drives all animations from a single global `t` (seconds, 30 fps QTimer). Production widgets advance their own `t` from frame deltas; animation is owned by the widget, not the state machine.

---

## Integration plan — what mainline must do

### Files to refactor

`main_app/syb_modular_ui_prototype_<latest>.py` — multiple button draw paths (16_5_11):

| Path | Lines (16_5_11) | Currently uses |
|---|---|---|
| `_make_midi_learn_button` | 5129 | QPushButton + stylesheet (orange #b06000 listening state) |
| `_apply_midi_out_learn_style` | 7905 | midi_out / midi_rx slot buttons — mode-coloured QPushButton + CTRL-click cycle |
| Step-seq step buttons / LED row | 5597 | hand-rolled gradient + glow (overlaps with LED rendering) |
| manual_trigger_8 / mult_2x4 / sr_latch_4 / toggle_4 button banks | various | per-module paint logic |
| Faceplate header transport / arm buttons | various | mix of stylesheet QPushButton + custom paint |

### Refactor steps

1. **Move primitives into shared module:**
   ```
   syb_core/widgets/
     button_recipe.py    # all _cap_*, _btn_*, _hex_*, _square_*, _engaged_*, _round_flush_strict
     button_states.py    # state renderers, MOMENTARY_STATES + LATCHED_STATES dicts, ANIM_HZ
     button_variants.py  # 9 R2-winner variant fns + B5b composition
     button_widget.py    # PatchwerkButtonWidget QWidget class
   ```

2. **Define `PatchwerkButtonWidget`** — single Qt widget:
   ```python
   class PatchwerkButtonWidget(QWidget):
       def __init__(self, parent=None, *, sub_type="B1", tier="M",
                     action="momentary", state="IDLE", mapped=False):
           ...
           self._sub_type = sub_type      # "B1" .. "B5b"
           self._tier = tier               # "XS" .. "XL"
           self._action = action           # "momentary" | "latched"
           self._state = state             # state name from action's state set
           self._mapped = mapped           # MIDI-MAPPED marker on/off
           self._reflectivity = 0.0
           self._theme = DEFAULT_THEME
           self._t = 0.0
           self._timer = QTimer(self); self._timer.timeout.connect(self._tick)
           self._timer.start(33)

       def set_state(self, state): ...
       def set_mapped(self, on): ...
       def set_reflectivity(self, v): ...
       def set_theme(self, theme): ...

       def paintEvent(self, _ev):
           p = QPainter(self); p.setRenderHint(QPainter.Antialiasing)
           tier_r = TIER_PX[self._tier]    # production px
           variant_fn = VARIANT_DISPATCH[self._sub_type]   # renders body
           state_fn = STATE_DISPATCH[self._action][self._state]
           state_fn(p, cx, cy, tier_r, variant_fn, self._t,
                    self._mapped, self._reflectivity, self._theme)
   ```

3. **Refactor step-seq step row** (largest blast radius) — map result/is_modded/gate_on semantics to canonical state names:
   - `result == "fired"` → ACTIVE (momentary fire decay)
   - `result == "gate_off"` → ERROR-like dim red (or new GATE_OFF state if absorbed into LATCHED)
   - `is_modded and not active` → MOD state
   - idle step → IDLE
   (Note: step LEDs are technically more LED than button; the integration may delegate the LED dot rendering to `StatusLEDWidget` and keep the button shell as PatchwerkButtonWidget.)

4. **Refactor MIDI-learn button** — replace QPushButton + stylesheet with PatchwerkButtonWidget(`sub_type="B2a"`, `action="latched"`, `state="LEARN"`). Cleaner state transitions; consistent visual with other latched buttons.

5. **Refactor manual_trigger_8 button bank** — 8 instances of PatchwerkButtonWidget(`sub_type="B3"`, `action="momentary"`, tier="S"). Per-button state from runtime.

6. **Wire faceplate transport buttons** — typically `sub_type="B4c"` (kitchen sink, high-prominence) at tier L.

### New primitives needed at integration

| Primitive | Source after integration | Description |
|---|---|---|
| `_additive_halo_hex` | `syb_core/widgets/button_recipe.py` (or move into `bloom_theme.py`) | Hex-shaped bloom for B5a/B5b |
| `_marker_ring_circle`, `_marker_ring_square`, `_marker_ring_hex` | `button_recipe.py` | Per-silhouette MIDI-MAPPED dashed marker rings |
| `STATE_DISPATCH` registry | `button_states.py` | `{action: {state_name: renderer_fn}}` |
| `VARIANT_DISPATCH` registry | `button_variants.py` | `{sub_type: body_renderer_fn}` |
| Tier dispatcher | `button_widget.py` | XS-tier simplification per audit |

---

## Integration test plan

Mainline must:

1. Build a new revision `syb_modular_ui_prototype_<next>.py` with `syb_core/widgets/button_*.py` modules and `PatchwerkButtonWidget` class.
2. Refactor `manual_trigger_8` (smallest blast radius — pure momentary B3 bank).
3. `py_compile` clean.
4. Launch app, open patch with manual_trigger_8, view module.
5. **Compare visually against `preview_engine_buttons_full.py`** — IDLE / HOVER / ACTIVE / DISABLED states should match. Acceptable diff: minor anti-aliasing.
6. Test each main-app state: click button (ACTIVE fire + 250 ms decay), set DISABLED (opacity 0.32), trigger ERROR.
7. Once verified: roll out to step_seq_16, MIDI-learn button, midi_out/midi_rx slot buttons, faceplate transports.
8. Build Phase 4.5 final matrix in parallel (`preview_engine_buttons_phase45.py`).
9. If all pass: section is truly LOCKED.

---

## Acceptance criteria

Section is LOCKED only when ALL five are true:

- ✅ Engine preview (`preview_engine_buttons_full.py`) shows all 9 sub-types + both state vocabularies (6+9) using canonical primitives.
- ⏳ Final preview matrix (`preview_engine_buttons_phase45.py`) renders every variant × tier × state × finish × theme combination (next step).
- ⏳ `_additive_halo_hex` primitive built and integrated into B5a/B5b bloom paths.
- ⏳ Per-silhouette MIDI-MAPPED marker primitives built.
- ⏳ Mainline integration revision built, launched, visually verified against previews.

Until all five pass, buttons are "preview-locked but integration-pending."

---

## What's NEW vs what's CANONICAL

| Item | Source |
|---|---|
| 8 R2 winner variant body renderers | CANONICAL (demo-agent 2026-05-14, R2 iteration B picks) |
| 6 sub-type categories (B1, B2a+b, B3, B4a+b+c, B5a, B5b) | CANONICAL (audit 2026-05-14; B5 split D1c resolution) |
| 6 momentary states / 9 latched states | CANONICAL (indicator-strategy 2026-05-14) |
| 5 tiers (XS/S/M/L/XL) | CANONICAL (`project-design-tier-vocabulary` 2026-05-14) |
| Square bevel band reduced to 0.20–0.26r per side | CANONICAL (preview-review reduction 2026-05-14, all 4 square variants) |
| B5b composition (latch groove + central LED dot) | CANONICAL (D1c resolution 2026-05-14) |
| `_additive_halo_hex` hex-aware bloom | **NEW pending** (integration phase) |
| `_marker_ring_circle / _square / _hex` per-silhouette markers | **NEW pending** (integration phase) |
| `PatchwerkButtonWidget` class | **NEW pending** (integration phase) |
| Move primitives to `syb_core/widgets/button_*.py` | **NEW pending** (integration phase) |

---

## STRUCTURAL VARIANTS (9 picks across 6 sub-types)

Beyond the 9 locked picks, future button work may extend these sub-types with new variants. The R1+R2 pipeline ensures any future addition starts at R1 from a clean slate ([[feedback-each-element-starts-at-r1]]).

Reference preview: `demos/preview_engine_buttons_full.py` (SCALE section, rows 1–9).

### B1 — Round momentary

Use case: standard press-to-trigger action button. Workhorse on most modules.
- Pick: RIM_FRAMED FOUR_RINGS (collar + low_proud cap + 4 concentric frames on cap)
- Real-world: Schurter MSM01 with engraved cap detail; vintage tube-radio momentary
- State: body-glow only (no integrated LED)
- Tier default: M

### B2a — Round latched (small lit recess)

Use case: latched mode toggle with small visible state indicator. Common in compact modules.
- Pick: INSET_FRAMED DOT (collar + flush + frame + lit recess + small central dot)
- Real-world: Mutable Yarns latch indicator; Eurorack patch-save buttons
- State: integrated LED (lit recess + dot)
- Tier default: M

### B2b — Round latched (large lit floor)

Use case: prominently-visible latched mode toggle. Studio gear / hi-fi transport.
- Pick: INSET_TRIPLE PLUS (collar + flush + 3 tight rings + lit floor)
- Real-world: Hammond drawbar tab; Tube-Tech illuminated channel
- State: integrated LED (lit floor — entire inner well illuminates)
- Tier default: L

### B3 — Square momentary

Use case: trigger / step-pad / mode-button in dense banks.
- Pick: RAISED BIGGER (flat outer + frame + raised inner cap)
- Real-world: TR-808 step pad style with raised relief; MPC trigger
- State: body-glow only
- Tier default: S

### B4a — Square latched (knurled-bezel emphasis)

Use case: latched square in dense bank where each button has tactile grip emphasis.
- Pick: BEZEL_KNURL_DOT THICKER (bezel + 10 thick knurl marks + flat cap + lit dot)
- Real-world: mil-spec illuminated push with knurled bezel; Schurter MCS22
- State: integrated LED (central dot)
- Tier default: S–M

### B4b — Square latched (multi-frame emphasis)

Use case: latched square where the inner detail matters more than the outer texture (e.g., mode bank with subtle frames).
- Pick: BEZEL_DEEP_FRAME TRIPLE (deep bezel + flat cap + 3 tight inner frames + lit dot)
- Real-world: C&K U-series illuminated; Schneider XB4 with framed legend
- State: integrated LED (small central dot)
- Tier default: M

### B4c — Square latched (kitchen sink — high-prominence)

Use case: hero button — transport / arm / record. Maximum detail justified by high frequency of attention.
- Pick: BEZEL_FULL BIGGER_DOT (deep bezel + dense knurl + flat cap + 2 frames + big lit dot)
- Real-world: vintage Marantz transport; Tek bench arm / panic
- State: integrated LED (big central dot)
- Tier default: L

### B5a — Hex momentary

Use case: hex-aesthetic momentary trigger. Distinguishes from round B1 in visual vocabulary.
- Pick: QUAD_RIM TIGHTER (hex collar + cap + 4 concentric hex frames)
- Real-world: hex-bezel industrial momentary; Buchla hex-cap aesthetic
- State: body-glow only (no integrated LED — momentary doesn't need persistent indicator)
- Tier default: M

### B5b — Hex latched

Use case: hex-aesthetic latched mode toggle. Combines mil-spec mechanical latch cue with integrated LED.
- Pick: QUAD_RIM_LATCH_DOT (B5a + horizontal latch groove + central lit dot — composition)
- Real-world: mil-spec hex pilot light with mechanical latch; aviation arm switch with hex bezel
- State: integrated LED (central dot) PLUS mechanical cue (latch groove)
- Tier default: M

### Variant compositions (deferred)

Future work — button GROUPS as separate compositional element:
- Radio-button banks (mutually exclusive latched cluster)
- Mute/solo cluster (paired latched buttons)
- Step-trigger array (N momentary B3 at XS or S in a grid)
- Transport cluster (play/stop/rec/loop — 4-button paired B4c)

These compositions are not in the button recipe — they're a separate element category. Treat as backlog per `project-design-element-scope`.

---

## Acceptance criteria (variants)

A variant is LOCKED when:
- ✅ Renders correctly in `preview_engine_buttons_full.py` under all 4 bloom themes × 3 finishes
- ✅ Inherits the locked state vocabulary per its action class (momentary 6 / latched 9)
- ✅ Documented in this section of BUTTON_RECIPE_LOCK.md
- ✅ Real-world reference identified
- ⏳ Mainline widget class extension built (deferred to mainline integration phase)
- ⏳ Production tier defaults validated against real module faceplates (deferred to faceplate design phase)
- ⏳ Phase 4.5 final matrix renders all 9 variants × 5 tiers × per-action states × 3 finishes × 4 themes
