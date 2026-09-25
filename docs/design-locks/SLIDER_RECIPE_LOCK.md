# Slider Recipe Lock — Section 1 of the design-language spec

_Locked 2026-05-13. This is the canonical implementation spec for the slider element
across all PATCHWERK / SYB Live Cable modules. Mainline must lift these primitives
verbatim when refactoring `VerticalSliderV3` and any future slider widget class._

---

## TL;DR — the lock

| Component | Recipe |
|---|---|
| **Handle shape** | T-bar (shape `"C"` in `slider_handle_demo.py`) with deep ribbed waist |
| **Handle depth recipe** | D14 / L2 Default (`bevel_strength=1.0, side_face_h=0.30, specular_size=0.09, edge_vignette=80, inner_track=True, cast_shadow=True`) |
| **Handle palette (idle)** | INACTIVE_HI / MID / LO — neutral greyscale |
| **Handle palette (active)** | Deep amber (PALETTES[5]) — `#E0A24E / #B47A20 / #724A10`, side `#2C1A06`, glow `rgba(180,122,32,100)`, edge `#724A10` |
| **Track** | Canonical dark slot + steel-blue (or amber when active) fill bar + COMBO additions |
| **Track-COMBO additions** | 3.5px dust-cover lips on both edges of slot + fixed-spacing ticks (TICK_SPACING_PX=11.0, every 5th major) |
| **Tier sizes (XS/S/M/L/XL)** | Handle 19×5 / 21×7 / 24×10 / 26×14 / 28×18 (handle_w = track_w + 17, locked 2026-05-13) — track widths 2 / 4 / 7 / 9 / 11 — track heights 40 / 60 / 85 / 110 / 140 — **XS added 2026-05-14** for cross-element tier uniformity |

---

## Canonical source files (lift targets)

1. **`demos/slider_handle_demo.py`** — defines `Recipe` dataclass, `PALETTES` table, `TIERS` table, `TRACK_H` constant, `paint_recipe()` function (10-layer painter), `_tbar_path()` (T-bar shape builder), all colour palettes (Amber / Pale gold / Warm orange / Brass / Copper / Deep amber / Neutral / Silver / Bone).
2. **`demos/preview_engine_sliders.py`** — wraps the canonical recipe into a faceplate-context preview; defines `_prod_default_track()` (canonical track), `_prod_combo_lip_tick()` (NEW canonical COMBO track recipe with lips + ticks), `_prod_tbar_deep()` (thin wrapper around `paint_recipe`).

Mainline integration imports (or copy-pastes) from those two files.

---

## 10-layer handle paint recipe

Source: `slider_handle_demo.py:paint_recipe()` (lines 263-371). Lifted verbatim — these are the exact paint operations in order.

| # | Layer | Implementation |
|---|---|---|
| 1 | **Side face (lip)** | Translate path down by `h * side_face_h`, subtract original, fill with `pal.side` (active) or `#0A0A0C` (idle). Creates 3D depth illusion. |
| 2 | **Base fill** | Linear gradient top→bottom: `pal.hi` → `pal.mid` (at 0.45) → `pal.lo` (active) or `INACTIVE_HI/MID/LO` (idle). |
| 3 | **Edge vignette** | Radial gradient from centre, `alpha=0` (0%) → `alpha=0` (60%) → `alpha=v` (100%). Darkens corners. |
| 4 | **Bevel emboss** | Top + left HI white α(80+90·s); bottom + right shadow black α(90+110·s); thickness `0.7+0.6·s`. Hard 4-edge bevel ring. |
| 5 | **Rim light** | Top + left rim white α(a, full); right rim α(a·0.55). Subtle catch-light. |
| 6 | **Glass sheen** | Upper-half-rect linear gradient white α(alpha)→α(0). For L4 Max recipe only. |
| 7 | **Specular dot** | Radial gradient at (cx, top + h·0.16): white α(235) → α(110) → α(0) over `rad·2.4`. The signature highlight. |
| 8 | **Notch scores** | Horizontal lines for shape `"E"` only — N/A for T-bar. |
| 9 | **Outline** | 1px edge using `pal.edge` (active) or `#101012` (idle). |
| 10 | **Centre groove** | 1.0 or 1.4 px line across the waist (shape `"C"`) — white when active, `#C8C8CC` idle. |

If any layer is skipped, the result drifts from the locked recipe. Mainline must implement all 10.

---

## Tier sizes (canonical — XS/S/M/L/XL, locked 2026-05-14)

Lifted from `slider_handle_demo.TIERS`:

| Tier | Handle W | Handle H | Track W | Track H | Real-world reference |
|---|---|---|---|---|---|
| **XS** | 19 | 5 | 2 | 40 | Sub-miniature trimmer-fader (ALPS RS-A0NV); dense fader arrays |
| **S** | 21 | 7 | 4 | 60 | Volca / mini-fader (1Ur compact module) |
| **M** | 24 | 10 | 7 | 85 | Eurorack standard fader |
| **L** | 26 | 14 | 9 | 110 | Mixer channel 60mm (project default) |
| **XL** | 28 | 18 | 11 | 140 | Mixer master 100mm / studio fader |

XS added 2026-05-14 for cross-element tier vocabulary uniformity (sliders + knobs + LEDs all use XS/S/M/L/XL). Code consumers should use `TIER_BY_NAME["L"]` (or any tier name) instead of `TIERS[N]` indexing — prepending XS shifted L from index 2 to 3, XL from 3 to 4.

**Handle-width derivation rule (locked 2026-05-13):** `handle_w = track_w + 17` — derived from minor-tick total horizontal footprint minus 2 px. The handle silhouette sits *inside* the minor-tick zone with 1 px breathing room each side, so handle and ticks never visually collide.

Track widths halved 2026-05-13 (was 8 / 14 / 18 / 22) for slimmer Penny+Giles-style channel.
Track heights promoted to per-tier 2026-05-13 (was shared TRACK_H=110). Handle-to-track-h ratio is now ~12-13% across all tiers (was 6-16% — heavily skewed). Tick count auto-derived from `track_h / TICK_SPACING_PX`, so each tier shows a different number of ticks (S≈6, M≈9, L=11, XL≈14).

**Fader length per module (deferred):** XS/S/M/L/XL track_h values are *defaults / archetypes*. Final per-module track_h is determined at faceplate design time (when laying out actual production modules) — multiple modules may share a length, but the codified module-to-tier (or module-to-custom-length) mapping is captured then, not now. See memory `project-slider-length-per-module-deferred`.

`TRACK_H = 110` remains as a backwards-compat default constant = tier L's track_h.

Engine preview uses **tier L**. Production module faceplates select tier based on Uw module width.

---

## Track recipe — canonical + COMBO

### Canonical track (from `SliderCell.paintEvent` lines 414-443 in `slider_handle_demo.py`)

```
1. Outer rim: TRACK_EDGE (#3A3A3A) — 1.5px outset rectangle around the slot
2. Slot fill: TRACK_DARK (#0A0A0C) — dark inner rectangle
3. Top + bottom sealing lines: 1px black α(200)
4. Inner-track top shadow: 6px linear gradient α(220→0) top-down
5. Inner-track bottom shadow: 6px linear gradient α(0→220) top-down
6. Fill column from track bottom up to grip position:
   - Active: AMBER_GLOW rgba(255, 198, 82, 80)
   - Idle:   steel-blue rgba(70, 130, 180, 110)
```

### COMBO track additions (NEW, locked 2026-05-13)

Source: `preview_engine_sliders._prod_combo_lip_tick()`. Mainline lifts:

```
After steps 1-6 above, add:

7. Dust-cover lips on both edges of slot:
   - Width: 3.5 px (lip_w parameter; tunable per Uw/tier in future)
   - Height: TRACK_H + 2.8 px (covers full track + 1.4 px overhang top/bottom)
   - Position: outer edges of slot
   - Fill: K_BODY_HI (#444448)
   - Corner radius: 1.0 px
   - One on each side

8. Side ticks on both sides at FIXED SPACING (Penny+Giles broadcast-fader idiom):
   - Constants: TICK_SPACING_PX = 11.0   TICK_MAJOR_EVERY = 5
   - Count formula: n_intervals = max(1, round(track_h / TICK_SPACING_PX)); n_ticks = n_intervals + 1
   - At TRACK_H=110 this yields 11 ticks per side; at TRACK_H=220 it yields 21; etc.
   - Tick base offset: track_w/2 + lip_w + 1.5 px (outside the lips)
   - Tick length:
     - Major (i % 5 == 0): 7.5 px
     - Minor: 4.5 px
   - Tick thickness:
     - Major: 1.4 px
     - Minor: 0.9 px
   - Tick colour: K_IND (#C8C8CC)
   - Cosmetic pen (1px regardless of zoom)
```

This produces the locked TBAR_DEEP + COMBO track design.

### Scaling rule for ticks (LOCKED, 2026-05-13)

**Fixed-spacing, not fixed-count.** As tracks scale (per Phase 3.7 scale-round), tick spacing stays constant in pixel space; the number of ticks varies with track length. This matches Penny+Giles broadcast faders and ALPS pro-audio scales. The mainline VerticalSliderV3 must use this formula — never hardcode `n = 11`.

---

## Provisional palette per state (state vocabulary — colour round formalises)

When colour round lands, each state uses a specific palette index:

| State | Active flag | Palette index | Notes |
|---|---|---|---|
| IDLE | False | n/a (uses INACTIVE_*) | Greyscale handle |
| HOVER | False + overlay | n/a | Add subtle K_IND outline halo |
| ACTIVE (grabbed) | True | 5 — Deep amber | Full D14·A06 lit appearance |
| MIDI-MAPPED | True | 5 — Deep amber, dimmer | Steady amber indicator |
| MIDI-LEARNING | True | 1 — Pale gold (brighter) | Pulses (animation handled by widget) |
| MODULATED | True | 0 — Amber + soft halo | CV-modulation indicator |
| AUTOMATED | True | TBD — cyan palette to be added | Provisional cyan (#40C0E0) |
| DISABLED | False + opacity 0.32 | n/a | Greyed out, low contrast |
| ERROR | True | TBD — red palette to be added | Sparse-red rule: red reserved for error |

Need to add **2 new palettes** (Automation cyan, Error red) to `PALETTES` in `slider_handle_demo.py` when colour round lands. The Recipe dataclass supports them natively.

---

## Integration plan — what mainline must do

### File to refactor

`main_app/syb_modular_ui_prototype_<latest>.py` — class `VerticalSliderV3` at line 1333 (in 16_5_14).

### Current state (16_5_14)

Simple P8 widget: 6px track + plain rect grip + thin indicator line. **None of the locked recipe is implemented.** Even the 2026-05-11 D14·A06 lock has not been lifted.

### Refactor steps

1. **Import from `demos/slider_handle_demo.py`** (or, preferred long-term, MOVE these to `syb_core/widgets/slider_recipe.py` so both demos and main_app share):
   ```python
   from slider_handle_demo import (
       paint_recipe, Recipe, PALETTES, TIERS, TRACK_H,
       TRACK_DARK, TRACK_EDGE, AMBER_GLOW,
       INACTIVE_HI, INACTIVE_MID, INACTIVE_LO,
   )
   ```

2. **Import from `demos/preview_engine_sliders.py`** (or, again, move to shared module):
   ```python
   from preview_engine_sliders import _prod_combo_lip_tick, IDLE_RECIPE, ACTIVE_RECIPE
   ```

3. **Replace `VerticalSliderV3` constants**:
   - `_TRACK_W = 6` → use `TIERS[2][3]` (or the per-tier value matching module Uw)
   - `_GRIP_W = 22` → use `TIERS[2][1]`
   - `_GRIP_H = 10` → use `TIERS[2][2]`
   - `_WIDGET_W = 38` → recompute as `max(_GRIP_W, lip+tick footprint width) + margin`
   - `track_h = 96` → switch default to `TRACK_H = 110` (or accept per-module override as today)

4. **Replace `VerticalSliderV3.paintEvent()`** with this paint sequence:
   ```python
   def paintEvent(self, _ev):
       p = QPainter(self)
       p.setRenderHint(QPainter.Antialiasing)
       p.fillRect(self.rect(), _V3_BODY_FILL)
       cx = self._cx(); active = self.drag_active   # OR self._midi_mapped / self._modulated / etc.
       value_t = self._t()
       # Track + COMBO additions (lips + ticks)
       _prod_combo_lip_tick(p, cx, (self._track_top() + self._track_bot()) / 2,
                             active=active, value=value_t)
       # Handle (canonical paint_recipe via wrapper)
       grip_y = self._grip_y()
       recipe = ACTIVE_RECIPE if active else IDLE_RECIPE
       paint_recipe(p, cx, grip_y, _GRIP_W, _GRIP_H, recipe, active=active,
                    draw_cast_shadow_cb=self._cast_shadow)
       # Value readout + label (existing code, unchanged)
       ...
   ```

5. **Add cast-shadow callback** `self._cast_shadow(p, ccx, ccy, ww, hh)` — copy from `SliderCell.paintEvent` lines 445-454.

6. **Wire state flags**: VerticalSliderV3 needs new instance attrs:
   - `self.drag_active` (already exists)
   - `self._midi_mapped: bool` (new)
   - `self._midi_learning: bool` (new)
   - `self._modulated: bool` (new)
   - `self._automated: bool` (new)
   - `self._disabled: bool` (override from `setEnabled`)
   - `self._error: bool` (new)
   And derive the correct recipe per active-state in paintEvent.

### New primitives needed (don't exist yet in canonical sources)

1. **`_prod_combo_lip_tick()`** — currently in `preview_engine_sliders.py`. Move to `syb_core/widgets/slider_recipe.py` so main_app can import without depending on demos/.
2. **Automation palette** — add `Palette("Automation", QColor("#A0DFF0"), QColor("#40C0E0"), QColor("#1E7090"), ...)` to `slider_handle_demo.PALETTES`. Provisional colour; finalise in colour round.
3. **Error palette** — add `Palette("Error", QColor("#FFC8C0"), QColor("#CC2020"), QColor("#6E1010"), ...)`. Sparse-red rule applies.

### Suggested shared-module location

To break the demos/main_app dependency cycle:

```
syb_core/
  widgets/
    __init__.py
    slider_recipe.py   # paint_recipe, Recipe, PALETTES, TIERS, TRACK_H, ...
    slider_track.py    # _prod_default_track, _prod_combo_lip_tick, ...
```

Both `demos/slider_handle_demo.py` and `main_app/syb_modular_ui_prototype_*.py` re-export or re-import from `syb_core.widgets`. Single source of truth.

---

## Integration test plan

Mainline must:

1. Build a new revision `syb_modular_ui_prototype_<next>.py` that refactors `VerticalSliderV3.paintEvent()` per the steps above.
2. Use the slider in an existing module (e.g. envelope_adsr has 4 sliders — replace its slider widgets with the new VerticalSliderV3).
3. `py_compile` the new revision.
4. Launch the app, open the patch, view the module.
5. **Compare visually against `demos/preview_engine_sliders.py` rendering** — track + handle should match. Acceptable diff: minor pixel-level differences from QWidget vs QOpenGLWidget anti-aliasing. NOT acceptable: missing layers, wrong colours, wrong tier sizes.
6. Test interaction states: drag, MIDI-learn, modulation visible. Each state matches the corresponding panel in `demos/preview_engine_sliders_states.py`.
7. If pass: section is truly LOCKED. Update memory `feedback-integration-plan-documented-tested` status board.
8. If fail: identify the broken layer, surgical fix, re-test.

---

## Acceptance criteria

Section is LOCKED only when ALL three are true:

- ✅ Engine preview (`preview_engine_sliders.py`) shows the design at production fidelity using canonical primitives.
- ✅ State preview (`preview_engine_sliders_states.py`) shows all 9 states distinguishable + each state uses canonical recipe + provisional palette.
- ⏳ Mainline integration revision built, launched, visually verified against previews. **Currently pending.**

Until step 3 passes, sliders are "preview-locked but integration-pending."

---

## What's NEW vs what's CANONICAL

| Item | Source |
|---|---|
| 10-layer paint_recipe | CANONICAL (SVG-agent 2026-05-11) |
| 5 tiers (XS/S/M/L/XL) handle + track sizes | CANONICAL (SVG-agent 2026-05-11; XS added 2026-05-14) |
| 9 palettes (Amber, Deep amber, Brass, etc.) | CANONICAL (SVG-agent 2026-05-11) |
| Recipe dataclass + 10 fields | CANONICAL (SVG-agent 2026-05-11) |
| Track with rim + dark fill + inner shadows + fill column | CANONICAL (SVG-agent 2026-05-11) |
| **COMBO track (3.5px lips + 11 ticks every-5th-major)** | **NEW** (demo-agent 2026-05-13, this session) |
| **Automation + Error palettes** | **NEW pending** — colour round formalises |
| **State vocabulary (idle/hover/active/MIDI/learn/mod/auto/disabled/error)** | **NEW pending** — colour round + state-vocabulary memory |

---

## STRUCTURAL VARIANTS (added 2026-05-13 — retro audit gap closure)

Beyond the locked single-handle continuous vertical, sliders support these structural variants. All share the locked TBAR_DEEP + COMBO primitives; variants only add geometry/configuration changes.

Reference preview: `demos/preview_engine_sliders_variants.py`.

### Dual-handle vertical (gap 1)
**Use case:** range / window selectors (min/max), A/B crossfaders, **SR6 module** range selector.

- **Two TBAR_DEEP handles** on one COMBO track, at independent values (`value_a`, `value_b`).
- **Fill column** paints between the two handles (the "window" between min and max) — not from track bottom.
- **State independence:** each handle has its own motion-source state (one can be ACTIVE while the other is IDLE).
- **Marker independence:** each handle has its own MIDI-MAPPED marker.
- **Bloom independence:** if handle A is ACTIVE, only handle A blooms.
- **Z-order:** lower-value handle drawn first so it sits behind the higher-value handle if values converge (cleaner stacking).
- **Constraint (production):** handles cannot overlap (enforced by widget — clamp `value_a ≤ value_b - epsilon`).

### Detent vertical (gap 4)
**Use case:** mode selectors, scale-tone selectors, level incrementers (e.g. 10dB steps).

- **N-step stepped slider** — handle snaps to discrete positions. N is widget-configurable (default 5).
- **Detent markers:** BIG dim-white LED dots at each detent position, flanking the track on both sides (offset = `track_w/2 + lip + 1.5 + 8 px` outside the tick zone). Larger than the regular per-fraction tick dots.
- **Handle:** locked TBAR_DEEP; value always snaps to nearest detent.
- **Snap function:** `_detent_snap(value, n_steps)` returns the nearest detent's continuous value.
- **State / bloom:** same as standard slider.

### Horizontal (gap 2)
**Use case:** pan, volume strips, EQ horizontals, master fader rotated.

- **Same TBAR_DEEP + COMBO primitives, rotated 90°** — implemented via `QPainter.rotate(90)` around the handle position.
- **Track:** horizontal slot; left edge = 0.0, right edge = 1.0.
- **Lips:** above and below the track (instead of left and right).
- **Tick scale:** dim-white LED ticks ABOVE and BELOW the track at fixed `TICK_SPACING_PX`.
- **Handle LED strip:** runs PERPENDICULAR to motion — so for horizontal, the LED strip is VERTICAL inside the handle.
- **Bloom orientation:** the linear bloom is therefore oriented VERTICALLY (`_additive_halo_linear` with length=narrow, height=tall — opposite of vertical slider).
- **Tier dimensions:** track_w (long axis) = vertical track_h (110 default); track_h (thin axis) = vertical track_w (9 default L). Handle long axis = vertical handle_h (14 L); handle thin axis = vertical handle_w (26 L).

### Horizontal dual-handle (combo of variants 1 + 2 — added 2026-05-13)
**Use case:** horizontal range selectors (window / band / crossover regions), horizontal A-B blender, horizontal min/max value bracket.

Variants are **orthogonal** — any combination is supported:
- vertical vs horizontal (axis)
- single vs dual handle (handle count)
- continuous vs detent (snap behaviour)

A dual-handle horizontal slider inherits both:
- Dual-handle behaviour (independent state + marker per handle, fill column paints between handles)
- Horizontal geometry (rotated 90°, LED strip vertical inside handle, ticks above/below track, bloom oriented vertically)

Reference: `_draw_horizontal_dual` in `demos/preview_engine_sliders_variants.py` panel 5.

### Bipolar (gap 3 — DEFERRED)
**Status:** intentionally not built per user direction 2026-05-13. Future use case: CV attenuverter sliders (centre-detent at 0, ±range).

When implemented, will use:
- Face LINE indicator (like selector/bipolar knob) — distinguishes bipolar from continuous at a glance.
- Fill column from CENTRE outward (not from bottom).
- 3 detent markers: −100 / 0 / +100 (centre is the meaningful default).

---

## Acceptance criteria (variants)

A variant is LOCKED when:
- ✅ Renders correctly in `preview_engine_sliders_variants.py` under all 4 bloom themes × 3 finishes
- ✅ Inherits state + marker + animation framework from the base slider
- ✅ Documented in this section of SLIDER_RECIPE_LOCK.md
- ⏳ Mainline widget class extension built (deferred to mainline integration phase)
