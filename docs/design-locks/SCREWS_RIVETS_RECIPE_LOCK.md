# Panel Screws + Rivets Recipe Lock — RC-1 MVP element

_Locked 2026-05-20 via the one-shot workflow (`docs/ONESHOT_ELEMENT_WORKFLOW.md`).
Visual-only faceplate furniture; not interactive. Mainline lifts these primitives
verbatim when introducing the `FastenerV3` widget._

---

## TL;DR — the lock

| Component | Recipe |
|---|---|
| **Variants** | 6 — SLOT_HEAD · PHILLIPS · HEX_SOCKET · HEX_HEAD · FLUSH_RIVET · DOME_RIVET |
| **Silhouette filter** | Bauhaus rule: round or hex only — both rotationally symmetric primitives |
| **Tier sizes (head diameter)** | XS = 4 px · S = 6 px · M = 8 px · L = 11 px · XL = 14 px |
| **Production default** | M (8 px) — corresponds to Eurorack M3 rack screw at canvas zoom |
| **Finishes** | STEEL · BLACK_ANODIZED · BRASS (3-way live toggle) — DULL_ZINC deferred |
| **States** | idle · wear-overlay (toggle) — interactive states NOT applicable |
| **Paint layers** | 6 — recess shadow → head base → drive inset → bevel → specular dot → optional wear |
| **Theme reactivity** | specular peak scales with `BloomTheme.idle_led_peak` (subtle/standard/cinematic/off) |
| **Placement rule** | One fastener per faceplate corner; density = 4 fasteners per module regardless of Uw |

---

## §1 — Variants

All variants pass the bauhaus symmetric-shape rule (round/hex silhouette only; rotationally
symmetric heads; no tapers, no asymmetric features). Each variant cites at least one
named real-world reference per `feedback-variant-reality-check`.

### V1 — SLOT_HEAD (screw)
- **Silhouette:** round head, single straight slot across centre.
- **Real-world refs:**
  - McMaster 90235A220 — #4-40 slotted pan-head machine screw (steel).
  - Vintage HiFi gear chassis fasteners — Marantz / McIntosh top-plate screws.
  - Eurorack DIY common — Mouser slotted M3 pan head.
- **Use:** vintage/industrial-feel modules, "older test gear" aesthetic.

### V2 — PHILLIPS (screw)
- **Silhouette:** round head, equal-arm cross recess (4-way symmetric).
- **Real-world refs:**
  - McMaster 92000A115 — M3 Phillips pan-head machine screw.
  - Eurorack standard rack screw (Synthrotek M3 Phillips × 6 mm).
  - Doepfer A-100 panel fastener.
- **Use:** modern Eurorack default (most common production screw).

### V3 — HEX_SOCKET (screw, allen drive)
- **Silhouette:** round head, hexagonal socket recess (6-fold rotationally symmetric).
- **Real-world refs:**
  - McMaster 91255A — M3 hex socket cap screw (steel, black-oxide finish common).
  - Mutable Instruments panel fastener (M2.5 BHCS).
  - Make Noise/Pittsburgh black-anodized BHCS.
- **Use:** premium/clean modules; pairs naturally with BLACK_ANODIZED finish.

### V4 — HEX_HEAD (screw, external hex drive)
- **Silhouette:** hexagonal head outline (no round, no inset — the head IS the hex).
- **Real-world refs:**
  - McMaster 91290A115 — M3 hex-head cap screw.
  - Industrial gear / amp chassis bolts.
  - Marshall amp chassis hex-head screw.
- **Use:** rugged industrial modules; "tooling-built" feel.

### V5 — FLUSH_RIVET (rivet)
- **Silhouette:** flat circular disk, sits flush with faceplate; faint annular ring.
- **Real-world refs:**
  - Marson MR-50F — 1/8″ flush pop rivet.
  - Aircraft skin countersunk rivet (AN426 standard).
  - Vintage aluminum-faced gear (Tektronix scope chassis).
- **Use:** brushed-aluminum aesthetic, vintage scientific instruments.

### V6 — DOME_RIVET (rivet)
- **Silhouette:** smooth raised dome, no drive feature, slightly proud of faceplate.
- **Real-world refs:**
  - Marson MR-50D — 1/8″ dome (round-head) pop rivet.
  - Solid brass dome rivet (hi-fi gear restoration parts).
  - Vintage Hammond organ tone-cabinet rivet.
- **Use:** decorative/structural hybrid; pairs naturally with BRASS finish.

---

## §2 — Tier sizes (head diameter in pixels)

| Tier | Head Ø (px) | Real-world equivalent | Use case |
|---|---|---|---|
| XS | 4 | M1.6 / #0 micro-screw | Dense fastener arrays, sub-miniature panels |
| S  | 6 | M2 / #2 fine-pitch | 1Uw narrow modules, fine PCB-mount panels |
| M  | 8 | M3 / #4 (Eurorack rack screw) | **Production default** — most modules |
| L  | 11 | M4 / #6 chassis screw | Wide modules (≥6Uw), Marshall-amp chassis idiom |
| XL | 14 | M5 / 1/4″ hex bolt | Large industrial gear, amp top-plate, rare faceplate use |

Notes:
- These values are *visual* sizes at canvas zoom, derived from how M2–M5 fasteners actually
  appear on real Eurorack / studio gear photographed at panel scale.
- Tier set matches `project-design-tier-vocabulary` (XS/S/M/L/XL, locked 2026-05-14).
- Tier indices are **independent of slider/knob/LED tier pixel values** — a tier name (XS, S, …) is
  the cross-element vocabulary; the px value depends on the element.
- HEX_HEAD silhouette uses the same Ø (flat-to-flat across the hex); the hex circumscribed
  diameter is ~1.155× Ø, so an L-tier HEX_HEAD takes slightly more horizontal space than an
  L-tier round-head — accounted for in placement padding.
- FLUSH_RIVET diameter matches round-screw Ø; dome height = ~0.0 (visually flush).
- DOME_RIVET diameter matches round-screw Ø; dome height implied by specular only (no real raise
  in pixel data — we paint the dome via gradient, not extrusion).

---

## §3 — State vocabulary (minimal)

Fasteners are **non-interactive furniture** — they receive no mouse events, no MIDI bindings,
no modulation, no error states. The standard interactive vocabulary from
`project-state-vocabulary` (HOVER, ACTIVE, MIDI-LEARNING, MIDI-MAPPED, MODULATED, AUTOMATED,
DISABLED, ERROR) **does NOT apply** and must not be wired into the widget.

Applicable states:

| State | Description | Toggle |
|---|---|---|
| **idle** | Default rendering — head + drive inset + bevel + specular per finish + theme. Always on. | n/a |
| **wear-overlay** | Light dust streaks + slight rim darkening + faintly desaturated specular. Faceplate-wide property (not per-fastener). | live toggle in matrix |
| **hover-on-panel-only** | When the *parent module* is hovered (not the fastener), specular brightness lifts by ~12%. Sympathetic-not-interactive; matches how real panel hardware catches light when a hand approaches. | derived from parent panel |

**Explicit non-applicable states (rendered in matrix as `STATE DEMO — N/A` badge):**
HOVER (self), ACTIVE, MIDI-LEARNING, MIDI-MAPPED, MODULATED, AUTOMATED, DISABLED, ERROR.
These show as a panel of badged cells with hatched overlay per
`feedback-engine-preview-selectable-vs-demo` — to make explicit that the design has
*considered* and *rejected* applying these states to fasteners, rather than silently skipping them.

---

## §4 — Recipe (paint layers + finish palette)

### 4.1 Layer stack (back→front)

```
1. Recess shadow      — soft ellipse ~1.4×Ø below head; α 60 STANDARD, ~110 CINEMATIC.
                        Indicates head sits IN the faceplate, not floating on it.
2. Head base          — round (V1/V2/V3/V5/V6) or hex (V4) shape. Radial gradient:
                        rim → mid → centre using finish palette indices.
3. Drive inset        — variant-specific recess painted on top of base:
                          SLOT_HEAD   → 1 horizontal line, w=0.62·Ø, h≈max(1, Ø/10)
                          PHILLIPS    → 2 perpendicular lines, w=0.55·Ø, h=Ø/10 each
                          HEX_SOCKET  → hexagonal hole at 0.50·Ø flat-to-flat
                          HEX_HEAD    → none (hex IS the silhouette; no inset)
                          FLUSH_RIVET → faint 1-px annular ring at 0.42·Ø radius
                          DOME_RIVET  → none (smooth dome; specular handles the form)
                        Inset fill = finish.deep colour (darkest palette entry).
4. Bevel              — top-left highlight α 130 + bottom-right shadow α 160 along
                        the silhouette edge. Width ≈ Ø·0.08 (min 1 px).
                        For HEX_HEAD this rides the 6 edges of the polygon, not a circle.
5. Specular dot       — small radial gradient at (cx − 0.18·Ø, cy − 0.22·Ø),
                        radius = Ø·0.18, peak alpha = clamp(theme.idle_led_peak × 4, 0, 235).
                        For brushed/matte specular peaks lower; for reflective higher.
                        This is the SIGNATURE highlight — never omit.
6. Wear overlay       — IF wear toggle ON:
                        - 1–2 thin dark streaks across head (α 40, length 0.6·Ø)
                        - rim darkening: outer 8% radius gets +α 50 dark
                        - specular alpha multiplied by 0.75 (slight oxidation)
                        Deterministic per-fastener: hash on (cell_id, variant) → stable streak angle.
```

### 4.2 Finish palettes

Each finish defines 4 colours used by layers 2 (base gradient), 3 (drive deep), 4 (bevel),
5 (specular tint).

| Finish | rim (#) | mid (#) | deep (#) | spec_tint (#) | Notes |
|---|---|---|---|---|---|
| **STEEL** | `#C0C2C6` | `#7A7C82` | `#3A3C42` | `#FFFFFF` | Cool-neutral; default for most modules. |
| **BLACK_ANODIZED** | `#48484C` | `#2A2A2E` | `#0E0E10` | `#E0E0E4` | Matte black; pairs with HEX_SOCKET typically. |
| **BRASS** | `#E0C078` | `#A88838` | `#5C4818` | `#FFF0C8` | Warm; pairs with DOME_RIVET / vintage gear. |
| **DULL_ZINC** *(deferred)* | `#A8A8AC` | `#888888` | `#4A4A4E` | `#F0F0F0` | Industrial chromate; not in v1 UI toggle but documented for future. |

### 4.3 Paint pseudocode (liftable into Qt widget)

```python
def paint_fastener(p: QPainter, cx: float, cy: float, diameter: float,
                   variant: str, finish: dict, theme: BloomTheme,
                   wear: bool = False, hover_panel: bool = False,
                   stable_seed: int = 0) -> None:
    r = diameter * 0.5
    # ── 1. Recess shadow ──────────────────────────────────────────
    shadow_a = 60 if theme.name == "STANDARD" else max(30, int(theme.idle_led_peak * 2))
    p.setBrush(QColor(0, 0, 0, shadow_a)); p.setPen(Qt.NoPen)
    p.drawEllipse(QPointF(cx, cy + r * 0.18), r * 1.10, r * 0.60)

    # ── 2. Head base ──────────────────────────────────────────────
    grad = QRadialGradient(cx - r * 0.15, cy - r * 0.20, r * 1.10)
    grad.setColorAt(0.00, QColor(finish["rim"]))
    grad.setColorAt(0.55, QColor(finish["mid"]))
    grad.setColorAt(1.00, QColor(finish["deep"]))
    p.setBrush(QBrush(grad))
    if variant == "HEX_HEAD":
        _draw_hex_polygon(p, cx, cy, r)
    else:
        p.drawEllipse(QPointF(cx, cy), r, r)

    # ── 3. Drive inset ────────────────────────────────────────────
    inset_pen = QPen(QColor(finish["deep"]))
    inset_pen.setCosmetic(False)
    inset_pen.setCapStyle(Qt.FlatCap)
    if variant == "SLOT_HEAD":
        inset_pen.setWidthF(max(1.0, diameter / 10.0))
        p.setPen(inset_pen)
        p.drawLine(QPointF(cx - r * 0.62, cy), QPointF(cx + r * 0.62, cy))
    elif variant == "PHILLIPS":
        inset_pen.setWidthF(max(1.0, diameter / 10.0))
        p.setPen(inset_pen)
        p.drawLine(QPointF(cx - r * 0.55, cy), QPointF(cx + r * 0.55, cy))
        p.drawLine(QPointF(cx, cy - r * 0.55), QPointF(cx, cy + r * 0.55))
    elif variant == "HEX_SOCKET":
        p.setBrush(QColor(finish["deep"])); p.setPen(Qt.NoPen)
        _draw_hex_polygon(p, cx, cy, r * 0.50)
    elif variant == "FLUSH_RIVET":
        p.setBrush(Qt.NoBrush)
        ring = QPen(QColor(finish["deep"])); ring.setWidthF(1.0)
        p.setPen(ring); p.drawEllipse(QPointF(cx, cy), r * 0.42, r * 0.42)
    # HEX_HEAD / DOME_RIVET → no inset

    # ── 4. Bevel ──────────────────────────────────────────────────
    _bevel_edge(p, cx, cy, r, variant, hi_a=130, lo_a=160)

    # ── 5. Specular dot ───────────────────────────────────────────
    spec_peak = min(235, int(theme.idle_led_peak * 4))
    if hover_panel: spec_peak = min(235, int(spec_peak * 1.12))
    if wear:        spec_peak = int(spec_peak * 0.75)
    spec = QRadialGradient(cx - r * 0.18, cy - r * 0.22, r * 0.45)
    spec.setColorAt(0.0, QColor(finish["spec_tint"]).lighter(110))
    spec.setColorAt(0.5, _with_alpha(QColor(finish["spec_tint"]), int(spec_peak * 0.5)))
    spec.setColorAt(1.0, _with_alpha(QColor(finish["spec_tint"]), 0))
    p.setBrush(QBrush(spec)); p.setPen(Qt.NoPen)
    p.drawEllipse(QPointF(cx - r * 0.18, cy - r * 0.22), r * 0.18, r * 0.18)

    # ── 6. Wear overlay (optional) ────────────────────────────────
    if wear:
        _paint_wear_streaks(p, cx, cy, r, stable_seed)
```

The full implementation lives in `demos/preview_engine_screws_rivets_phase45.py` — that file
is the canonical paint source; mainline lifts it into `syb_core/widgets/fastener_recipe.py`
during integration (see §6).

---

## §5 — Variant rationale (considered + dropped)

### Kept (6 variants — full bauhaus pass)
SLOT_HEAD, PHILLIPS, HEX_SOCKET, HEX_HEAD, FLUSH_RIVET, DOME_RIVET — each cites ≥3
distinct real-world references and each silhouette is round or hex (rotationally symmetric).

### Considered + dropped

| Candidate | Reason dropped |
|---|---|
| **POZIDRIV** | Visually indistinguishable from PHILLIPS at faceplate canvas zoom (4–14 px head). At target tier sizes, the extra diagonals would alias to a single pixel and read as PHILLIPS. Real-world distinct, render-not. |
| **TORX (star drive)** | Bauhaus filter — 6-pointed star is rotationally symmetric BUT the pointed star silhouette of the recess violates the "round/hex/square only" primitive rule in `project-bauhaus-symmetric-shape-rule`. Modern but not bauhaus-clean. |
| **SPLINE / 12-POINT** | Same as Torx — multi-point recess violates simple-shape rule. |
| **SQUARE (Robertson) drive** | Square recess is rotationally symmetric and bauhaus-permissible (square is in the primitive list), but real-world distribution is North-America-only and overlaps PHILLIPS visually at canvas zoom. Deferred — surface only if Robertson aesthetic explicitly requested. |
| **OVAL / TRUSS HEAD profile** | Bauhaus filter — head profile differs at silhouette edge but reads identical to round at top-down panel view. No visual distinction at canvas zoom. |
| **COUNTERSUNK FLAT-HEAD** | Reads identical to FLUSH_RIVET at panel-top view (the cone is hidden under the panel). FLUSH_RIVET already covers this idiom. |
| **WING SCREW / KNURLED THUMB SCREW** | Asymmetric or extruded features (wings) violate rotational-symmetry rule. Also implies interactivity (intended for hand adjustment) — out of scope for visual furniture. |
| **DULL_ZINC finish** | Functional finish (industrial chromate), but visually so close to STEEL at canvas zoom that the 3-way toggle would feel like 2.5-way. Documented in §4.2 as a future addition; not in v1 toggle. |

### R1 candidates considered per slot

Each variant slot had ≥3 candidate real-world references reviewed (see §1). No slot was filled
on a single example. If any future challenge surfaces ≥3 unfound, escalate via
`broker/inboxes/demo-agent/QUESTION_ONESHOT_SCREWSRIVETS.json` per the brief.

---

## §6 — Integration plan (mainline target)

### Target widget class

**`FastenerV3`** — a stateless QWidget (or stand-alone paint helper if widget overhead is too
much for 4-per-module density) with the following constructor signature:

```python
FastenerV3(
    variant: str,          # "SLOT_HEAD" | "PHILLIPS" | "HEX_SOCKET" |
                           # "HEX_HEAD" | "FLUSH_RIVET" | "DOME_RIVET"
    tier:    str,          # "XS" | "S" | "M" | "L" | "XL"
    finish:  str = "STEEL", # "STEEL" | "BLACK_ANODIZED" | "BRASS"
    wear:    bool = False,  # faceplate-level toggle, propagated by parent ModuleNode
)
```

### Primitives reused

- **Bevel + specular technique** — same approach as
  `slider_handle_demo.paint_recipe` layers 4/5/7 (highlight α 130/specular radial 0.18×r).
  No new primitive needed — adopt the slider lift formula.
- **BloomTheme** — read `idle_led_peak` to scale specular alpha; consume the same
  `bloom_theme.DEFAULT_THEME` instance the rest of the design language uses.
- **Hex polygon helper** — share with future hex-LED variants if any (currently none locked).

### New primitives needed

1. `_draw_hex_polygon(p, cx, cy, r)` — regular hexagon centred at (cx,cy) with flat-to-flat = 2r.
   Reused by HEX_HEAD silhouette and HEX_SOCKET drive inset.
2. `_bevel_edge(p, cx, cy, r, variant, hi_a, lo_a)` — applies highlight/shadow along the
   variant's silhouette edge (circle for round, hex polygon for HEX_HEAD).
3. `_paint_wear_streaks(p, cx, cy, r, seed)` — deterministic streak overlay; seed from
   stable (module-id, fastener-position) tuple so the wear pattern doesn't churn between
   redraws.

### Placement rule (canonical)

```
Per module faceplate:
  - 4 fasteners total, one at each corner.
  - Corner offset: 8 px inset from panel edge (both x and y).
  - Tier selected from Uw:
      Uw == 1   → S  (6 px)   — single-unit narrow modules
      Uw 2..4   → M  (8 px)   — Eurorack standard
      Uw 5..8   → L  (11 px)  — wide modules
      Uw >= 9   → XL (14 px)  — rare jumbo modules
  - Variant + finish are user-pickable per module (default PHILLIPS / STEEL = canonical Eurorack).
  - Wear: faceplate-level boolean; defaults OFF; user-toggleable from a panel
    appearance settings panel (post-RC).
```

### Pipeline notes

- Painted on the FACEPLATE layer, **above** the module body fill but **below** any control
  widgets — fasteners read as "in front of the metal, behind the knob" exactly like real gear.
- `ModuleNode.paintEvent` calls `FastenerV3.paint_at(p, corner_x, corner_y)` 4× as part of the
  base panel paint pass. No QWidget child needed unless DPI rounding artifacts appear.
- Wear toggle propagates from `ModuleNode.faceplate_wear` (new bool attr, default False);
  patch save/load adds one bool per module (negligible patch-data growth).

### Integration test plan

1. Mainline builds a new revision `syb_modular_ui_prototype_<next>.py`.
2. Add `FastenerV3` paint helper to one module (e.g. `add` — narrow 1Uw — exercises tier S).
3. Add to a wide module (e.g. `mixer_8` or `selector` at Uw ≥ 5) — exercises tier L.
4. py_compile + launch + visually compare against `demos/preview_engine_screws_rivets_phase45.py`
   at finish=STEEL, theme=STANDARD, wear=OFF (matches default render).
5. Toggle finish + theme — confirm specular peak scales correctly.
6. Toggle wear — confirm streaks appear, stable across redraws.
7. Section LOCKS when render matches preview at all 6 variants × 5 tiers across all
   3 finishes × 4 themes.

---

## §7 — Acceptance criteria

Section is LOCKED only when ALL of the following hold:

- ✅ All 6 variants render bauhaus-clean (round or hex silhouette; no oblong/taper/asymmetric features).
- ✅ Every tier (XS / S / M / L / XL) is legible at its canvas zoom — drive inset is identifiable
  at XS (4 px) for PHILLIPS, HEX_SOCKET, SLOT_HEAD; HEX_HEAD silhouette is clearly hexagonal at S+.
- ✅ Specular highlight survives all 3 finishes (STEEL / BLACK_ANODIZED / BRASS) — never
  invisible against BLACK_ANODIZED base; never washed out against BRASS rim.
- ✅ Specular intensity scales with BloomTheme (OFF / SUBTLE / STANDARD / CINEMATIC).
- ✅ Wear overlay is subtle (does not muddy the head outline) and deterministic per fastener
  (no churn on redraw).
- ✅ Fastener **never reads as a button or interactive control** — no obvious affordance
- ✅ Fastener **never renders with `#CC0000` family / sparse-accent red** — no interactive state vocabulary applies to fasteners (per §3), so the error/overload red used elsewhere never paints on a fastener regardless of host module state (constraint sweep, 2026-05-20)
  beyond panel hardware. (Sanity check during context preview review.)
- ✅ Phase 4.5 matrix demo (`demos/preview_engine_screws_rivets_phase45.py`) shows the full
  6 × 5 grid plus context preview plus STATE DEMO panel; py_compile clean.
- ⏳ Mainline `FastenerV3` integration revision built and verified against this preview.

---

## Cross-references

- `docs/ONESHOT_ELEMENT_WORKFLOW.md` — workflow contract
- `docs/RC1_DEEP_FREEZE.md` — RC-1 scope
- `docs/SLIDER_RECIPE_LOCK.md` — bevel/specular primitives reused
- `docs/KNOB_RECIPE_LOCK.md` — bevel-on-hex precedent
- `demos/preview_engine_screws_rivets_phase45.py` — Phase 4.5 final matrix (canonical paint source)
- `demos/bloom_theme.py` — BloomTheme dataclass + 4 presets
- Memory keys honoured: `project-bauhaus-symmetric-shape-rule`, `project-design-tier-vocabulary`,
  `feedback-realistic-light-physics`, `project-bloom-user-settings-buckets`,
  `feedback-larger-demo-icons`, `feedback-variant-reality-check`,
  `feedback-final-preview-all-variants`, `project-patchwerk-hybrid-palette`,
  `feedback-engine-preview-audit-checklist`, `feedback-each-element-starts-at-r1`.
