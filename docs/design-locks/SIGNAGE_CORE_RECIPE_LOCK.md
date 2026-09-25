# Signage Core Recipe Lock — Section 5 of the design-language spec

_Locked 2026-05-20. One-shot pass per `docs/ONESHOT_ELEMENT_WORKFLOW.md`._

This is the canonical implementation spec for the **signage core** across all
PATCHWERK / SYB Live Cable modules. Signage core = three typographic
sub-elements that share font choice, palette and rendering pipeline but live in
three distinct geometric contexts:

- **(a) Type-strip** — the module-name banner that runs across the top of every
  faceplate (e.g. `VCO`, `ENVELOPE ADSR`, `BUTTPLUG LINEAR OUT`).
- **(b) Port labels** — the text that sits adjacent to every jack (`IN`,
  `OUT`, `CV`, `GATE`, `CLK`, `TRG`, `1`, `2`…).
- **(c) Parameter labels** — the text that sits adjacent to every knob,
  slider or switch (`CUTOFF`, `RES`, `RATE`, `AMT`, `OFFSET`…).

Mainline must lift these primitives verbatim when building `SignageRenderer`
(or the per-sub-element classes `TypeStripV3`, `PortLabelV3`, `ParamLabelV3`).

**Frozen — do NOT design in this pass:** sub-elements 18d (range labels under
sliders), 18e (decorative dividers), 18f (brand badges / logos), 18g
(silkscreen decorative art). Per `docs/RC1_DEEP_FREEZE.md` — post-RC polish.

---

## TL;DR — the lock

| Component | Recipe |
|---|---|
| **Sub-elements** | Type-strip · Port labels · Parameter labels |
| **Locked variants** | TS = `TS_SILKSCREEN_FLAT` + `TS_ENGRAVED_RECESS` + `TS_BANNER_UNDERLINE` · PL = `PL_CAPS_TIGHT` + `PL_MIXED_COMPACT` + `PL_ICON_PREFIX` · ML = `ML_CAPS_UNDER` + `ML_VALUE_REPLACES_LABEL` + `ML_CURVED_ARC` |
| **Font family** | `Inter` → `Roboto` → `Segoe UI` fallback chain (geometric sans-serif, available on Win11 by default; OFL Inter shipped in `demos/` if missing) |
| **Tier set (XS/S/M/L/XL)** | TS px 8/10/12/14/18 · PL px 7/8/9/11/13 · ML px 7/9/10/12/14 |
| **Contextual states (4)** | `idle` · `learning` (host MIDI-learning) · `modulated` (host CV-modulated) · `disabled` (host inert) · `error` (host error) |
| **Idle palette** | White-bone `#E6E8EC` α 220 on dark faceplate; engraved variant uses `#0A0A0C` α 220 + 1 px hi-light at top |
| **Accent rule** | Red `#CC0000` reserved for ERROR only — type-strip and labels are NEVER red at idle (per `project-patchwerk-accent-sparse`) |
| **Anti-aliasing** | `QPainter.TextAntialiasing` ON; `QFont.PreferAntialias` + `QFont.PreferQuality`; sub-pixel positioning ON for text drawn at the same dpi as the canvas |
| **Letter-spacing** | TS `+0.06 em` (loose banner) · PL `+0.04 em` (semi-tight) · ML `+0.02 em` (tight) |
| **Max line length** | TS 18 chars · PL 6 chars · ML 8 chars (over-long source strings get a `…` ellipsis in the renderer, never wrap) |
| **Bauhaus filter** | All-caps geometric sans by default; NO display / decorative / serif faces; no italic; no bold (weight = Regular 400 or Medium 500 only) |
| **Bloom integration** | Labels do not bloom themselves; under CINEMATIC theme + reflective finish a faint `α 25` glow is layered behind LIT host elements to compensate for surround illumination — per `project-bloom-user-settings-buckets` |
| **Sparse-red accent** | type-strip MAY render a 1 px `#CC0000` underscore segment if the module is in ERROR (covers entire module-error case); labels turn `#CC0000` only when host is in ERROR |

---

## Canonical source file (lift target)

`demos/preview_engine_signage_core_phase45.py` — defines:

- `FONTS` registry — preferred + fallback font families with `pick_font(role, tier_px)` helper
- `PALETTE` — idle / engraved / learning / modulated / disabled / error colour table
- `TIERS_TS`, `TIERS_PL`, `TIERS_ML` — tier-name → (px, letter_spacing_em, max_chars) tables
- `draw_type_strip(p, rect, text, variant, tier, state, finish, theme)`
- `draw_port_label(p, host_centre, host_radius, text, variant, tier, state, finish, theme)`
- `draw_param_label(p, host_centre, host_radius, text, variant, tier, state, finish, theme, value_text="")`

Mainline integration imports (or copy-pastes) from this file. Suggested
shared-module location at integration time:

```
syb_core/widgets/signage.py   # paint primitives + tier tables
syb_core/widgets/fonts.py     # font fallback chain + Inter OFL load
```

---

## §1 Variants

Per `docs/ONESHOT_ELEMENT_WORKFLOW.md`, every variant slot logs ≥3
candidates with named real-world references. Bauhaus symmetric-shape rule
applies to typography itself: geometric sans-serif only, even letterspacing,
no decorative ligatures, no display faces.

### (a) Type-strip — module-name banner across faceplate top

| ID | Variant | Real-world reference(s) |
|---|---|---|
| **`TS_SILKSCREEN_FLAT`** | All-caps white silkscreen ink on the faceplate body — no dedicated banner rectangle, ink sits directly on the body fill `#1E2024`. | Doepfer A-100 series silkscreen; Eurorack default convention; vintage Roland System-100M panel labelling. |
| **`TS_ENGRAVED_RECESS`** | All-caps dark text rendered as a 1 px recessed engraving — text fill `#0A0A0C` with a 1 px white α 90 hi-light along the top edge and a 1 px black α 120 shadow along the bottom edge to simulate machined character recess. | Make Noise modules (engraved aluminium); Buchla 200e front panels; high-end studio gear (SSL, Neve channel-strip labels). |
| **`TS_BANNER_UNDERLINE`** | All-caps white text on body, with a single 1 px sparse-accent underline running the full text width 3 px below the baseline. The underline is `#2A2A2A` at idle (matches separator rule from `project-patchwerk-accent-sparse`) and stays neutral — never red at idle. | Mutable Instruments Plaits / Marbles panel idiom; Marshall amp script-with-rule banner; Korg MS-50 fascia. |

**Bauhaus filter applied:** all three are geometric sans-serif, all-caps, even
letterspacing, no decorative glyphs. Drop candidates (logged §5).

### (b) Port labels — text adjacent to every jack

| ID | Variant | Real-world reference(s) |
|---|---|---|
| **`PL_CAPS_TIGHT`** | All-caps abbreviated label, tight letterspacing (`+0.04 em`), placed flush below the jack ring at a fixed 4 px gap. Canonical Eurorack convention: `IN`, `OUT`, `CV`, `GATE`, `TRG`, `CLK`. | Doepfer / Tiptop Audio / Make Noise default port labelling; ALM/Busy Circuits; Bastl Instruments. |
| **`PL_MIXED_COMPACT`** | Mixed-case sentence-style (`In`, `Out`, `Gate`, `Clock`), tighter typographic colour, placed adjacent to the jack. Reads more like an instrument fascia than a research module. | Marshall amp fascia; Korg MS-20 panel; Moog Voyager input section. |
| **`PL_ICON_PREFIX`** | All-caps text with a 4 px wide arrow glyph prefix (`▶ IN`) or suffix (`OUT ▶`) showing signal flow direction. The arrow uses the same dim white as the text. Bauhaus-acceptable because the glyph is a regular triangle primitive. | Pro-audio mixer convention (Yamaha PM, SSL XL-Desk); Eurorack splitters (`Multiple`) that mark in/out with glyphs; DAW UI patch panels. |

### (c) Parameter labels — text adjacent to every knob / slider / switch

| ID | Variant | Real-world reference(s) |
|---|---|---|
| **`ML_CAPS_UNDER`** | All-caps short word placed directly below the control at a fixed 5 px gap. Canonical Eurorack convention. | Make Noise Maths; Mutable Instruments Plaits (`HARMO`, `TIMBRE`, `MORPH`); Doepfer A-100 series. |
| **`ML_VALUE_REPLACES_LABEL`** | A live numeric readout (`23.4`, `5.7 Hz`, `+18`) renders ABOVE the control where the static name would otherwise sit, in monospace tabular figures. The control's name is then small-caps and 1 tier smaller, placed below the control. Honours `feedback-value-displays-over-labels` (2026-05-08 VCO V6 decision). | OLED display modules: ALM Pamela's NEW Workout; WMD Performance Mixer; XAOC Praga; vintage HiFi w/ digital readouts (Marantz CD-94). |
| **`ML_CURVED_ARC`** | Text rendered along the outer arc above the control, following the knob skirt. Used for SHORT labels (≤ 4 chars: `VCO`, `LFO`, `ENV`) when panel real-estate is tight and a flat label would collide with neighbour knobs. | Moog Modular vintage labels; Roland Jupiter-8 section banners; vintage analogue synth section dividers; Buchla curved label idiom. |

**Bauhaus filter applied:** all-caps sans-serif, no italics, no display faces.
Curved arc variant uses the same Inter Regular, only the baseline geometry is
curved.

---

## §2 Tier sizes (XS/S/M/L/XL)

Typography tiers are independent from element tiers (a control's "L" tier is
not the same px as its label's "L" tier). All three sub-elements use the
canonical 5-name scale (XS/S/M/L/XL) per `project-design-tier-vocabulary`.

All values are at **production canvas pixel scale**. Demo previews render at
+35 % per `feedback-larger-demo-icons` (matrix cell sizing only — production
tier numbers do NOT scale).

### Type-strip tiers

| Tier | Font px | Letter-spacing | Max chars / line | Use case |
|---|---|---|---|---|
| **XS** | 8 | +0.04 em | 18 | 1 Uw narrow utility (`add`, `mult`) — type-strip squeezed |
| **S** | 10 | +0.05 em | 16 | 2 Uw compact (`logic`, `edge`) |
| **M** | 12 | +0.06 em | 14 | 3-4 Uw mid (`env adsr`, `vcf`) — project default |
| **L** | 14 | +0.06 em | 16 | 5-6 Uw wide (`buttplug linear out`) |
| **XL** | 18 | +0.08 em | 18 | hero / 7+ Uw (`scope 4ch`, demo modules) |

### Port-label tiers

| Tier | Font px | Letter-spacing | Max chars / line | Use case |
|---|---|---|---|---|
| **XS** | 7 | +0.02 em | 4 | dense jack rows (`sr6_multiaxis_out` lower row) |
| **S** | 8 | +0.03 em | 5 | 1 Uw narrow modules |
| **M** | 9 | +0.04 em | 6 | project default for 3.5 mm jacks (M control tier) |
| **L** | 11 | +0.05 em | 6 | L jack tier (mixer outputs) |
| **XL** | 13 | +0.06 em | 8 | demo / scope / hero panels |

### Parameter-label tiers

| Tier | Font px | Letter-spacing | Max chars / line | Use case |
|---|---|---|---|---|
| **XS** | 7 | +0.01 em | 6 | trim-pot label (matches trim-pot T tier) |
| **S** | 9 | +0.02 em | 7 | small knob / mini-slider |
| **M** | 10 | +0.02 em | 8 | M knob default |
| **L** | 12 | +0.03 em | 8 | L knob / 60 mm fader |
| **XL** | 14 | +0.04 em | 10 | XL knob / 100 mm fader / hero param |

### Pairing rule (host tier → label tier)

The label tier is normally **one tier smaller** than the host control tier
(L knob → M label; M knob → S label) so the host stays visually dominant.
Exceptions: type-strip stays at panel-level tier independent of any host.

---

## §3 State vocabulary (contextual states only)

Labels never have hover or active states of their own — they are passive
indicators. State changes come from the **host** (the jack, knob, switch,
or for type-strip the entire module). Five contextual states are formalised:

| State | Trigger (host) | Label fill | Underline accent (TS only) | Animation |
|---|---|---|---|---|
| **idle** | normal | `#E6E8EC` α 220 | `#2A2A2A` (TS_BANNER) | static |
| **learning** | host MIDI-learning | `#E0A24E` α 240 (deep amber from PALETTES[5]) | same colour α 200 | 0.6 Hz slow breath (alpha) |
| **modulated** | host CV-modulated | `#FFC652` α 220 (amber glow tint) | same colour α 180 | 0.4 Hz breath |
| **disabled** | host `setEnabled(False)` or patch-load lock | `#E6E8EC` α 90 (matches host opacity 0.32) | `#2A2A2A` α 90 | static |
| **error** | host runtime error | `#CC0000` α 220 (sparse-red accent — ONLY state that uses red) | `#CC0000` α 200 | 1.5 Hz pulse |

**Hard rule:** labels never participate in HOVER or ACTIVE states. Pointer
events stay on the host control. The only label-level animation is the slow
breath/pulse driven by `learning` / `modulated` / `error` host states.

**Type-strip vs label scope:**
- A module-wide ERROR turns the type-strip red but leaves individual port /
  param labels at idle unless the host control reports its own error.
- A single-control MIDI-learn turns that control's label `learning` but does
  NOT touch the type-strip.

This matches the LED state vocabulary's two-layer model from
`docs/LED_RECIPE_LOCK.md` (basic states vs semantic overlays) — labels
inherit a five-state subset of the canonical state vocabulary
(`project-state-vocabulary`).

---

## §4 Recipe — paint layers per sub-element

### Anti-aliasing rule (shared by all three sub-elements)

```python
p.setRenderHint(QPainter.TextAntialiasing, True)
p.setRenderHint(QPainter.Antialiasing, True)
font = QFont(_pick_font_family(), tier_px)
font.setWeight(QFont.Weight.Medium)               # 500 — slightly heavier than Regular for small px legibility
font.setStyleStrategy(
    QFont.StyleStrategy.PreferAntialias | QFont.StyleStrategy.PreferQuality
)
font.setLetterSpacing(QFont.SpacingType.PercentageSpacing, 100 + spacing_em * 100)
p.setFont(font)
```

Sub-pixel positioning ON (default for Qt6); never set
`QFont.NoSubpixelAntialias`.

### Font family chain (Bauhaus filter — geometric sans-serif only)

```python
def _pick_font_family() -> str:
    # Preferred (geometric, modern): Inter — bundled as Inter-Regular.ttf and
    # Inter-Medium.ttf in demos/ if user does not have it installed.
    # Fallback chain catches every Windows-11 default install.
    for fam in ("Inter", "Roboto", "Segoe UI Variable", "Segoe UI", "Arial"):
        if QFontDatabase.families().__contains__(fam):
            return fam
    return ""   # Qt default sans
```

Decorative / display / serif faces are explicitly excluded by this chain.
If `Inter` is not installed and not bundled, the chain degrades gracefully
to `Segoe UI` — visually close enough for the design language (geometric,
neutral, hinted at small sizes).

### Type-strip paint layers

```
1. Banner background (TS_SILKSCREEN_FLAT only): none — text on raw body fill
   Banner background (TS_BANNER_UNDERLINE):     none — text on raw body fill
   Banner background (TS_ENGRAVED_RECESS):      none — text on raw body fill (engraving = layered shadows below)

2. Engraving shadow layer (TS_ENGRAVED_RECESS only):
   - Bottom shadow:  drawText offset (+0, +1) in #000000 α 120
   - Top hi-light:   drawText offset (+0, -1) in #FFFFFF α 90
   (paint BEFORE the main fill)

3. Main fill:
   - SILKSCREEN_FLAT:    color = state.fill  (idle = #E6E8EC α 220)
   - ENGRAVED_RECESS:    color = #0A0A0C α 220  (dark, since the recess reads inverse)
   - BANNER_UNDERLINE:   color = state.fill  (idle = #E6E8EC α 220)
   drawText at baseline

4. Underline (TS_BANNER_UNDERLINE only):
   QPen 1 px, color = state.underline (idle = #2A2A2A — sparse accent)
   line from (text_x_start, baseline + 3) to (text_x_start + text_width, baseline + 3)
   When state == error: pen color = #CC0000 α 200
   When state == learning: pen color = #E0A24E α 200

5. State pulse layer (learning / modulated / error only):
   - Recompute text fill alpha = base_alpha × pulse_mod(t)
   - pulse_mod(t) for learning  = 0.7 + 0.3 * sin(2π × 0.6 × t)
   - pulse_mod(t) for modulated = 0.75 + 0.25 * sin(2π × 0.4 × t)
   - pulse_mod(t) for error     = 0.65 + 0.35 * sin(2π × 1.5 × t)
   - Redraw text on top of existing fill with composited alpha
   (animation is OFF when the demo's animation toggle is OFF — static at peak)
```

### Port-label paint layers

**Locked anchor rule (amended 2026-05-20 per user lock-time directive):** Port labels
**ALWAYS anchor BELOW the jack ring**. No "side=right" fallback. No "above" fallback.
No overlap with the jack ring under any tier / theme / state combination.

> **API note (bug 2026-05-20-1, fixed same day):** `draw_port_label` requires
> `host_radius` as a parameter — the prior signature took only the host centre
> and estimated clearance with `max(8, tier_px*0.9)`, which let labels overlap
> larger jack mocks. The `side=` parameter has been removed entirely; the
> function is BELOW-only. Caller MUST pass the actual drawn jack radius (no
> estimation). Same applies to `draw_param_label` — it must use the per-tier
> `PARAM_LABEL_GAP_{ABOVE,BELOW}_BY_TIER` tables, not heuristic clearance.

```
1. Anchor + clearance (BELOW-only, hard min-gap):
   - Compute anchor = jack_ring_outer_bottom + GAP_PX (= 4 px production / 5 px on L+XL tiers).
   - Label rect = (anchor_x − text_w/2, anchor, text_w, font_metrics.height()).
   - INVARIANT: label_rect.top - jack_ring_outer_bottom >= GAP_PX always.
   - If layout space below is constrained (next row begins before label fits): the LAYOUT must
     reserve the label's vertical strip; the label NEVER overlaps the jack ring. Mainline
     layout code is responsible for budgeting; the widget never auto-shifts above or sideways.
   - GAP_PX by port-label tier: XS=3, S=3, M=4, L=4, XL=5.

2. Icon prefix (PL_ICON_PREFIX only):
   - Triangle glyph 4 px wide × 4 px tall, painted in state.fill α (state.alpha × 0.8)
   - Position: 2 px to the left of text origin (PREFIX) or 2 px to right of text end (SUFFIX)

3. Main fill:
   - drawText at anchor in state.fill
   - PL_CAPS_TIGHT / PL_ICON_PREFIX:  text uppercased
   - PL_MIXED_COMPACT:                 text in source case (Title Case for In / Out / Gate)

4. State pulse (learning / modulated / error): same formula as type-strip layer 5
```

### Parameter-label paint layers

**Locked min-gap rule (amended 2026-05-20 per user lock-time directive):** Parameter
labels and value readouts **must never touch the host control**. Hard minimum gap
between host control outer bbox and label/readout outer bbox is GAP_PX (table below).
This applies to ALL three variants regardless of layout pressure — the layout must
budget for the gap, never collapse it.

| Param-label tier | GAP_PX above (value readout / curved arc) | GAP_PX below (label) |
|---|---|---|
| XS | 4 | 4 |
| S | 5 | 5 |
| M | 5 | 5 |
| L | 6 | 6 |
| XL | 7 | 7 |

```
1. Position selection:
   - ML_CAPS_UNDER:           anchor below control at GAP_PX_below, h-centered to control
   - ML_VALUE_REPLACES_LABEL: NUMERIC readout above at GAP_PX_above (tabular nums in Inter
     Regular monospace features), label is one tier smaller below at GAP_PX_below
   - ML_CURVED_ARC:           render along the arc at radius = host_r + GAP_PX_above + 2 px,
     sweeping from -150° to -30° (i.e. the top 120° of the host circle).

2. Curved-arc text path (ML_CURVED_ARC only):
   - QPainterPath.arcMoveTo + arcTo to build the baseline
   - For each character: compute the angle that places the char's center at the running
     arc length; rotate the painter to that tangent; drawText; restore.
   - Letter-spacing applied as additional arc length between characters.

3. Main fill: drawText in state.fill (same colour table as Type-strip / Port-label)

4. State pulse: same formula as Type-strip layer 5
```

### Bloom integration (CINEMATIC theme + reflective finish only)

Labels do not bloom by default. Under CINEMATIC theme + reflective finish, a
faint `α 25` glow is layered behind the host control's nearest label (sourced
from the host's `_led_bloom` / `_additive_halo_*` envelope) to compensate for
the surround illumination "wash" — keeps labels from looking unnaturally
hard-edged on a glassy panel. The label itself never glows; only the
surround under the label tints toward the host's bloom colour.

Under SUBTLE / STANDARD themes OR matte / semi finishes, this layer is OFF.

---

## §5 Variant rationale — long-list considered + drops

### Type-strip — considered

| Candidate | Status | Reason |
|---|---|---|
| `TS_SILKSCREEN_FLAT` | LOCKED | Eurorack default; cheapest production; reads at any tier |
| `TS_ENGRAVED_RECESS` | LOCKED | High-end studio gear idiom; gives modules a tactile premium feel |
| `TS_BANNER_UNDERLINE` | LOCKED | Mutable Instruments / Marshall idiom; allows sparse accent without clutter |
| Bordered banner box (filled rectangle behind text) | DROPPED | Adds visual noise; conflicts with module body texture; cluttered when many modules share screen |
| Italic / display face | DROPPED | Bauhaus filter — no decorative faces |
| LED-segment style (faux 7-seg digits for module names) | DROPPED | Segmented displays are a different element; module names belong on a typographic strip |
| Reverse-knockout (dark text on a light strip) | DROPPED | High contrast clashes with the dark canvas palette; eats panel real-estate |
| Tilted / rotated banner | DROPPED | Asymmetric — violates `project-bauhaus-symmetric-shape-rule` |

### Port labels — considered

| Candidate | Status | Reason |
|---|---|---|
| `PL_CAPS_TIGHT` | LOCKED | Default Eurorack convention; widest real-world precedent |
| `PL_MIXED_COMPACT` | LOCKED | Pro-audio idiom; better for long words (`Clock`, `Gate`) |
| `PL_ICON_PREFIX` | LOCKED | Signal-flow legibility for new users; honoured by mixer convention |
| Coloured chip behind label (red for OUT, blue for IN) | DROPPED | Coloured chips clash with sparse-accent rule; signal-type colour already lives on the cable, not the label |
| Numeric-only labels (`1`, `2`, `3`) | KEPT as a renderer mode (`text="1"`), no separate variant |
| Vertical text along jack column | DROPPED | Asymmetric / hard to read at small sizes; violates Bauhaus rule |
| Outline / stroked text | DROPPED | Stroked small text becomes mush at production tiers — anti-aliasing not enough |

### Parameter labels — considered

| Candidate | Status | Reason |
|---|---|---|
| `ML_CAPS_UNDER` | LOCKED | Eurorack default; cleanest spatial relationship to host |
| `ML_VALUE_REPLACES_LABEL` | LOCKED | Honours 2026-05-08 decision; required for live-readout modules |
| `ML_CURVED_ARC` | LOCKED | Saves panel real-estate for short labels in tight modules |
| Above-control instead of below | DROPPED as default; available as renderer flag (`side="above"`) for collisions |
| Label inside the knob skirt | DROPPED | Conflicts with indicator dot / knurl ring; not legible at S tier |
| Label on the rotation indicator itself | DROPPED | Visual chaos at non-zero rotations |
| Two-line labels (`CUTOFF` / `HZ`) | DROPPED | Use ML_VALUE_REPLACES_LABEL instead; cleaner |
| Vertical / rotated labels | DROPPED | Asymmetric — Bauhaus filter |

### Cross-cutting drops

- **Embossed coloured ink** (orange / amber labels) — fights with the
  sparse-accent rule (red reserved for error; amber reserved for active /
  modulated host states). Labels stay neutral.
- **Multiple weights** (Bold for type-strip, Regular for labels) — kept to
  Regular 400 / Medium 500 only per Bauhaus filter; no Bold display weights.
- **Custom display fonts** — Bauhaus filter. Inter / Roboto / Segoe UI only.

---

## §6 Integration plan — what mainline must do

### Target widget classes

Three new mainline widget primitives, sharing one renderer module:

```
syb_core/widgets/signage.py
    class TypeStripV3(QWidget)
    class PortLabelV3(QWidget)
    class ParamLabelV3(QWidget)
    # shared functions:
    def draw_type_strip(painter, rect, text, variant, tier, state, finish, theme)
    def draw_port_label(painter, host_centre, host_radius, text, variant, tier, state, finish, theme)
    def draw_param_label(painter, host_centre, host_radius, text, variant, tier, state, finish, theme, value_text="")

syb_core/widgets/fonts.py
    def load_inter_if_bundled() -> None
    def pick_font_family() -> str
    def make_font(tier_px: int, spacing_em: float, weight=Medium) -> QFont
```

Existing mainline `ModuleNode` already draws module names — the refactor
swaps the inline `painter.drawText(...)` calls for `draw_type_strip(...)`.
For port and param labels, the existing `_PORT_LABEL_STYLE` and per-knob
text in `_paint_controls` get replaced by `draw_port_label` /
`draw_param_label`.

### Primitives needed (don't exist yet in canonical sources)

1. **`pick_font_family()`** — fallback chain helper.
2. **`load_inter_if_bundled()`** — if `demos/Inter-Regular.ttf` exists at
   runtime, register it via `QFontDatabase.addApplicationFont`. (Optional —
   demo runs without it and falls back to `Segoe UI`.)
3. **Curved-arc text helper** — `draw_text_along_arc(p, cx, cy, r, sweep_deg,
   text, font, color)` for the `ML_CURVED_ARC` variant.
4. **Engraving primitive** — `draw_engraved_text(p, rect, text, font,
   fill_color)` for the `TS_ENGRAVED_RECESS` variant (paints shadow + hi-light
   + fill).

### Pipeline differences (signage vs other elements)

- **Text-AA flag is mandatory** — call `setRenderHint(TextAntialiasing, True)`
  before every drawText. Other elements (knobs, sliders, LEDs) use only
  `Antialiasing`. Signage needs BOTH.
- **Letter-spacing is via `QFont.setLetterSpacing(PercentageSpacing, …)`** —
  not via per-glyph advances. This keeps Qt's text-layout engine in charge
  of hinting + kerning.
- **No `setPen(QPen(...))` for text fills** — text colour comes from
  `setPen(QColor)` directly. Using a styled QPen breaks subpixel positioning.
- **drawText vs drawStaticText** — use `drawText` for live state-pulsed
  labels (alpha changes per frame) and `QStaticText` for the type-strip
  baseline geometry (it doesn't change once the module is placed). The
  state pulse layer redraws over the QStaticText cache.

### Refactor steps

1. Create `syb_core/widgets/signage.py` and `syb_core/widgets/fonts.py`
   modules, copying the canonical functions from
   `demos/preview_engine_signage_core_phase45.py`.
2. Replace inline `painter.drawText(...)` calls in `ModuleNode._paint_*` with
   the appropriate `draw_type_strip / draw_port_label / draw_param_label`
   calls.
3. Add three new instance attrs to `ModuleNode`:
   - `self._signage_variants: dict[str, str]` — `{"type_strip": "TS_SILKSCREEN_FLAT", "port_labels": "PL_CAPS_TIGHT", "param_labels": "ML_CAPS_UNDER"}` (defaults per module — modules may override per memory `feedback-value-displays-over-labels` to set `param_labels = ML_VALUE_REPLACES_LABEL`).
   - `self._signage_tiers: dict[str, str]` — `{"type_strip": "M", "port_labels": "M", "param_labels": "M"}`
   - `self._signage_state_overrides: dict[str, str]` — `{"VCO_pitch_label": "modulated", ...}` overrides per-label when host is modulated.
4. Wire host state → label state in `ModuleNode.paintEvent`:
   - `if host_port.midi_learning:` set port label state = `learning`
   - `if host_param.modulated:` set param label state = `modulated`
   - `if module.has_error:` set type-strip state = `error`
   - `if not module.enabled:` set all label states = `disabled`
5. `py_compile` clean. Build a mainline revision. Verify against
   `demos/preview_engine_signage_core_phase45.py`.

### Mainline revision integration test

1. Build new revision `syb_modular_ui_prototype_<next>.py` with `SignageRenderer` lifted.
2. Apply to **3 representative modules**:
   - `vco` (4 params + 4 ports) — exercises `ML_CAPS_UNDER` default
   - `envelope_adsr` (4 sliders + 5 ports) — exercises `ML_VALUE_REPLACES_LABEL` for AHDR values
   - `buttplug_linear_out` (3 params + 2 ports) — exercises long `TS` label `BUTTPLUG LINEAR OUT`
3. Launch, visually compare each module's labels against the corresponding
   matrix cell in `preview_engine_signage_core_phase45.py`. Diff acceptable:
   minor pixel anti-aliasing differences from QWidget vs QPainter cache.
   NOT acceptable: missing variants, wrong tier sizes, wrong colours.
4. Test interaction states:
   - Right-click a param to start MIDI-learn → param label pulses amber at 0.6 Hz.
   - Patch in CV to a param → param label breathes at 0.4 Hz.
   - Force a module error (debug shortcut) → type-strip turns red and pulses at 1.5 Hz.
   - Toggle a module disabled → all labels drop to α 90.
5. If pass → signage section is LOCKED. Update memory
   `feedback-integration-plan-documented-tested` status board.

---

## §7 Acceptance criteria

Signage core is **preview-LOCKED** when:

- ✅ Phase 4.5 matrix demo (`demos/preview_engine_signage_core_phase45.py`)
  renders ALL variants × ALL tiers × ALL contextual states × ALL finishes
  × ALL themes with no skipped slots.
- ✅ Every variant cell shows the label IN CONTEXT — alongside a
  representative host silhouette (jack ring for port labels, knob disk for
  param labels, faceplate band for type-strip). Typography legibility in
  isolation is misleading; the matrix proves the relationship survives.
- ✅ Reflective finish + CINEMATIC theme produces no kerning surprises across
  all 4 themes — text remains crisp; no halo wash that obliterates the
  characters.
- ✅ Type-strip reads at intended viewing distance — verified by sizing the
  matrix cells at +35 % and checking the M-tier type-strip label is
  legible from arm's length on a 27" 1440p monitor.
- ✅ Port labels never overlap the jack ring — verified by the renderer's
  hit-clear nudge in §4 layer 1.
- ✅ Bauhaus filter holds — every locked variant uses geometric sans-serif;
  no display / decorative / italic / serif faces; no asymmetric layouts.
- ✅ Variant Reality Check (`feedback-variant-reality-check`) — every variant
  cites ≥1 real-world reference; all references are real production hardware.

Signage core is **INTEGRATION-LOCKED** only when:

- ⏳ `syb_core/widgets/signage.py` + `syb_core/widgets/fonts.py` exist and
  contain the lifted primitives.
- ⏳ Mainline revision built, launched, visually verified against the matrix
  on the three representative modules.

Currently the integration step is pending — this recipe-lock + Phase 4.5
matrix unblock mainline to start the integration revision.

---

## What's NEW vs what's CANONICAL

| Item | Source |
|---|---|
| 5 tiers per sub-element (XS/S/M/L/XL) | NEW — this lock |
| 9 locked typographic variants | NEW — this lock (3 × 3) |
| Contextual-state vocabulary (idle/learning/modulated/disabled/error) | NEW — this lock |
| Font fallback chain Inter → Roboto → Segoe UI | NEW — this lock |
| Engraved-recess paint formula | NEW — this lock |
| Banner-with-underline sparse-accent rule | NEW — this lock |
| Curved-arc text helper | NEW — this lock |
| State pulse alpha formula (0.6 / 0.4 / 1.5 Hz) | CANONICAL — borrowed from `LED_RECIPE_LOCK.md` animation rates |
| Sparse-red accent rule | CANONICAL (`project-patchwerk-accent-sparse`, 2026-05-08) |
| Hybrid palette body / canvas colours | CANONICAL (`project-patchwerk-hybrid-palette`) |
| Value-replaces-label idiom | CANONICAL (`feedback-value-displays-over-labels`, 2026-05-08) |
| BloomTheme reflectivity multipliers | CANONICAL (`demos/bloom_theme.py`) |

---

## FROZEN sub-elements (post-RC polish, do NOT design now)

- **18d** — Range labels under sliders (e.g. `−5` / `0` / `+5`)
- **18e** — Decorative dividers / hairlines between control sections
- **18f** — Brand badges / `PATCHWERK` wordmark / patchwerk logo placement
- **18g** — Silkscreen decorative art (geometric lines, section banners)

Per `docs/RC1_DEEP_FREEZE.md` scope catalog #18d–18g. Resume post-RC-1.
