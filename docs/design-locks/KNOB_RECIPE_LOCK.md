# Knob Recipe Lock — Section 2 of the design-language spec

_Locked 2026-05-13 after knobs Phase 3 R1 → R2 → 3.4 audit → 3.5/3.6/3.7/4 combined verification.
This is the canonical implementation spec for every knob variant in PATCHWERK.
Mainline must lift these primitives verbatim when building `RotaryKnobV3` (and trim / concentric / selector / bipolar derivatives)._

---

## TL;DR — the lock

| Component | Recipe |
|---|---|
| **Knob types** | continuous · selector · bipolar · trim · concentric (5 first-class types) |
| **Locked variants (R2)** | DOT_BIG_FACE · LINE_4POS · ENDPOINT_2 · FLAT_SLOT · BOTH_DOTS |
| **Tier set (user knobs)** | XS=12 · S=16 · M=22 · L=26 · XL=32 px (radius) — XS added 2026-05-14 for cross-element uniformity |
| **Tier set (trim pots)** | T=8 · TS=12 · TM=15 (no XS, no XL) — smaller-tier rule applies; trim is set-and-forget |
| **Concentric ratio** | top knob radius = bottom radius × 0.55 |
| **Sweep arc** | -135° to +135° = 270° (universal convention) |
| **Outside scale** | dim white LEDs (cool tint + faint per-marker glow); key markers brighter |
| **Symmetric scale rule** | every rotary scale evenly spaced across sweep — N positions = N indicators |
| **Bloom geometry** | radial (point LED) for face dots · oriented-linear for face lines |

---

## Canonical source files (lift targets)

1. **`demos/design_iterations_sheet_v2_knobs_r2.py`** — primitives: `_knob_body`, `_knob_knurl`, `_knob_flute`, `_face_dot`, `_face_line`, `_dot_scale`, `_line_scale`, `_bip_dot_scale`. The R2 picker UI is throw-away; the primitives are lift-ready.
2. **`demos/preview_engine_knobs_full.py`** — combined state + scale + finish + animation preview; LED-aware primitives (`_led_dot_scale`, `_led_line_scale`, `_led_dot`, `_led_line`, `_draw_face_dot`, `_draw_face_line`, `_radial_halo`, `_line_halo_along`); marker primitive `_marker_ring`; state renderers per type.
3. **`demos/slider_handle_demo.PALETTES`** — 11-palette table (shared with sliders).
4. **`demos/bloom_theme.py`** — BloomTheme dataclass + 4 presets (OFF / SUBTLE / STANDARD / CINEMATIC).

---

## Indicator vocabulary (locked rule — applies to every knob type)

Per `project-knob-indicator-rule` memory:

| Type | Face indicator | Outside scale | Notes |
|---|---|---|---|
| **Continuous** | DOT (rotates with value) | 11 dim-white LED dots (big at 0/50/100, small elsewhere) | Marshall-amp idiom; no numbers |
| **Selector** | LINE (points to current detent) | N dim-white LED lines, one per detent, symmetric across sweep | LINE_4POS shown; extensible to N positions per `project-symmetric-scale-rule` |
| **Bipolar** | LINE | 2 dim-white LED dots at -135° and +135° endpoints (A/B) | No centre, no intermediates — face line shows position; A/B mark range |
| **Trim pot** | none (screwdriver slot only) | none | Set-and-forget; renders at SMALLER tier set |
| **Concentric** | TWO face DOTs (top + bottom) | 11-dot scale on bottom skirt (top has no outer scale) | Both knobs are continuous; deploy only when params are conceptually linked |

---

## Tier sizes (canonical)

### User knobs (XS/S/M/L/XL — locked 2026-05-14, XS added for cross-element uniformity)
| Tier | Radius | Real-world reference |
|---|---|---|
| XS | 12 px | Ultra-compact panel knob (sub-encoder size, Bourns 90 mini, dense desktop arrays) |
| S | 16 px | Small Eurorack knob (Mutable / Bourns Pro Audio Cermet) |
| M | 22 px | Standard module knob (Davies 1900H, Sifam K) |
| L | 26 px | Mixer channel / Marshall amp knob (project default) |
| XL | 32 px | Large attenuator / Marantz HiFi knob |

### Trim pots (per `project-trim-pot-smaller-tier`)
| Tier | Radius | Real-world reference |
|---|---|---|
| T | 8 px | Bourns 3299/3296 (6.4mm) |
| TS | 12 px | Vishay 8mm |
| TM | 15 px | Larger panel trim |
| — | (no XL) | Trim pots never get user-knob-size |

### Concentric
- `r_top = r_bottom × 0.55` (locked).
- Bottom uses USER_TIERS; top scales automatically.

---

## Indicator geometry rules

### Face-dot indicator (continuous, concentric top/bottom)
- Position: at angle `deg` measured from "down" reference (mechanical zero at -135°)
- Offset from knob centre: `knob_r × 0.72` (= 72% of radius outward)
- Dot radius (idle): `knob_r × 0.10` minimum 1.5 px
- Dot radius (active): `knob_r × 0.18` (slightly larger when lit)

### Face-line indicator (selector, bipolar)
- Inner endpoint at radius `knob_r × 0.12`
- Outer endpoint at radius `knob_r × 0.67` (default; selectors use 0.72)
- Thickness (idle): 2.0 px
- Thickness (active): 2.4 px (selectors), 2.4 px (bipolar)

### Outside dot scale (continuous, bipolar, concentric)
- Ring radius: `knob_r + 8 px` (fixed offset, all tiers)
- Dot small radius: 1.4 px (intermediates)
- Dot big radius: 2.6 px (key markers — 0/50/100 or endpoints)
- Dot colours: `LED_WHITE_DIM #C0C8D2` (intermediates) / `LED_WHITE_KEY #E0E6EE` (key)
- Per-dot LED glow: peak from `BloomTheme.idle_led_peak`, radius from `idle_led_glow_mult`

### Outside line scale (selector)
- Ring radius: `knob_r + 6 px` (slightly closer than dot scale because lines extend outward)
- Line length: 5.0 px (extends outward from ring)
- Thickness: 1.4 px
- Colour: `LED_WHITE_DIM`
- Per-line glow: peak `idle_led_peak × 0.85`

### Knurled rim
- 20 ticks (user knobs), 24 ticks (trim pots)
- Depth: `radius × 0.05` (user knobs), `× 0.07` (trim pots)
- Colour: dark ink (knob body shadow)

---

## State vocabulary applied to knobs

Same two-layer model from `project-state-vocabulary` memory:

### Motion-source states (one at a time)
Priority order (top wins): `ERROR > DISABLED > ACTIVE > MIDI-LEARNING > MODULATED > AUTOMATED > HOVER > IDLE`

| State | Face indicator | Halo | Animation |
|---|---|---|---|
| IDLE | dim white LED dot/line | none | static |
| HOVER | bright white LED dot/line + ring around knob | none | static |
| ACTIVE | palette amber LED + radial halo at face position | none | static |
| MIDI-LEARNING | bright gold LED + pulsing halo + bright ring | **2.5 Hz** pulse |
| MODULATED (CV) | amber LED + breathing halo | **0.4 Hz** breathing |
| AUTOMATED | cyan LED + cyan ring | **0.3 Hz** subtle pulse |
| DISABLED | dim grey at 0.32 alpha | none | static |
| ERROR | red LED + red halo + red ring | **1.5 Hz** alarm pulse |

### Assignment markers (additive)
- **MIDI-MAPPED**: dashed amber outer ring at expand=10 (outside any motion-source ring). Reads regardless of motion state.
- **AUTO-MAPPED** (future), **CV-MAPPED** (future): reserved.

### Type-specific notes
- **Bipolar**: same 8 motion-source states; face LINE bloom uses oriented-linear primitive (rotates with value).
- **Concentric**: state applies to whichever knob is grabbed (typically TOP for secondary parameter). The other knob renders IDLE simultaneously. ERROR state colours BOTH knobs red + adds ring around the whole stack.
- **Trim pot**: limited state set — IDLE / HOVER / DISABLED / ERROR. No ACTIVE/MOD/AUTO/MIDI-LEARN (trim is set-and-forget). ERROR halos the whole knob (no face indicator to colour).

---

## Bloom geometry per face indicator

Per `feedback-realistic-light-physics` memory:

| Indicator | Bloom shape | Primitive |
|---|---|---|
| Face DOT (continuous, concentric top+bottom) | radial (point source) | `_radial_halo` |
| Face LINE (selector, bipolar) | oriented elliptical along line direction | `_line_halo_along` + `_draw_face_line` |
| Outside scale LED (dot or line) | small radial / linear glow per marker | `_led_dot` / `_led_line` |

Halo extents derived from `BloomTheme` per state — see `demos/bloom_theme.py` for STANDARD values.

---

## Bloom theme integration

Per `project-bloom-user-settings-buckets` memory:

All bloom parameters reference `bloom_theme.get_active_theme()` rather than magic literals. Switching themes via UI re-renders all blooms under the new intensity.

| Theme | Use case |
|---|---|
| OFF | Indicators only; no glow paint (performance / accessibility) |
| SUBTLE | ~50% intensity (clinical / dim ambient) |
| STANDARD | Canonical Phase-4 values — matches current locked visuals |
| CINEMATIC | ~140% intensity (impressive / showcase mode) |

---

## Faceplate finish verification

Per `project-faceplate-finish-verifiable` memory:

Knob preview includes the finish toggle (matte / semi / reflective) — every state×tier×theme combination must remain legible under all three finishes.

---

## Integration plan — mainline `RotaryKnobV3`

### Files to refactor
- `main_app/syb_modular_ui_prototype_<latest>.py` — define new `RotaryKnobV3` class
- Replace current knob widget references throughout the patch
- Move canonical primitives from `demos/preview_engine_knobs_full.py` into `syb_core/widgets/knob_recipe.py`

### Refactor steps
1. Move LED-aware primitives (`_led_dot_scale`, `_led_line_scale`, `_face_dot_at`, `_face_line_endpoints`, `_draw_face_dot`, `_draw_face_line`, `_radial_halo`, `_line_halo_along`, `_marker_ring`) to `syb_core/widgets/knob_recipe.py`.
2. Move `BloomTheme` + `THEMES` to `syb_core/bloom_theme.py` (canonical location).
3. Define `RotaryKnobV3(knob_type, value, n_positions=None, ...)` accepting type-specific params.
4. Add `QTimer` 30 fps animation loop in widget; `self._anim_t += 0.033`.
5. Add motion-source state attributes (`self._midi_learning`, `self._modulated`, `self._automated`, `self._error`) and marker attributes (`self._midi_mapped`, future `_auto_mapped`, `_cv_mapped`).
6. `_current_motion_state()` helper returns priority-resolved state name.
7. `paintEvent` dispatches to per-state renderer; markers layered on top.
8. Settings UI: bloom theme selector (matte/subtle/standard/cinematic) loads from user preference → `set_active_theme()` at app startup.

---

## Integration test plan

Mainline must:

1. Build a new revision `syb_modular_ui_prototype_<next>.py` that replaces current knob widget with `RotaryKnobV3` in one module (e.g. VCO coarse/fine concentric — exercises the concentric variant + dot indicator + tier-L size).
2. `py_compile` clean.
3. Launch app, open patch with the test module.
4. **Compare visually against `demos/preview_engine_knobs_full.py`** at STANDARD theme + matte finish — IDLE / HOVER / ACTIVE states should match. Acceptable diff: minor anti-aliasing from QWidget vs QOpenGLWidget.
5. Cycle through interactive states: idle, hover, drag, simulated CV modulation, MIDI-learn, MIDI-mapped, automated, error.
6. **Compare against `demos/preview_engine_knobs_phase45.py`** for tier coverage — render the same module at S/M/L/XL tiers and verify proportions.
7. Lift bloom theme selector into settings; user can switch and see real effect across all knobs in the patch.
8. Once verified for VCO concentric: roll out to selector / bipolar / continuous / trim use cases (filter cutoff selector, attenuverter bipolar, level continuous, calibration trim).
9. Phase 4.5 final matrix (`preview_engine_knobs_phase45.py`) already exists — confirm it stays correct after any primitive moves to `syb_core/widgets/`.
10. If all pass: section is truly LOCKED. Update memory `feedback-integration-plan-documented-tested` status board.

---

## Acceptance criteria

Section is LOCKED only when ALL four are true:

- ✅ Engine preview (`preview_engine_knobs_full.py`) shows all 5 knob types + 12 motion-source/MIDI-MAPPED states using canonical primitives.
- ✅ Final preview matrix (`preview_engine_knobs_phase45.py`) renders every variant × tier × state × finish × theme combination — locked 2026-05-14.
- ⏳ Canonical primitives moved to `syb_core/widgets/knob_recipe.py` shared module.
- ⏳ Mainline integration revision built, launched, visually verified against previews.

Until all four pass, knobs are "preview-locked but integration-pending."

---

## What's NEW vs CANONICAL (this section)

| Item | Source |
|---|---|
| 5 knob types (continuous / selector / bipolar / trim / concentric) | CANONICAL — element vocabulary |
| Indicator vocabulary (dot/line/A-B/slot) | NEW — `project-knob-indicator-rule` (2026-05-13) |
| Symmetric scale rule | NEW — `project-symmetric-scale-rule` (2026-05-13) |
| Trim-pot smaller tier set | NEW — `project-trim-pot-smaller-tier` (2026-05-13) |
| Concentric deployment rule | NEW — `project-concentric-knob-usage` (2026-05-13) |
| Bipolar face-LINE + 2-endpoint dots | NEW — refined from `DOT_SYM_5` to `ENDPOINT_2` (2026-05-13) |
| Outside dim-white LED scale | NEW — extends `feedback-realistic-light-physics` |
| Oriented-linear bloom for face LINE | NEW — `feedback-realistic-light-physics` updated |
| Bloom theme system | NEW — `project-bloom-user-settings-buckets` (2026-05-13) |
| State + marker + animation + finish | INHERITED from slider Phase 4 (locked 2026-05-13) |

---

## STRUCTURAL VARIANTS (5 knob types)

Beyond paint recipe, knobs come in 5 first-class structural types — each with its own indicator + state semantics. All share the locked tier set (XS/S/M/L/XL for user knobs; T/TS/TM for trim) and bloom theme framework; types differ in indicator vocabulary + scale composition.

Reference preview: `demos/preview_engine_knobs_full.py` (SCALE section) + `demos/preview_engine_knobs_phase45.py` (final matrix).

### Continuous
**Use case:** value knobs with smooth 0–100% range. The workhorse — pick this when no other type is explicitly justified.
- **R2 pick:** DOT_BIG_FACE — face dot rotates with value; 11 dim-white LED dots outside (big at 0/50/100, small intermediates).
- **Real-world refs:** Marshall amp idiom · Davies 1900H · vintage Marantz tuning.
- **Indicator:** dot (rotates).
- **Tier default:** L (26 px production).

### Selector
**Use case:** mode / waveform / scale selectors with N discrete detents.
- **R2 pick:** LINE_4POS — face line points at current detent; N dim-white LED lines outside the sweep, one per detent, symmetric across the 270° span.
- **Real-world refs:** Mutable Plaits mode selector · Sequential rotary mode.
- **Indicator:** line (points at detent).
- **Tier default:** M (22 px production).
- Variant rule: line scale is symmetric per `project-symmetric-scale-rule` — N positions = N indicators evenly spaced across sweep.

### Bipolar
**Use case:** attenuverter / centre-detent CV depth controls with ±range.
- **R2 pick:** ENDPOINT_2 — face line shows position; 2 dim-white LED dots outside marking the −/+ endpoints; no centre indicator, no intermediate dots.
- **Real-world refs:** Mutable Yarns attenuverter · Make Noise Maths attenuvert.
- **Indicator:** line (face) + 2 endpoint dots (scale).
- **Tier default:** M.

### Trim (set-and-forget)
**Use case:** calibration / set-and-forget controls; screwdriver-adjusted.
- **R2 pick:** FLAT_SLOT — screwdriver slot only; no face indicator, no outer scale.
- **Real-world refs:** Bourns 3299/3296 · Vishay panel trim · Piher PT15.
- **Indicator:** none (slot only).
- **Tier set:** T/TS/TM (smaller — per `project-trim-pot-smaller-tier`). NOT XS/S/M/L/XL.

### Concentric (stacked dual)
**Use case:** two conceptually-linked params share one panel slot — e.g. VCO coarse + fine, filter cutoff + resonance, AD envelope, utility offset + range. Never stack unrelated controls (per `project-concentric-knob-usage`).
- **R2 pick:** BOTH_DOTS — face dot on TOP knob + face dot on BOTTOM knob; 11-dot scale on bottom skirt (top has no outer scale).
- **Real-world refs:** vintage Mu-Tron · Moog filter resonance + cutoff · MakeNoise Maths utility.
- **Indicator:** dual dots (top + bottom independent values).
- **Tier rule:** `r_top = r_bottom × 0.55`; bottom uses USER_TIERS; top scales automatically.
- **State scope:** per `project-multi-handle-state-scope` — mouse-driven states (ACTIVE/HOVER) apply to the manipulated knob only; external states (MOD/AUTO/LEARN/ERROR) propagate to both.

---

## Acceptance criteria (variants)

A variant is LOCKED when:
- ✅ Renders correctly in `preview_engine_knobs_full.py` under all 4 bloom themes × 3 finishes
- ✅ Inherits the locked 12-state vocabulary (8 motion-source + 4 with MIDI-MAPPED marker), with exceptions documented (trim = limited state set; concentric = multi-handle scope)
- ✅ Documented in this section of KNOB_RECIPE_LOCK.md
- ✅ Real-world reference identified
- ✅ Phase 4.5 final matrix (`preview_engine_knobs_phase45.py`) renders the variant × all tiers × all states × all finishes × all themes — locked 2026-05-14
- ⏳ Mainline `RotaryKnobV3` widget extension built (deferred to mainline integration phase)
- ⏳ Production tier defaults validated against real module faceplates (deferred to faceplate design phase)

---

## Cross-references

- `docs/DESIGN_VARIANT_PICKS_KNOBS_FINAL.md` — engine-verified picks lock
- `docs/KNOBS_PRE_ENGINE_AUDIT.md` — pre-engine audit checklist
- `docs/SLIDER_RECIPE_LOCK.md` — parallel doc for sliders (Section 1)
- `docs/LED_RECIPE_LOCK.md` — parallel doc for LEDs (Section 3)
- `docs/BUTTON_RECIPE_LOCK.md` — parallel doc for buttons (Section 4)
- `demos/preview_engine_knobs_full.py` — combined state+scale+finish+theme preview
- `demos/preview_engine_knobs_phase45.py` — Phase 4.5 final matrix
- `demos/bloom_theme.py` — bloom theme dataclass + 4 presets
- All `project-*-knob-*`, `feedback-realistic-light-physics`, `project-state-vocabulary` memories
