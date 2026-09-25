# HH:MM:SS Time Display — Recipe Lock (IN PROGRESS)

_Element design round per `docs/HHMMSS_DISPLAY_DESIGN_BRIEF.md` + the design-language
master discipline. Time-readout cousin of the GREEN_PHOSPHOR_7SEG segmented display
(`docs/SEGMENTED_DISPLAY_RECIPE_LOCK.md`). **STATUS: picks accumulating — not yet locked.**_

End-state (after lock): a pure-Qt shared primitive
`syb_core/design/displays.py:render_time_display(p, x, y, w, h, text, *,
editable=False, cursor=None, reflectivity=0.0, bloom=None)` — `bloom=None` +
`reflectivity=0` reproduces the locked look. Mainline extracts it after lock (same
split as `render_seven_seg` / `render_scope_bezel`); the app's `_make_scene_time_edit`
+ master clock delegate to it; the Studio's `add_time_field` dispatches to it.

**Real consumers:** `scene_changer_8ch` — 1 master-clock **readout** + 8 per-channel
**editable** `HH:MM:SS` fields (`ch_X_time_s`). The editable fields are typed into
(USER-stressed 2026-05-25), so this element ships a **readout** variant AND an
**editable** variant; the editable variant carries an edit affordance (cursor /
selected-digit highlight / focus ring). The paint primitive is paint-only — actual
keystroke handling stays a host `QLineEdit`; the recipe defines the focused/edit LOOK.

---

## Decision log (append-only — every user pick recorded immediately)

### R1 — wide picker (two families explored)
Demo: `demos/hhmmss_display_picker.py` (8 cool "display" variants TD1–TD8) +
`demos/nixie_tube_picker.py` (8 warm neon variants NX1–NX8). Live running clock,
finish + bloom toggles, real-world reference per variant.

**2026-05-25 — USER PICKS:**
- **Segmented / "display" family → `TD1` CLASSIC AMBER 7-SEG (upright).** The direct
  amber cousin of the locked GREEN_PHOSPHOR_7SEG: Bauhaus-clean rectangular upright
  segments, per-segment RECTANGLE bloom, dim amber off-segment ghost, recessed dark
  LCD field, amber `#FFC652`. Refs: amber LED alarm/VCR clock · Kingbright SA15
  amber 7-seg · Roland sequencer time digits. _(This is the segmented-family choice;
  it is the conventional / fallback look that matches the rest of the panel.)_
- **Nixie family → narrowed to `NX1` (IN-14 classic round) vs `NX5` (wire-mesh
  forward) → go to R2.** User is split between the two and likes the nixie as a warm
  neon contrast to the cool segmented displays.

**2026-05-25 — USER feedback feeding R2 (nixie):**
1. **Glow blows out** in the picker → reserve heavy glow for the state demo; pickers
   open glow-OFF (segmented) / glow capped (nixie).
2. **Bug:** some numerals are clipped at the lower end by the glass bulb → fix glyph
   fit + vertical centering (font-metrics based) so each digit sits fully inside the
   envelope.
3. **Depth offset:** a nixie should show each numeral at a slight DEPTH offset (the 10
   cathodes are physically stacked at different depths) → add a per-digit depth model
   (offset + scale + glow-softening) so the lit digit sits at its own depth and shifts
   as the clock ticks. R2 includes a variant that exaggerates it for judging amount.

### R2 — nixie focus (NX1 ↔ NX5)
Demo: `demos/nixie_tube_r2.py` — refinements between IN-14 classic round and wire-mesh
forward, mesh treatment as the main axis, with the bulb-clip fix + per-digit depth
offset baked into all.

**2026-05-25 — USER DECISION (carried out of R2):**
- **STRONG per-digit depth = LOCKED must-have feature for ALL future nixie previews.**
  The depth model (`DIGIT_DEPTH` 0..1 per digit → offset + scale + glow-softening,
  default amount `STRONG_DEPTH = 1.8`) is baked into every nixie variant from here on
  (scale / state / engine / lock). It is a defining nixie behaviour (physical cathode
  stacking), NOT an optional toggle. _(Caveat: the flat amber 7-seg TD1 has no physical
  depth — depth applies to nixie variants only, per the real-world-fidelity rule.)_
- **"Redo R1"** — re-ran the full 8-idiom nixie wide picker WITH strong depth + the
  bulb-clip fix baked in, to re-judge the whole family now that depth is present (it
  was absent in the first R1). Demo: `demos/nixie_tube_picker.py` (REDO).

### R1-REDO pick + R2-NX1 refine
Demo: `demos/nixie_nx1_refine.py`.
- **2026-05-25 — `NX1` (IN-14 CLASSIC ROUND) = the nixie winner** ("clear winner").
- **2026-05-25 — NX1 refined → `NX1·d` FINER GRILLE + WARM GLOW.** Locked nixie look:
  IN-14 round glass envelope · **Georgia serif numerals** (user kept the serif over the
  Bahnschrift/Franklin sans alternatives) · **11-wire vertical anode grille** + 2 horizontal
  grid wires · **warmer/stronger glow** (`glow_mul ≈ 1.2`, still capped α150) · **getter
  flash** · moderate cathode-ghost stack · **STRONG per-digit depth (1.8)** · neon palette
  core `(255,178,96)` / lit `(255,132,40)` / deep `(214,88,20)` / glow `(255,120,36)` /
  ghost `(80,42,18)` · colon = two neon dot-bulbs at ±0.16·dh.

### SCALE — tiers S / M / L
Demo: `demos/nixie_nx1_scale.py`.
- **2026-05-25 — APPROVED: S 40 px (per-channel editable) · M 58 px (default) · L 86 px
  (master clock)**, all legible at actual size. Scaling rules: digit cap = 0.66 × cell
  height (const); anode grille = **physical wire pitch ~6.8 px** → wire count ∝ tube width;
  glow / colon / getter / depth all ∝ digit height.

### STATES
Demo: `demos/nixie_nx1_states.py`.
- **idle** — powered, holding a value, not advancing; dimmer (×0.82), static.
- **running** — live; the **colon neon lamps blink 1 Hz synced to the seconds tick** (lit
  the first half-second, dark the second). Digits steady.
- **EDIT** (editable variant) — **amber `#FFC652` focus ring on the bezel** (panel-level
  focus cue, matches the app's `QLineEdit:focus`) + a **glowing neon-orange caret INSIDE the
  active tube** (a lit cathode bar behind the grille, blinking 1.5 Hz at the cursor digit;
  driven by the primitive's `cursor=` arg). No amber inside the glass (nixie emits only
  orange neon). _Authentic set-time idiom._
- **disabled** — **UNPOWERED: dark glass, NO numerals, no glow, dark colon** + grille +
  dimmed getter only (a real nixie shows nothing with no power) — user-corrected.
- **modulated** — amber brightness breathes 0.4 Hz (optional; param under CV/automation).
- **error** — red `#CC0000` flash 1.5 Hz overlay (project ERROR accent), base state between.

### COLON separator
Demo: `demos/nixie_nx1_colon.py`.
- **2026-05-25 — `CO1` NEON GLOW LAMP (NE-2 / INS-1)** — the colon dots are cold-cathode
  **neon glow lamps** (same gas discharge as the tubes → identical orange), NOT LEDs and NOT
  incandescent. Soft clinging glow + faint electrode + gentle mains flicker. **Blinks 1 Hz on
  the seconds tick when running; steady-lit when idle/editing.** Two lamps stacked at ±0.16·dh.

### FINISH × BLOOM
Demo: `demos/nixie_nx1_finish_bloom.py` (3×4 sweep, state-selectable).
- **2026-05-25 — CANONICAL = MATTE (`reflectivity 0.0`) + SUBTLE bloom.** Matte fits the
  Hybrid Palette and keeps glare off the digits; SUBTLE reads as a glowing tube without
  washing the dense 6-digit field. `bloom=None` + `reflectivity=0` reproduces matte+SUBTLE.
  The app scales via the global bloom theme (STANDARD/CINEMATIC available; OFF = numerals
  lit, no halo, for perf/accessibility). Finish drives field gloss + glass top-sheen +
  diagonal specular streak; reflective adds a strong gleam (can sit over digits → not default).

### ENGINE PREVIEW — ✅ APPROVED 2026-05-25
Demo: `demos/preview_engine_hhmmss_display.py` — NX1·d on a representative `scene_changer_8ch`
faceplate (Hybrid Palette body + bevel + drop shadow + fasteners + header): master clock
(L, running, colon blink) + 8 editable S-tier fields (2col×4row), CH3 mid-EDIT. Reuses the
locked `render_cell` (single source). **User: "looking good, keep going" → element survives
real faceplate context → RECIPE LOCKED.**

---

## ✅ LOCKED RECIPE (2026-05-25)

**Canonical element = the nixie `NX1·d` IN-14 tube time display.** (The amber segmented
`TD1` 7-seg from R1 is recorded as a possible alternate `variant=` but is NOT the default;
nixie is the chosen look for scene_changer.)

### Geometry / field
- Recessed dark-LCD bezel: drop shadow `rgba(0,0,0,90)` offset +2y → bezel body `#1A1A1E`,
  3 px rim `#3A3C40`, 1 px top hi-light → back panel vertical gradient `(10,8,8)→(4,3,3)`.
  Finish gloss over the top 32 % scales with `reflectivity` (0 at matte).
- Char layout for `HH:MM:SS` (8 chars): digit aspect `dw ≈ 0.60 × dh`; colon cell width
  `0.40 × dw`; inter-cell gap `0.24 × dw`; inner pad `0.12 × field-h`; cells centred.
  The same layout handles `MM:SS` / `H:MM:SS` (cells derived from the text).

### Palette (neon-orange ~605 nm)
- core `(255,178,96)` · lit `(255,132,40)` · deep `(214,88,20)` · glow `(255,120,36)` ·
  cathode-ghost `(80,42,18)` · neon-cling-pink `(255,110,64)`.
- glass `(14,12,11)` · glass-rim `(54,48,44)` · getter `(198,200,208)` · anode-mesh `(44,33,24)`.
- disabled grey: numeral `(96,96,104)` / core `(150,150,158)`. Focus ring `#FFC652`. Error `#CC0000`.

### Glyph technology — neon numeral + tube
- Font **Georgia (serif)**, pixel size = `cap / 0.70`, where `cap = dh × 0.66 × depth_scale`;
  positioned by `QFontMetricsF.tightBoundingRect` (centre the tight glyph in the cell — fixes
  the lower-end bulb clip). Draw deep→lit→core (3 passes) for the neon body.
- **Per-digit DEPTH (must-have, STRONG).** `DIGIT_DEPTH = {1:0.0, 2:.18, 3:.30, 4:.42, 5:.52,
  6:.62, 7:.72, 8:.84, 9:.94, 0:1.0}`; amount `STRONG = 1.8`. With `z = base × amt`:
  `dx = (base−0.5)·dh·0.05·amt`, `dy = −dh·0.045·z`, `scale = 1 − 0.06·z`,
  `glow_soft = 1 + 0.30·z` (deeper digit → smaller, higher, softer/bigger halo). The dim
  cathode-ghost stack (all 10 digits) renders behind, each at its own depth.
- **Anode grille** in front: vertical wires at a **physical pitch ~6.8 px** → wire count =
  `round(cell_w / 6.8)` (small tube fewer wires) + 2 horizontal grid wires at 0.28/0.72·dh,
  colour `(44,33,24)`, 1 px cosmetic. **Getter flash**: silver ellipse top-right, `r = dh·0.09`.
- **Glow**: additive (`CompositionMode_Plus`) radial halo, `peak = min(cap, active_peak × 1.2)`,
  `radius = dh·0.55·glow_soft·(active_radius_mult/1.4)`. Canonical bloom = SUBTLE.

### Colon — `CO1` NE-2 neon glow lamp
Two lamps at `±0.16·dh`, `r = dh·0.075`: soft clinging radial (offset −0.18/−0.10·r),
faint dark electrode wire, gentle mains flicker. **Blink 1 Hz on the seconds tick when
running** (`lit = (t % 1.0) < 0.5`); **steady-lit idle/editing**; **dark when disabled**.

### Scale tiers
S = **40 px** (per-channel editable field) · M = **58 px** (default) · L = **86 px** (master
clock). Field width ≈ `4.1 × height` for HH:MM:SS. All ratios above are height-relative, so
features scale with the tier (mesh stays physical-pitch).

### States
- **idle** — static, brightness ×0.82.
- **running** — digits steady; colon blink 1 Hz (above).
- **edit** (editable variant) — **amber `#FFC652` focus ring on the bezel** (pulses 0.8 Hz,
  matches app `QLineEdit:focus`) + **in-bulb neon-orange caret** (a lit cathode bar behind the
  grille at the cursor digit, blink 1.5 Hz). No amber inside the glass.
- **disabled** — **UNPOWERED**: dark glass + grille + dimmed getter only; **no numerals, no
  glow, dark colon**.
- **modulated** — brightness breathes 0.4 Hz (×0.7–1.0); optional (param under CV/automation).
- **error** — red `#CC0000` flash 1.5 Hz overlay, base state between.

### Finish / bloom
matte `0.0` (canonical) / semi `0.5` / reflective `1.0`; bloom OFF / **SUBTLE (canonical)** /
STANDARD / CINEMATIC via `bloom_theme.py`.

---

## Target primitive (mainline extracts after lock)

```python
# syb_core/design/displays.py  — sibling of render_seven_seg / render_scope_bezel
def render_time_display(p, x, y, w, h, text, *, editable=False, cursor=None,
                        reflectivity=0.0, bloom=None): ...
```
- `bloom=None` + `reflectivity=0.0` ⇒ the locked **matte + SUBTLE** look (canonical).
- `editable=True` + `cursor=<digit index in `text`>` ⇒ focus ring + in-bulb caret at that digit.
- `reflectivity` (0/0.5/1.0) and `bloom` (theme-derived) drive the Studio finish/bloom toggles.
- **Recommended additions for the animated states** (mainline's call when extracting): a
  `state` arg (idle/running/disabled/modulated/error) + a time `t` (for colon blink / caret
  blink / breathe / error flash) — the colon-blink + caret-blink + breathe + flash all need an
  animation phase the app already has each tick. Pure painter, no `main_app` import; the app
  passes theme-derived `reflectivity`/`bloom` like `render_seven_seg`/`render_scope_bezel`.

Reference implementation of the full look + states = `demos/nixie_nx1_finish_bloom.py:render_cell`
(+ helpers). The optional amber segmented `TD1` alternate = `demos/hhmmss_display_picker.py:v_td1`.

---

## Deliverables (all in `demos/` + `docs/`)
- Pickers: `hhmmss_display_picker.py` (TD1–TD8 segmented) · `nixie_tube_picker.py` (NX1–NX8) ·
  `nixie_tube_r2.py` (NX1↔NX5) · `nixie_nx1_refine.py` (NX1·a–f) — R1/R2 record.
- Scale: `nixie_nx1_scale.py`. States: `nixie_nx1_states.py`. Colon: `nixie_nx1_colon.py`.
  Finish/bloom: `nixie_nx1_finish_bloom.py`. Engine: `preview_engine_hhmmss_display.py`.
- This recipe lock + `docs/HHMMSS_DISPLAY_PICKS.md`.
