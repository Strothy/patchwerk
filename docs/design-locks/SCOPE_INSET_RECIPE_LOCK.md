# Scope / Waveform Inset Recipe Lock — Section 6 of the design-language spec

_Locked 2026-05-20. One-shot pass per `docs/ONESHOT_ELEMENT_WORKFLOW.md`._

This is the canonical implementation spec for the **scope / waveform inset**
element across all PATCHWERK / SYB Live Cable modules. Scope inset = the
**embedded rectangular display area on faceplates that renders a live signal**
(oscilloscope trace, spectrum bar, LFO waveform, envelope curve, etc.).

> **Production scope of THIS lock = the VISUAL CONTAINER + bezel + render-area
> conventions, NOT the trace-rendering pipeline itself.** "How the scope window
> looks" (frame, glass, bezel, glow, background grid) is in scope; "how the
> trace is drawn" (sample buffer → polyline, decimation, triggering) stays in
> mainline. The frame exposes a paint surface; mainline plugs the trace renderer
> into it.
>
> A representative animated sine trace is drawn in every Phase 4.5 matrix cell
> so the user can judge how the FRAME interacts with TRACE BLOOM under each
> theme/finish/variant — but the locked deliverable here is the frame, not the
> renderer.

Mainline must lift these primitives verbatim when building `ScopeInsetV3` (or
the per-variant subclasses `ScopeInsetFlatLCD`, `ScopeInsetDeepCRT`,
`ScopeInsetVintageAmber`).

**Frozen — do NOT design in this pass:** sample-buffer decimation, triggering,
multi-channel overlay strategy, spectrum-mode fill, persistence (phosphor
afterglow) shader, anti-aliased polyline cap-style. All of those live in the
mainline trace-rendering lane.

---

## TL;DR — the lock

| Component | Recipe |
|---|---|
| **Variants (3)** | `FLAT_BEZEL_LCD` (modern LCD, thin flat rim) · `DEEP_RECESS_CRT` (deep inset viewing port, faint inner ring) · `VINTAGE_AMBER_INSET` (thicker amber-tinted bezel, deeper recess) |
| **Tier sizes (XS/S/M/L/XL)** | scope-area W×H: 64×48 · 96×72 · 128×96 · 192×144 · 256×192 (4:3 reference); aspect-corrected for 16:9 and 1:1; bezel thickness 1/2/2/3/4 px per tier |
| **Aspect ratios** | 4:3 (default — Tektronix CRT lineage) · 16:9 (modern wide — Rigol DS / Mutable Stages) · 1:1 (compact module — Make Noise tEnvelope LCD) |
| **Trace palettes — 4-CH oscilloscope set (amended 2026-05-20 at lock-time)** | CH1 `GREEN_PHOSPHOR` `#5BFF8C` (default — CRT P31 lineage; Tek 465 ch1) · CH2 `AMBER` `#FFC652` (Tek 465 ch2 / HP 1740A) · CH3 `CYAN` `#5BD0FF` (Rigol DS ch3 / Keysight) · CH4 `MAGENTA` `#FF7BC8` (Rigol DS ch4 / Tek MSO). **RED is EXCLUDED from the trace palette** — `#CC0000` family is reserved for `overload` (inner rim flash 1.5 Hz) and `error` (rim pulse 1 Hz) frame states per `project-patchwerk-accent-sparse`. Single-channel modules use CH1 (green) by default; multi-channel modules assign CH1–CH4 in channel order. |
| **Grid colour** | dim grey `#1F1F22` minor + `#2F2F33` major (every 4th); 8×6 graticule for 4:3; scales 16/8 for 16:9 and 8/8 for 1:1 |
| **States (7)** | `idle` (trace OFF, dim grid) · `receiving-signal` (trace ON, full brightness) · `no-signal` (frame normal, `NO SIG` badge bottom-left) · `overload` (inner rim flashes red 1.5 Hz) · `midi-mapped` (amber corner marker) · `disabled` (60% desat) · `error` (red rim, 1 Hz pulse) |
| **Bauhaus filter** | flat rectangular silhouette only; NO faux-CRT bulge, NO rounded organic shapes, NO curved viewing-port outlines — even DEEP_RECESS_CRT keeps a flat rectangle (the "CRT-ness" comes from depth + inner glow, not bulge) |
| **Bloom integration** | CINEMATIC theme + reflective finish = hybrid-palette warm inner ring (`α 80` deep-amber) on frame rim; SUBTLE = none; STANDARD = faint (`α 25`). Trace bloom is separate (lives with the trace renderer); the frame's CINEMATIC glow does NOT touch the trace. |
| **Min trace-area ratio** | scope render area ≥ 70 % of inset outer footprint (bezel may never eat more than 30 %) |
| **Sparse-red accent** | red reserved for `overload` (inner rim flash) and `error` (full rim pulse); idle/grid/trace-area NEVER use red |

---

## Canonical source file (lift target)

`demos/preview_engine_scope_inset_phase45.py` — defines:

- `PALETTES` — frame-body palettes per variant + trace palettes + grid palette
- `TIERS` — tier-name → (area_w, area_h, bezel_px) tables, plus aspect helpers
- `STATES` — 7 contextual state strings
- `draw_scope_inset(p, outer_rect, variant, tier, aspect, state, finish, theme, trace_palette, show_grid, trace_phase, animate)`
- `_paint_bezel_flat(...)`, `_paint_bezel_deep(...)`, `_paint_bezel_vintage(...)`
- `_paint_render_area_background(...)` — graphite dark fill + inner shadow
- `_paint_grid(...)` — graticule line render
- `_paint_state_overlays(...)` — NO SIG badge, overload flash, MIDI marker, error rim
- `_paint_sine_trace(...)` — representative trace renderer (illustrative only — production trace lives in mainline)

Suggested shared-module location at integration time:

```
syb_core/widgets/scope_inset.py   # frame primitives + tier table + state overlays
syb_core/widgets/scope_grid.py    # graticule rendering
```

---

## §1 Variants

Per `docs/ONESHOT_ELEMENT_WORKFLOW.md`, every variant slot logs ≥3 real-world
references and applies the bauhaus symmetric-shape filter (rectangle silhouette
only — no curved CRT bulges, no rounded organic outlines).

### `FLAT_BEZEL_LCD` — modern LCD-style flat bezel

- **Silhouette:** flat rectangle. Outer bezel = 1–2 px rim, thinnest of the three
  variants. Bezel sits flush with the faceplate (no recess).
- **Render-area background:** very dark blue-black `#070A10` (LCD off-state); when
  receiving a signal it tints slightly toward the trace palette to simulate a
  TFT backlight wash.
- **Bezel detail:** single rim stroke (`#3A3C40`) + 1 px inner highlight
  (`#525458` α 200) along the top edge to simulate a thin plastic bezel.
- **Backlight glow (CINEMATIC only):** when the trace is ACTIVE, a soft
  `α 30` white wash radiates outward from the inset bottom edge (LCD backlight
  bleed). SUBTLE/STANDARD = off.
- **Use case:** modern utility modules (e.g. `scope_4ch`, `spectrum`, `meter`),
  any module whose intent is "data display, not vintage charm."
- **Real-world refs:**
  - Rigol DS1054Z benchtop scope (modern flat LCD with thin bezel)
  - Mutable Instruments Stages OLED display
  - WMD Performance Mixer LED bar display
  - Make Noise 0-Coast / 0-Ctrl LCD modules

### `DEEP_RECESS_CRT` — deep inset viewing port (flat rectangle, simulated depth)

- **Silhouette:** flat rectangle (bauhaus rule). The "CRT viewing-port" feel is
  achieved with depth shadows, NOT a curved bulge. Outer bezel rim is recessed
  4–6 px below faceplate surface via inner shadow layers.
- **Render-area background:** deep graphite `#0A0A0C` with a barely-perceptible
  cyan-green wash (`#0E1418`) at the centre to simulate P31 phosphor coating.
- **Bezel detail:** 2 px outer rim (`#1A1A1C`) + cast shadow inside the rim
  (top/left α 200, bottom/right α 60) to simulate recess depth. An OPTIONAL
  inner glow ring (`α 40` warm white) sits at the inside lip when CINEMATIC
  theme is active.
- **Backlight glow (CINEMATIC only):** faint warm inner-ring on the bezel
  interior (`α 80` `#E0A24E` deep-amber from hybrid palette) — simulates the
  warmth of a CRT viewing port.
- **Use case:** modules with vintage / lab-instrument intent (`scope_4ch`,
  `lissajous`, `xy`, signal-debug modules where the "feeling of looking into
  a tube" matters).
- **Real-world refs:**
  - Tektronix 465 oscilloscope viewing port (1970s benchtop)
  - HP 1740A oscilloscope display recess
  - Vintage radar PPI displays
  - Buchla 200e display modules (deep-set CRT viewport idiom)

### `VINTAGE_AMBER_INSET` — thicker amber-tinted bezel + green-phosphor default

- **Silhouette:** flat rectangle with a thicker bezel (3–5 px) tinted in
  desaturated amber (`#3A2A18`). Recess depth between FLAT_BEZEL_LCD and
  DEEP_RECESS_CRT.
- **Render-area background:** dark teal-green `#0A1410` (vintage phosphor
  background) — defaults to GREEN_PHOSPHOR trace.
- **Bezel detail:** amber-tinted rim with a faint warm specular highlight on
  the top edge (`α 100` `#724A10`); the bezel reads as "anodised amber metal"
  rather than plastic. Inner well shadow at α 160 simulates the depth of a
  vintage chassis cutout.
- **Backlight glow (CINEMATIC only):** stronger inner amber ring than CRT
  variant (`α 100` `#B47A20`) — these instruments often had a noticeable
  bezel warmth in low-light environments.
- **Use case:** boutique modules with vintage character (`vintage_envelope`,
  retro signal-debug modules); any time the designer wants the scope to feel
  "warm and analog" rather than clinical.
- **Real-world refs:**
  - HP 1740A oscilloscope amber bezel
  - Vintage Marantz / Sansui receiver dial windows
  - Tektronix 7000-series amber bezel variant
  - Mutable Instruments Yarns OLED with amber surround (boutique idiom)
  - Make Noise tEnvelope display recess (warm-tinted bezel approach)

**Bauhaus filter applied:** all three are flat rectangles. NO curved CRT-bulge
silhouettes, NO rounded organic shapes, NO half-moon/oval viewport outlines.
The "viewport depth" character comes from recess shadows, not silhouette
curvature. The 70 % minimum trace-area ratio is enforced on all three.

---

## §2 Tier sizes (XS/S/M/L/XL)

Scope insets use the canonical 5-name tier scale per
`project-design-tier-vocabulary`. The tier sizes the **inner scope render area**
(the trace-drawing rectangle); the bezel adds px on each side per the variant's
bezel thickness.

All values are at **production canvas pixel scale**. Demo previews render at
+35 % per `feedback-larger-demo-icons`.

### Reference table (4:3 aspect — default historical scope ratio)

| Tier | Area W×H (px) | Bezel thickness (px) | Outer footprint W×H | Use case |
|---|---|---|---|---|
| **XS** | 64 × 48 | 1 | 66 × 50 | sub-display in a 2 Uw utility module (`scope_mini`) |
| **S** | 96 × 72 | 2 | 100 × 76 | inline scope on a 3 Uw module (`vco` waveform preview) |
| **M** | 128 × 96 | 2 | 132 × 100 | default — dedicated scope module 4 Uw (`scope`) |
| **L** | 192 × 144 | 3 | 198 × 150 | wide scope module 6 Uw (`scope_4ch` per-channel) |
| **XL** | 256 × 192 | 4 | 264 × 200 | hero scope module 8+ Uw (`scope_4ch` full overlay, `lissajous`) |

### Aspect ratio handling

Given a tier, the inner area W×H is determined by the aspect setting:

- **4:3** — table values verbatim (historical scope ratio)
- **16:9** — wider: `area_w` × `9/16 × area_w / (4/3 × area_h_base)` →
  practically: `(area_w_4x3, round(area_w_4x3 × 9/16))`. e.g. M → 128 × 72.
- **1:1** — square: `min(area_w_4x3, area_h_4x3) × 4/3` square. e.g. M → 96 × 96.

```python
def area_dims(tier_name: str, aspect: str) -> tuple[int, int]:
    base = TIERS[tier_name]               # (area_w_4x3, area_h_4x3, bezel_px)
    w43, h43, _ = base
    if aspect == "16:9":
        return (w43, max(int(round(w43 * 9 / 16)), 32))
    if aspect == "1:1":
        s = max(min(w43, int(round(h43 * 4 / 3))), 32)
        return (s, s)
    return (w43, h43)
```

### Bezel thickness rule

Bezel thickness in px is fixed per tier (table above), **NOT** per variant —
DEEP_RECESS_CRT uses the same bezel thickness as FLAT_BEZEL_LCD; the depth
illusion comes from the recess shadow layer, not extra bezel width. This keeps
the 70 % min trace-area ratio holding across all 3 variants at every tier.

### Acceptance check — 70 % trace-area ratio

For every tier × variant × aspect: `area_w × area_h ≥ 0.70 × outer_w × outer_h`.
Verified in the Phase 4.5 matrix by the legend label in each cell.

---

## §3 State vocabulary

Scope inset has a **frame-level** state vocabulary — these states control how
the **frame** behaves (rim colour, badge overlay, opacity). The trace itself
is rendered by mainline and inherits some states (idle → trace off; receiving
→ trace on; disabled → trace dimmed) but the frame state machine is
independent and lockable here.

| State | Trigger (host) | Frame change | Trace behaviour | Animation |
|---|---|---|---|---|
| **idle** | module instantiated, no input patched | normal frame; grid visible at dim alpha | trace OFF; render-area shows grid only | static |
| **receiving-signal** | input port patched, samples arriving | normal frame; render area at full brightness | trace ON at trace_palette colour | trace scrolls per signal |
| **no-signal** | input patched but signal flatlined for ≥1 s | normal frame; `NO SIG` badge at lower-left in `PL_CAPS_TIGHT` tier S | trace OFF | static |
| **overload** | input clipped at ±1.0 V for ≥1 sample (within last 250 ms window) | inner-rim flashes red `#CC0000` at 1.5 Hz | trace continues, render-area baseline tints faint red | rim pulse |
| **midi-mapped** | scope inset has a MIDI-controllable parameter mapped (e.g. timebase, trigger level) | amber corner marker (4 px right-triangle) at top-right of bezel | unchanged | static |
| **disabled** | module disabled via patch-load lock or `setEnabled(False)` | entire inset desaturated to 60 % grey-scale, 0.32 opacity | trace OFF (greyed out if cached) | static |
| **error** | mainline reports a runtime error from the trace renderer or module | full rim turns `#CC0000` α 220, pulses at 1.0 Hz; render area shows error glyph (centred `!`) | trace OFF | rim pulse |

**Hard rule:** the frame's `overload` and `error` states are the ONLY ones that
use red. `idle`, `no-signal`, `disabled` stay neutral; `midi-mapped` uses the
deep-amber accent. This honours `project-patchwerk-accent-sparse`.

**State composition:**
- `midi-mapped` may coexist with `receiving-signal` (a mapped scope can still
  show its trace). Render order: `midi-mapped` marker is painted LAST so it
  sits on top of all other layers.
- `disabled` overrides everything else (greyed-out wins).
- `error` overrides `overload` and `no-signal` (if the trace renderer crashes,
  show the error rim; don't also flash overload).

---

## §4 Recipe — paint layers

The frame draws in **layered order from back to front**, with the trace
renderer slotted in between layer 4 (background) and layer 5 (state overlays).

```
1. Faceplate cutout shadow      (subtle dark drop under the inset rim)
2. Outer bezel rim               (variant-specific colour, 1-4 px stroke)
3. Bezel bevel highlights        (top hi-light, bot/right shadow — recess depth)
4. Render-area background        (graphite dark fill + inner shadow)
   ── grid graticule lines       (dim grey minor + major-every-4th)
   ── optional CINEMATIC inner   (warm amber ring on bezel interior, theme-gated)
       glow ring
   ─────────── TRACE PLUGIN SURFACE ───────────
   (mainline trace renderer paints here; this lock provides a representative
    animated sine trace for matrix preview only)
5. Frame state overlays          (NO SIG badge, overload flash, MIDI marker,
                                  error rim, disabled grey)
```

Pseudocode skeleton:

```python
def draw_scope_inset(p: QPainter, outer_rect: QRectF, variant: str, tier: str,
                     aspect: str, state: str, finish: float, theme: BloomTheme,
                     trace_palette: str, show_grid: bool,
                     trace_phase: float, animate: bool) -> None:
    # Compute inner render area from outer_rect minus bezel
    bezel_px = TIERS[tier].bezel_px
    area_rect = outer_rect.adjusted(bezel_px, bezel_px, -bezel_px, -bezel_px)

    # Layer 1 — Faceplate cutout shadow
    _paint_cutout_shadow(p, outer_rect)

    # Layers 2-3 — Variant bezel
    if variant == "FLAT_BEZEL_LCD":
        _paint_bezel_flat(p, outer_rect, bezel_px)
    elif variant == "DEEP_RECESS_CRT":
        _paint_bezel_deep(p, outer_rect, bezel_px)
    elif variant == "VINTAGE_AMBER_INSET":
        _paint_bezel_vintage(p, outer_rect, bezel_px)

    # Layer 4 — Render-area background
    _paint_render_area_background(p, area_rect, variant, state)
    if show_grid:
        _paint_grid(p, area_rect, aspect)

    # Optional CINEMATIC inner glow ring (theme-gated)
    if theme.name == "CINEMATIC" and finish >= 0.5:
        _paint_inner_glow_ring(p, outer_rect, area_rect, variant)

    # ── TRACE PLUGIN SURFACE ──
    # Mainline plugs in the trace renderer here. Matrix preview uses a sine.
    if state == "receiving-signal":
        _paint_sine_trace(p, area_rect, trace_palette, trace_phase, animate)

    # Layer 5 — State overlays
    _paint_state_overlays(p, outer_rect, area_rect, state, theme, animate,
                          trace_phase)
```

### Layer 1 — Faceplate cutout shadow

```
QPainter cast — a 2 px-down translated copy of outer_rect filled QColor(0,0,0,90)
with corner radius 1.5; paint BEFORE bezel so the bezel layers fully cover it.
```

### Layer 2 — Outer bezel rim (per variant)

**FLAT_BEZEL_LCD:**
```
pen = QPen(QColor("#3A3C40"), 1.0)
p.drawRoundedRect(outer_rect, 1.5, 1.5)
# Inner highlight on top edge
pen2 = QPen(QColor(82, 84, 88, 200), 1.0)
p.drawLine(outer_rect.topLeft() + (1, 1), outer_rect.topRight() + (-1, 1))
```

**DEEP_RECESS_CRT:**
```
# Outer rim
pen = QPen(QColor("#1A1A1C"), bezel_px)
p.drawRoundedRect(outer_rect, 1.0, 1.0)
# Recess inner shadow (top + left dark; bot + right faint hi)
inner = outer_rect.adjusted(bezel_px*0.5, bezel_px*0.5, -bezel_px*0.5, -bezel_px*0.5)
grad_tl = QLinearGradient(inner.topLeft(), inner.topLeft() + (8, 8))
grad_tl.setColorAt(0.0, QColor(0,0,0,200))
grad_tl.setColorAt(1.0, QColor(0,0,0,0))
# similarly grad_br: hi-light fade
```

**VINTAGE_AMBER_INSET:**
```
# Amber-tinted outer rim
pen = QPen(QColor("#3A2A18"), bezel_px)
p.drawRoundedRect(outer_rect, 1.0, 1.0)
# Specular highlight along top (warm)
pen2 = QPen(QColor(114, 74, 16, 100), 1.0)
p.drawLine(outer_rect.topLeft() + (2, 1), outer_rect.topRight() + (-2, 1))
# Inner well shadow at α160
```

### Layer 3 — Bezel bevel highlights (shared across variants, scaled by recess depth)

```
RECESS_DEPTH_BY_VARIANT = {
    "FLAT_BEZEL_LCD": 0.0,        # flush — no recess shadow
    "DEEP_RECESS_CRT": 1.0,        # deep
    "VINTAGE_AMBER_INSET": 0.6,    # mid
}
# When > 0: paint top/left inner shadow at α=200*depth; bot/right at α=60*depth
```

### Layer 4 — Render-area background + grid

```
# Background fill (per variant)
BG_BY_VARIANT = {
    "FLAT_BEZEL_LCD":      QColor("#070A10"),
    "DEEP_RECESS_CRT":     QColor("#0A0A0C"),
    "VINTAGE_AMBER_INSET": QColor("#0A1410"),
}
p.fillRect(area_rect, BG_BY_VARIANT[variant])

# Inner shadow at top edge of render area (consistent across variants)
g_inner = QLinearGradient(area_rect.topLeft(), area_rect.topLeft() + (0, 6))
g_inner.setColorAt(0.0, QColor(0, 0, 0, 180))
g_inner.setColorAt(1.0, QColor(0, 0, 0, 0))

# Grid graticule
GRID_DIV_BY_ASPECT = {"4:3": (8, 6), "16:9": (16, 8), "1:1": (8, 8)}
n_x, n_y = GRID_DIV_BY_ASPECT[aspect]
for i in range(1, n_x):
    x = area_rect.left() + i * area_rect.width() / n_x
    is_major = (i % 4 == 0) or (i == n_x // 2)  # centre + every 4th
    col = QColor("#2F2F33") if is_major else QColor("#1F1F22")
    p.setPen(QPen(col, 1.0))
    p.drawLine(QPointF(x, area_rect.top()), QPointF(x, area_rect.bottom()))
# similarly for y
```

### CINEMATIC inner glow ring (theme-gated)

```python
def _paint_inner_glow_ring(p, outer_rect, area_rect, variant):
    if variant == "FLAT_BEZEL_LCD":
        col = QColor(230, 244, 255, 30)        # white wash
    elif variant == "DEEP_RECESS_CRT":
        col = QColor(224, 162, 78, 80)         # deep amber
    else:  # VINTAGE_AMBER_INSET
        col = QColor(180, 122, 32, 100)        # stronger amber
    # Draw 1 px stroke just inside the bezel
    pen = QPen(col, 1.0)
    p.drawRoundedRect(area_rect.adjusted(0.5, 0.5, -0.5, -0.5), 0.5, 0.5)
```

### Layer 5 — State overlays

**`no-signal` — NO SIG badge:**
```
# 2 px-padded rounded rect, lower-left, PL_CAPS_TIGHT tier S font (8 px)
badge = QRectF(area_rect.left() + 4, area_rect.bottom() - 14, 32, 10)
p.fillRect(badge, QColor(40, 40, 44, 220))
p.setPen(QColor(200, 200, 204))
p.setFont(QFont("Inter", 7, QFont.Weight.Bold))
p.drawText(badge, Qt.AlignCenter, "NO SIG")
```

**`overload` — inner-rim flash:**
```
# Pulse alpha at 1.5 Hz; paint a 1 px red stroke on the INNER edge of the
# bezel (between bezel and render area)
pulse_a = int(160 + 60 * sin(2π × 1.5 × t))
pen = QPen(QColor(204, 0, 0, pulse_a if animate else 220), 1.0)
p.drawRoundedRect(area_rect.adjusted(-0.5, -0.5, 0.5, 0.5), 0.5, 0.5)
# Faint baseline-tint inside render area
p.fillRect(area_rect, QColor(204, 0, 0, 18))
```

**`midi-mapped` — amber corner marker:**
```
# 4 px right-triangle at top-right of bezel (inside, on the rim)
pts = QPolygonF([
    QPointF(outer_rect.right() - 5, outer_rect.top() + 1),
    QPointF(outer_rect.right() - 1, outer_rect.top() + 1),
    QPointF(outer_rect.right() - 1, outer_rect.top() + 5),
])
p.fillPath(pts, QColor("#E0A24E"))
```

**`error` — full rim pulse:**
```
pulse_a = int(180 + 40 * sin(2π × 1.0 × t))
pen = QPen(QColor(204, 0, 0, pulse_a if animate else 220), bezel_px)
p.drawRoundedRect(outer_rect, 1.0, 1.0)
# Render-area shows centred ! glyph
p.setPen(QColor(204, 0, 0))
p.setFont(QFont("Inter", min(area_rect.height() * 0.5, 32), QFont.Weight.Bold))
p.drawText(area_rect, Qt.AlignCenter, "!")
```

**`disabled` — desat + opacity:**
```
p.save()
p.setOpacity(0.32)
# (the entire inset is wrapped — call this BEFORE all layers above when state is
# disabled, restore AFTER)
```

### Representative trace renderer (for preview only)

```python
def _paint_sine_trace(p, area_rect, trace_palette, phase, animate):
    col = TRACE_PALETTES[trace_palette]   # GREEN_PHOSPHOR / AMBER / WHITE_LCD / RED
    pen = QPen(col, 1.4)
    pen.setCapStyle(Qt.PenCapStyle.RoundCap)
    p.setPen(pen)
    n_points = int(area_rect.width())     # 1 px per sample for preview
    centre_y = area_rect.center().y()
    amp = area_rect.height() * 0.35
    path = QPainterPath()
    for i in range(n_points):
        x = area_rect.left() + i
        rel = i / n_points
        y = centre_y + amp * sin(2π × 2 × rel + (phase if animate else 0))
        if i == 0:
            path.moveTo(x, y)
        else:
            path.lineTo(x, y)
    p.drawPath(path)
```

### Bloom integration with the trace

Frame and trace bloom are **independent**. The CINEMATIC inner glow ring is a
FRAME-only paint (sits on the bezel interior, doesn't touch the render area).
The trace's own bloom is the trace renderer's responsibility — when mainline
plugs in the production renderer, it should apply phosphor-persistence bloom
(linear-stroke for green-phosphor and amber, isotropic-ish for white LCD)
matching `feedback-realistic-light-physics`. For matrix preview, the sine trace
draws unblurred — enough to judge how it reads against each frame palette.

---

## §5 Variant rationale — considered + drops

### Frame variants — considered

| Candidate | Status | Reason |
|---|---|---|
| `FLAT_BEZEL_LCD` | LOCKED | Modern utility default; thinnest bezel preserves max trace area |
| `DEEP_RECESS_CRT` | LOCKED | Vintage lab-instrument idiom; depth via shadow not bulge |
| `VINTAGE_AMBER_INSET` | LOCKED | Warm boutique character; honours hybrid-palette amber accent |
| **Curved CRT-bulge silhouette** | DROPPED | Bauhaus filter — no rounded organic outlines; CRT-ness comes from depth only |
| **Pie-wedge / radial scope** (PPI radar) | DROPPED | Non-rectangular; bauhaus rule out; tangential to module needs |
| **Diamond / chevron viewport** | DROPPED | Asymmetric silhouette; bauhaus rule |
| **Holographic edge-lit acrylic frame** | DROPPED | Production-impossible aesthetic; flat-panel design language rejects skeuomorphism beyond depth shadow |
| **Gradient-fade bezel (top dark → bottom light)** | DROPPED | Asymmetric (top vs bottom different) — bauhaus filter requires bilateral or rotational symmetry |
| **Carved-wood frame / chassis-trim variant** | DROPPED | Cohesion with hybrid palette is poor; reads as "novelty module" not utility |

### Tier strategy — considered

| Candidate | Status | Reason |
|---|---|---|
| Match slider tiers verbatim (XS=8 px short side) | DROPPED | Scope inset's minimum useful size is much larger than a slider track width — XS scope still needs ≥48 px short axis |
| Independent tier set (T/TS/TM like trim pots) | DROPPED | Element-set fragmentation; canonical 5-tier vocabulary holds |
| Aspect ratio fixed at 4:3 always | DROPPED | Modules vary in panel real-estate; 16:9 fits wide-utility better, 1:1 for compact |
| Aspect ratio free / per-module continuous | DROPPED | Three discrete options is enough; continuous fragmentation breaks consistency |

### Trace palette — considered

| Candidate | Status | Reason |
|---|---|---|
| GREEN_PHOSPHOR (`#5BFF8C`) | LOCKED — default | P31 CRT lineage; highest legibility on dark fill |
| AMBER (`#FFC652`) | LOCKED | HP / vintage instrument idiom; pairs with VINTAGE_AMBER_INSET |
| WHITE_LCD (`#E6F4FF`) | LOCKED | Modern LCD/TFT default; pairs with FLAT_BEZEL_LCD |
| RED (`#FF6464`) | LOCKED | Reserved for overload preview / alarm channels |
| BLUE / CYAN trace | DROPPED | Too close to error/info ambiguity; cluttered palette |
| MULTI-COLOR per-channel (RGB) | DROPPED | Per-channel colour is a TRACE-RENDERER concern; the frame palette stays canonical |

### Grid styling — considered

| Candidate | Status | Reason |
|---|---|---|
| Dim grey minor + brighter major (every 4th) | LOCKED | Classic graticule idiom; legible without distracting |
| Dotted graticule (vs continuous lines) | DROPPED | Dotted lines look noisy at small tiers; continuous reads cleaner |
| No grid at all | DROPPED | Trace context becomes unreadable; grid is essential |
| Coloured grid (warm grey, faint amber) | DROPPED | Adds palette load; neutral grey stays clear of trace palette |
| Sub-pixel hairlines | DROPPED | Anti-alias jitter at small tiers; 1 px cosmetic pen is sharper |

### State variants — considered

| Candidate | Status | Reason |
|---|---|---|
| `hover` state on the frame | DROPPED | Frame is non-interactive; hover lives on host control mapping to it |
| `peak-hold` indicator on overload | DROPPED | Belongs in trace renderer (sample-level state) |
| `trigger-armed` indicator | DROPPED | Trigger UX lives in trace renderer's parameter row |

### Cross-cutting drops

- **Internal moving "scan line"** — belongs to the trace renderer's persistence
  model, not the frame.
- **Procedural noise overlay** for vintage feel — adds CPU cost for no
  legibility gain; CINEMATIC inner ring covers the warmth without noise.
- **Channel labels burned into the bezel** — belongs to signage layer
  (port/param labels around the inset; see `SIGNAGE_CORE_RECIPE_LOCK.md`).

---

## §6 Integration plan — what mainline must do

### Target widget class

```
syb_core/widgets/scope_inset.py
    class ScopeInsetV3(QWidget)
        def __init__(self, variant: str = "FLAT_BEZEL_LCD",
                     tier: str = "M",
                     aspect: str = "4:3",
                     trace_palette: str = "GREEN_PHOSPHOR",
                     show_grid: bool = True)
        def set_state(self, state: str) -> None
        def set_trace_renderer(self, renderer_callable) -> None
            """renderer_callable(painter, area_rect, phase) -> None"""
        def paintEvent(self, e) -> None:
            # Layers 1-4 + optional CINEMATIC ring → trace renderer surface
            # → Layer 5 state overlays
    # shared functions:
    def draw_scope_inset(painter, outer_rect, variant, tier, aspect, state,
                         finish, theme, trace_palette, show_grid,
                         trace_phase, animate)
    def area_dims(tier_name, aspect) -> tuple[int, int]
    def outer_dims(tier_name, aspect) -> tuple[int, int]

syb_core/widgets/scope_grid.py
    def paint_graticule(painter, area_rect, aspect)
    GRID_DIV_BY_ASPECT: dict[str, tuple[int, int]]
```

### Primitives needed (don't exist yet in canonical sources)

1. **`_paint_bezel_flat / _paint_bezel_deep / _paint_bezel_vintage`** — three
   variant-specific bezel painters.
2. **`_paint_render_area_background(p, area_rect, variant, state)`** — fill +
   inner shadow + optional state baseline tint.
3. **`paint_graticule(p, area_rect, aspect)`** — grid line renderer.
4. **`_paint_inner_glow_ring`** — CINEMATIC frame glow (NOT trace glow).
5. **`_paint_state_overlays`** — NO SIG, overload, MIDI marker, error rim, disabled.
6. **Trace plugin surface protocol** — `set_trace_renderer(callable)` on
   `ScopeInsetV3` so mainline can plug in the real renderer.

### Pipeline differences (scope inset vs other elements)

- **Two-tier paint sequence** — frame paints both BEFORE and AFTER the trace
  (background+grid before; state overlays after). Other elements (knobs,
  sliders, LEDs) draw their state painted on top of their body in a single
  pass. Scope inset needs an explicit "trace surface" hook between layers 4
  and 5.
- **State machine straddles two ownership domains** — frame state (idle /
  no-signal / overload / midi-mapped / disabled / error) is OWNED here; trace
  state (sample buffer presence, trigger position) is OWNED by mainline. The
  scope inset widget exposes both: `set_state(frame_state)` + trace renderer
  callback signals trace presence.
- **Aspect ratio is a first-class field** — knobs/sliders/LEDs don't have
  aspect ratio as a variant axis. Scope inset does (4:3 / 16:9 / 1:1) and
  layout code must budget for the chosen aspect at build time.
- **Grid is a separate paint primitive** — not layered into the background
  fill; `paint_graticule` can be called or skipped per `show_grid`. This lets
  spectrum/meter variants that don't want a graticule turn it off without
  affecting the background fill.

### Signage anchor rule (port labels around the scope inset)

Port labels for `IN`, `TRIG`, `CLK` etc. anchor **below** the scope inset's
outer rect, per the SIGNAGE_CORE locked rule (port labels anchor BELOW-only,
no side/above fallback, hard min-gap per tier). The layout must reserve a
strip of ≥ `port_label_tier.font_px + GAP_PX` below the inset's outer rect
for the label row; the inset widget never extends into that strip.

Type-strip (module name) sits above the inset using the canonical TS rules
from SIGNAGE_CORE — the inset never overlaps the type-strip band.

### Refactor steps

1. Create `syb_core/widgets/scope_inset.py` and `syb_core/widgets/scope_grid.py`
   by lifting the canonical functions from
   `demos/preview_engine_scope_inset_phase45.py`.
2. Replace any inline scope painting in `ModuleNode._paint_*` (currently no
   modules render a scope inline — `scope` / `scope_4ch` use placeholder
   rectangles) with `ScopeInsetV3` instantiation.
3. Add new instance attrs to `scope` and `scope_4ch` modules:
   - `self._scope_variant: str` — default `FLAT_BEZEL_LCD` for new scopes
   - `self._scope_tier: str` — derived from module size
   - `self._scope_aspect: str` — module-author chooses
   - `self._scope_trace_palette: str` — default `GREEN_PHOSPHOR`
4. Wire host state → frame state in `ScopeInsetV3.paintEvent`:
   - `if input_port.connected and samples_arriving:` → `receiving-signal`
   - `if input_port.connected and not samples_arriving:` → `no-signal`
   - `if samples_clipping():` → `overload`
   - `if param.midi_mapped:` → `midi-mapped`
   - `if not module.enabled:` → `disabled`
   - `if trace_renderer raised:` → `error`
5. Hook up `set_trace_renderer(lambda p, r, ph: production_renderer.paint(p, r, ph))`
   for production trace rendering (separate lane).
6. `py_compile` clean. Build a mainline revision. Verify against
   `demos/preview_engine_scope_inset_phase45.py`.

### Mainline revision integration test

1. Build new revision `syb_modular_ui_prototype_<next>.py` with `ScopeInsetV3` lifted.
2. Apply to **3 representative modules**:
   - `scope` (single-channel, 4 Uw, M tier, 4:3) — exercises `FLAT_BEZEL_LCD`
   - `scope_4ch` (4-channel, 6+ Uw, L tier, 16:9) — exercises per-channel inset
   - One module with a scope sub-display (e.g. proposed `vintage_envelope` with
     small inline scope at S tier, 1:1) — exercises `VINTAGE_AMBER_INSET`
3. Launch, visually compare each module's scope frame against the corresponding
   matrix cell in `preview_engine_scope_inset_phase45.py`. Diff acceptable:
   trace-renderer output (mainline lane), minor anti-aliasing differences.
   NOT acceptable: missing variants, wrong tier sizes, wrong bezel colours,
   trace area falling below 70 % outer footprint.
4. Test interaction states:
   - Unplug input → `no-signal` badge appears.
   - Force a clipping signal → inner rim flashes red at 1.5 Hz.
   - MIDI-map the timebase → amber corner marker appears.
   - Disable module → entire inset desats to 0.32 opacity.
   - Crash the trace renderer (debug shortcut) → error rim + centred `!`.
5. If pass → scope inset section is LOCKED. Update memory
   `feedback-integration-plan-documented-tested` status board.

---

## §7 Acceptance criteria

Scope inset is **preview-LOCKED** when:

- ✅ Phase 4.5 matrix demo (`demos/preview_engine_scope_inset_phase45.py`)
  renders ALL variants × ALL tiers × ALL states × ALL finishes × ALL themes
  × ALL aspects with no skipped slots.
- ✅ Each cell renders a representative animated sine trace inside the inset
  so trace × frame interaction is judgeable under every theme/finish/variant.
- ✅ Bauhaus filter holds — all 3 variants are flat rectangles; NO faux-CRT
  bulge silhouette, NO rounded organic shapes, NO curved viewport outlines.
- ✅ Grid is legible at every tier — verified by sizing the matrix cells at
  +35 % and checking the M-tier grid is distinguishable from background.
- ✅ Trace render area is ≥ 70 % of inset outer footprint at every tier ×
  variant × aspect — bezel never eats more than 30 % of the inset area.
- ✅ Realistic-light-physics trace bloom works on all variants — verified by
  visual comparison: the green-phosphor trace bloom (linear-stroke ellipse
  along the trace path) doesn't fight any frame variant; the amber and white
  traces don't wash out the bezel character.
- ✅ Sparse-red accent — red appears ONLY in `overload` and `error` states;
  idle / receiving-signal / no-signal / midi-mapped / disabled never use red
  anywhere on the frame.
- ✅ Variant Reality Check (`feedback-variant-reality-check`) — every variant
  cites ≥3 real-world references; all references are real production hardware
  or established software peers.
- ✅ Live toggles work: variant, finish, theme, aspect, trace-palette,
  animation, grid on/off — all combinations reachable from the matrix window.

Scope inset is **INTEGRATION-LOCKED** only when:

- ⏳ `syb_core/widgets/scope_inset.py` + `syb_core/widgets/scope_grid.py`
  exist and contain the lifted primitives.
- ⏳ `ScopeInsetV3.set_trace_renderer(callable)` protocol implemented and
  mainline trace renderer plugged in for `scope` and `scope_4ch` modules.
- ⏳ Mainline revision built, launched, visually verified against the matrix
  on the three representative modules.

Currently the integration step is pending — this recipe-lock + Phase 4.5
matrix unblock mainline to start the integration revision.

---

## What's NEW vs what's CANONICAL

| Item | Source |
|---|---|
| 3 frame variants × 5 tiers × 3 aspects | NEW — this lock |
| Frame-state vocabulary (idle / receiving / no-signal / overload / midi-mapped / disabled / error) | NEW — this lock |
| 70 % min trace-area ratio rule | NEW — this lock |
| CINEMATIC inner glow ring (frame-only, distinct from trace bloom) | NEW — this lock |
| Trace plugin surface protocol | NEW — this lock |
| Graticule rendering (8×6 / 16×8 / 8×8 per aspect) | NEW — this lock |
| Bauhaus flat-rectangle silhouette enforcement | CANONICAL (`project-bauhaus-symmetric-shape-rule`) |
| Sparse-red accent rule | CANONICAL (`project-patchwerk-accent-sparse`, 2026-05-08) |
| Hybrid palette body / canvas / bevel colours | CANONICAL (`project-patchwerk-hybrid-palette`) |
| BloomTheme reflectivity multipliers | CANONICAL (`demos/bloom_theme.py`) |
| State pulse alpha formula (1.5 Hz overload, 1.0 Hz error) | CANONICAL — borrowed from `LED_RECIPE_LOCK.md` animation rates |
| Signage anchor rule (port labels below inset) | CANONICAL (`SIGNAGE_CORE_RECIPE_LOCK.md`, 2026-05-20) |
| 5-tier vocabulary (XS/S/M/L/XL) | CANONICAL (`project-design-tier-vocabulary`) |
| Trace palette colours (green / amber / white-LCD / red) | CANONICAL — phosphor / LCD industry standards |

---

## FROZEN sub-elements (post-RC polish, do NOT design now)

- Sample-buffer decimation, triggering, multi-channel overlay strategy
- Phosphor-persistence (afterglow) shader
- Spectrum-mode bar fill renderer
- Cursor / measurement readouts inside the render area
- Channel-toggle UI inside the bezel rim

Per `docs/RC1_DEEP_FREEZE.md` — these all belong to the trace-rendering lane
and are out of scope for this frame lock. Resume in mainline once frame
integration lands.
