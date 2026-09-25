# Ports + Cables + Ferrules Recipe Lock — RC-1 MVP element (combined)

_Locked 2026-05-20 via the one-shot workflow (`docs/ONESHOT_ELEMENT_WORKFLOW.md`).
Three tightly-coupled physical-cable sub-elements, designed as one pass:_

- **(a) Jacks / ports** — canonical 3.5 mm TS panel jacks (the only jack type
  in RC-1 production scope; BNC / banana / TT / USB / DIN / optical FROZEN
  per `docs/RC1_DEEP_FREEZE.md`).
- **(b) Ferrules** — the cable-end terminations (moulded grommet, heat-shrink,
  or metal collar where the cable meets the connector body).
- **(c) Cables** — the patch-cable bodies running between two jacks.
  Signal-type semantic palette already locked 2026-05-08 — this pass is the
  **visual recipe for the cable body** itself, not a re-pick of colours.

Mainline lifts these primitives into `syb_core/widgets/jack.py` /
`syb_core/widgets/ferrule.py` / the existing mainline cable engine.

---

## TL;DR — the lock

| Component | Recipe |
|---|---|
| **Jack variants** | 3 — `CHROME_RING_STANDARD` · `BLACK_ANODIZED_RING` · `BRASS_RING_VINTAGE` (all 3.5 mm TS panel-mount) |
| **Ferrule variants** | 3 — `HEAT_SHRINK` · `MOULDED_BOOT` · `METAL_COLLAR` |
| **Cable body** | 1 recipe — stroke + 1 px outline shadow + optional CINEMATIC signal-active modulation; colour inherited from locked palette |
| **Cable palette** (NOT re-picked) | audio `#BFC4C8` · cv `#5A8A5A` · gate/trigger `#8A6A2A` · clock `#4A7A9A` · pitch `#8A4A8A` (per `project-patchwerk-cable-colours`, 2026-05-08) |
| **Bauhaus filter** | Jack = circle / ring · Ferrule = cylinder / rectangle · Cable = stroke. No oblong / asymmetric grip features. |
| **Tier sizes (jack outer Ø)** | XS = 6 px · S = 8 px · M = 10 px · L = 12 px · XL = 14 px (M = real 3.5 mm Switchcraft 35RAPC2BV3 at canvas zoom) |
| **Tier sizes (ferrule length)** | XS = 6 px · S = 8 px · M = 10 px · L = 12 px · XL = 14 px |
| **Tier sizes (cable stroke)** | XS = 1.6 px · S = 2.0 px · M = 2.5 px · L = 3.2 px · XL = 4.0 px (cable M = canonical 2.5 px from cable-palette lock) |
| **Production default** | jack M (10 px) · ferrule M (10 px) · cable M (2.5 px) |
| **States (jack-driven)** | idle · hover · patched · unpatched · signal-active · MIDI-mapped · MIDI-learning · disabled · error |
| **State propagation** | Cable + ferrule visuals are slaved to the connected jack states (ferrule rim picks up MIDI-mapped marker; cable brightens on signal-active) |
| **Finishes** | matte · semi-reflective · reflective (3-way live toggle) — Hybrid-Palette panel base |
| **Themes** | OFF · SUBTLE · STANDARD · CINEMATIC (4-way, via `BloomTheme`) |
| **Bend-radius rule** | Cable rendering enforces minimum bend radius per tier — zero-radius corners forbidden |
| **Port-label budget** | Every jack widget reserves a label band BELOW per `SIGNAGE_CORE_RECIPE_LOCK.md` lock-time amendment — `jack_outer_r + GAP_PX + label_h` |

---

## Canonical source file (lift target)

`demos/preview_engine_ports_cables_ferrules_phase45.py` — defines:

- `JACK_VARIANTS`, `FERRULE_VARIANTS` — variant id → metadata
- `JACK_TIER_PX`, `FERRULE_TIER_PX`, `CABLE_TIER_PX` — tier name → px
- `CABLE_PALETTE` — signal-type → QColor (canonical, locked 2026-05-08)
- `paint_jack(p, cx, cy, outer_r, variant, state, finish, theme, time_s)`
- `paint_ferrule(p, anchor, length_px, axis, variant, host_colour, state, finish, theme)`
- `paint_cable_segment(p, p0, p1, signal_kind, tier, signal_active, theme, time_s)`
- `port_label_anchor(jack_outer_r, jack_cy) -> (label_anchor_y, gap_px)` helper
  for label-band budgeting (matches `SIGNAGE_CORE_RECIPE_LOCK.md §4 layer 1`).

Suggested integration locations:

```
syb_core/widgets/jack.py        # JackV3 widget + paint_jack
syb_core/widgets/ferrule.py     # paint_ferrule helper (no widget needed)
syb_core/cable/cable_render.py  # cable bezier + signal-active modulator
```

---

## §1 Variants

Per `docs/ONESHOT_ELEMENT_WORKFLOW.md`, every variant slot logs ≥3 candidate
real-world references. Variant Reality Check applied at design + render time
per `feedback-variant-reality-check`.

### (a) Jacks — canonical 3.5 mm TS panel jack (the only jack in RC-1)

| ID | Variant | Real-world reference(s) |
|---|---|---|
| **`CHROME_RING_STANDARD`** | Bright chrome / nickel-plated outer ring, dark anodized inner throat. The Eurorack default — most modules ship with this. Cool-neutral specular highlight. | Switchcraft 35RAPC2BV3 (industry standard); Lumberg KLB 4 / KLBR 4; Doepfer A-100 default jack. |
| **`BLACK_ANODIZED_RING`** | Matte black anodized outer ring, near-black throat. Reads as a recessed dark circle on dark faceplate — premium module idiom. Specular peak narrower; cooler tint. | Make Noise (Maths / Wogglebug / DPO); Mutable Instruments (Plaits / Marbles); Pittsburgh Modular Black Hole. |
| **`BRASS_RING_VINTAGE`** | Warm brushed-brass outer ring, dark amber-tinted throat. Boutique / vintage idiom; pairs with `BRASS` fasteners. | Bastl Instruments (Kompas / Bestie); Folktek modular gear; vintage HiFi 1/8″ headphone jacks (Marantz consoles); Vintage Telefunken stage gear. |

Bauhaus filter: all three are perfectly circular concentric rings (outer ring +
inner throat), rotationally symmetric. No asymmetric grip nubs, no D-shaped
flats, no key-way features.

### (b) Ferrules — cable-end termination

| ID | Variant | Real-world reference(s) |
|---|---|---|
| **`HEAT_SHRINK`** | Glossy soft black shrink-wrap tubing immediately above the connector body. Shows fine horizontal ridge lines (the shrink-pattern). Picks up cable colour as a faint tint on the inside; outside reads near-black. | DIY Eurorack cable lots (Doepfer / Doepfer-spec'd cables); Tiptop Audio Stackcable factory ferrules; Tendrils / Pulplogic shrink-boot cables. |
| **`MOULDED_BOOT`** | Smooth injection-moulded plastic boot in the cable's signal-type colour. The boot reads as a stubby cylinder, slightly darker than the cable stroke but same hue. No surface texture. | Mogami Gold series (studio patch cables); Hosa CMM-series; vintage Roland System-100 patch leads; Marshall amp speaker cables. |
| **`METAL_COLLAR`** | Knurled chrome / black metal sleeve — 6–8 vertical knurl lines along the sleeve length giving a "grip" read. Premium tactile feel; faint specular along the top edge. | Neutrik NTP3RC-B TT / Bantam (metal-collar idiom transferred to 3.5 mm builds); Switchcraft 35HDBAU metal-collar; Pro-audio premium patch cables (Mogami W2549 builds with metal collars). |

Bauhaus filter: all three are cylinders (rectangle in 2D side-view at canvas
zoom), bilaterally symmetric along the cable axis. The knurl lines on
`METAL_COLLAR` are evenly distributed — symmetric rotationally as well.

### (c) Cables — body recipe (palette pre-locked)

Cables have **1 variant** — the body recipe. The signal-type palette is
inherited verbatim from `project-patchwerk-cable-colours` (locked 2026-05-08
via `demos/design_spec_point5_cables.py`). No re-pick this pass.

```
CABLE_PALETTE = {
    "audio":   "#BFC4C8",   # pale steel / cool off-white
    "cv":      "#5A8A5A",   # muted green
    "gate":    "#8A6A2A",   # dark brass (incl. trigger)
    "trigger": "#8A6A2A",   # alias
    "clock":   "#4A7A9A",   # steel blue
    "pitch":   "#8A4A8A",   # dark purple
}
```

The cable body itself:
- Stroke at signal-type colour, round-cap, 2.5 px M-tier default
- 1 px darker outline beneath (mix of stroke × 0.55) gives slight depth
- Catenary droop control-point y-offset = +60 (preserved from 2026-05-08 lock)
- Optional `signal-active` modulation: under CINEMATIC theme, stroke alpha
  breathes 0.85 → 1.00 at 0.4 Hz (matches modulated-label rate from signage)

No glow / no bloom on cables themselves — bloom is reserved for emissive
elements (LEDs, jack throats under `signal-active`).

---

## §2 Tier sizes

Independent px per sub-element, **shared XS/S/M/L/XL vocabulary** per
`project-design-tier-vocabulary`. Production canvas pixel scale.

### Jack outer-ring diameter (Ø)

| Tier | Outer Ø (px) | Inner-throat Ø (px) | Real-world equivalent | Use case |
|---|---|---|---|---|
| **XS** | 6 | 2 | Sub-miniature 2.5 mm jacks (dense breakout) | rarely seen in RC-1 |
| **S** | 8 | 3 | 1Uw narrow utility modules | `add`, `mult`, `logic` |
| **M** | 10 | 3.5 | **production default — 3.5 mm Switchcraft at canvas zoom** | most Eurorack modules |
| **L** | 12 | 4 | Premium / mixer modules | `mixer_8`, `selector` |
| **XL** | 14 | 5 | 1/4″ TS jack idiom | hero / scope panels |

Inner-throat Ø = outer Ø × 0.36 (approx ratio of real Switchcraft 35RAPC2BV3
inner barrel vs outer ring).

### Ferrule length

Length runs along cable axis; thickness across-axis is computed from cable
stroke tier (`thickness = cable_tier × 1.8 + 1.2 px`).

| Tier | Length (px) | Use case |
|---|---|---|
| **XS** | 6 | tight breakouts |
| **S** | 8 | 1Uw narrow modules |
| **M** | 10 | **production default** |
| **L** | 12 | premium / mixer modules |
| **XL** | 14 | scope / hero |

Pairing convention: ferrule tier follows the **host jack** tier (not the
cable tier) — a jack-M port gets a ferrule-M boot regardless of cable stroke.

### Cable stroke thickness

| Tier | Stroke (px) | Outline px | Use case |
|---|---|---|---|
| **XS** | 1.6 | 0.5 | sub-miniature breakouts |
| **S** | 2.0 | 0.7 | narrow utility |
| **M** | 2.5 | 1.0 | **production default** (matches 2026-05-08 canonical 2.5 px) |
| **L** | 3.2 | 1.0 | premium cables / TT-style |
| **XL** | 4.0 | 1.2 | hero / demo cables |

### Bend-radius rule

Minimum bend radius per tier — enforced by the catenary control-point pull
factor so cables never bottom out at a hard corner.

| Tier | min bend r (px) |
|---|---|
| XS | 8 |
| S | 10 |
| M | 14 |
| L | 18 |
| XL | 22 |

The catenary control-point y-offset (+60 from 2026-05-08) already produces
≥M-tier bend radius for the typical 200–600 px patch-cable span. Short jumpers
(< 80 px end-to-end) explicitly clamp the cp y-offset down to keep the
midpoint sag from creating a hairpin — see paint pseudocode §4.

### Port-label band budget

Per the lock-time amendment in `SIGNAGE_CORE_RECIPE_LOCK.md`, every jack
widget MUST reserve a vertical strip below the jack ring for the port label
(PL_CAPS_TIGHT). Mainline layout must budget the full footprint:

```
footprint_height = jack_outer_r + GAP_PX[port_label_tier] + label_font_height
```

Per tier (M jack → S port label one tier smaller per signage pairing rule):

| Jack tier | Port-label tier | GAP_PX | label_h px | Total footprint h above centre + below ring |
|---|---|---|---|---|
| XS | XS | 3 | 9 | 6 + 3 + 9 = 18 px from jack centre |
| S | XS | 3 | 9 | 7 + 3 + 9 = 19 px |
| M | S | 3 | 10 | 8 + 3 + 10 = 21 px |
| L | M | 4 | 11 | 10 + 4 + 11 = 25 px |
| XL | L | 4 | 13 | 12 + 4 + 13 = 29 px |

(label_h is the rendered font height incl. metrics; values above are typical
Inter Medium baselines at the listed tier px.) The mainline layout MUST
budget this strip; the jack widget never auto-shifts the label sideways or
above — see `SIGNAGE_CORE_RECIPE_LOCK.md §4 Port-label paint layers`.

---

## §3 State vocabulary

Jacks are the only **interactive host** in this triad. Cables and ferrules
have no states of their own — their visuals are derived from the connected
jack(s).

### Jack states (9)

| State | Trigger | Visual delta vs idle |
|---|---|---|
| **idle** | nothing patched, not hovered | base ring + throat per finish + theme; no glow |
| **hover** | pointer over jack ring | outer ring lifts to `lighter(110)`; specular peak × 1.15 |
| **patched** | a cable is plugged into this jack | faint warm inner-throat glow when theme ≥ STANDARD (point emitter); ferrule attached |
| **unpatched** | cable was just removed (transient) | flash 1×: throat brightens to `#FFC652` α 80 for 220 ms then settles to idle |
| **signal-active** | live audio/CV/gate flowing through this jack | inner throat emits at warm amber `#FFC652` α 120 STANDARD; brightness modulates with signal intensity (0.6 → 1.0); cable connected to this jack picks up the modulation |
| **MIDI-mapped** | mapped to an external MIDI CC / note | dashed `#E0A24E` ring 1 px outside the outer ring (matches signage MIDI-learning) |
| **MIDI-learning** | currently in learn mode | dashed `#E0A24E` ring breathes at 0.6 Hz; throat α drops to 0.5 of idle |
| **disabled** | parent module disabled / patch locked | outer ring + throat dim to α 90; cable+ferrule dim same |
| **error** | runtime error on this port | outer ring pulses red `#CC0000` at 1.5 Hz; throat stays dark |

Idle / hover / patched / unpatched / signal-active / MIDI-mapped /
MIDI-learning / disabled / error matches the canonical state vocabulary
(`project-state-vocabulary`) with one addition (`unpatched` transient flash
specific to patch interactions).

### Cable state slaving

Cable visuals are derived from the **two connected jacks** at draw time:

- If either jack is `signal-active` → cable enters `signal-active` mode
  (stroke alpha breathes 0.85 → 1.0 at 0.4 Hz under CINEMATIC; static at
  peak under STANDARD/SUBTLE/OFF).
- If either jack is `disabled` → cable dims to α 90.
- If either jack is `MIDI-learning` → cable stroke breathes at 0.6 Hz
  (matches learning rate).
- If either jack is `error` → cable shifts to `#CC0000` α 200 pulsing at
  1.5 Hz, overriding signal-type palette (this is the ONLY case where red
  appears on a cable — error is the cross-cutting sparse-red rule, per
  `project-patchwerk-accent-sparse`).
- Otherwise → cable uses `idle` palette colour at full alpha.

### Ferrule state slaving

Ferrules inherit the **host jack** state for their rim accent:

- Host jack `MIDI-mapped` → ferrule rim picks up dashed `#E0A24E` 1 px ring
  along the boot's panel-facing edge.
- Host jack `error` → ferrule body darkens; metal collar specular drops to 0.
- Host jack `disabled` → ferrule body dims with the cable.
- Other states → ferrule renders idle (boot in cable colour, metal collar
  in finish palette).

The ferrule body colour is set by the **cable's** signal-type palette for
`MOULDED_BOOT`; `HEAT_SHRINK` and `METAL_COLLAR` are colour-neutral.

---

## §4 Recipe — paint layers per sub-element

### Hybrid palette + canvas refs

```
HYBRID_CANVAS = #0F0F12
HYBRID_BODY   = #1E2024
HYBRID_BEVEL_HI = #525458
HYBRID_BEVEL_LO = #4A4C50
```

### Jack — paint layers (back→front, 7 layers)

```
1. Panel cutout shadow:
   Soft ellipse, outer_r × 1.15 wide × outer_r × 0.30 tall,
   centred on (cx, cy + outer_r × 0.18), fill #000 α 90 STANDARD
   (α scales with theme.idle_led_peak × 2.5).
   Reads as "the panel has a hole here".

2. Outer ring base:
   Radial gradient ring outer_r → outer_r × 0.55, using finish palette
   (CHROME: rim #C0C2C6 → mid #7A7C82 → deep #3A3C42).
   For BLACK_ANODIZED: rim #48484C → mid #2A2A2E → deep #0E0E10.
   For BRASS_RING_VINTAGE: rim #E0C078 → mid #A88838 → deep #5C4818.

3. Bevel ring:
   Top/left arc highlight #FFFFFF α 130 (110° arc starting at 90°);
   bottom/right arc shadow #000000 α 160 (110° arc starting at -90°).
   Width = max(1, outer_r × 0.12). Same primitive as fastener bevel.

4. Inner throat dark fill:
   Solid ellipse at inner_r = outer_r × 0.36, fill = #050608.
   Always darker than the ring's deepest finish colour.

5. Throat depth gradient:
   Subtle radial gradient inside the throat — centre 0.4 × inner_r alpha 0,
   edge inner_r alpha 80 (#000). Gives the cone-shaped recess illusion
   when read against the dark fill.

6. CINEMATIC throat glow (state ∈ {patched, signal-active} AND theme ≥ STANDARD):
   Warm amber point-emitter at the throat centre — radial gradient
   centre #FFC652 α (state.glow_alpha × theme.active_peak / 255), falling
   to α 0 at outer_r × 0.5. Modelled as a POINT emitter per
   feedback-realistic-light-physics (jacks are tiny apertures, not strips).
   Under STANDARD: alpha multiplier = 0.55. Under CINEMATIC: 1.0.
   Under SUBTLE / OFF: skip entirely. signal-active mode adds the 0.4 Hz
   breath (alpha × (0.6 + 0.4 × sin(2π × 0.4 × t))).

7. State overlay (drawn last):
   - HOVER:           re-paint layer 2 with rim → lighter(110); no extra ring.
   - PATCHED:         no overlay (layer 6 carries the visual).
   - UNPATCHED:       transient amber flash (220 ms decay) over throat.
   - SIGNAL-ACTIVE:   no overlay (layer 6 modulates).
   - MIDI-MAPPED:     1 px dashed ring at radius outer_r + 1.5,
                      pen = QPen(#E0A24E, 1, DashLine, RoundCap), dash 3-2.
   - MIDI-LEARNING:   same dashed ring, alpha breathes 130 → 240 at 0.6 Hz;
                      throat alpha × 0.5.
   - DISABLED:        flatten ring + throat to α 90 (post-multiply).
   - ERROR:           outer ring stroke #CC0000 width 1.5 px at α 200,
                      pulsing at 1.5 Hz (per signage error rate).
```

### Ferrule — paint layers (back→front, 4 layers)

A ferrule renders as an axis-aligned rectangle (cylinder side-view) sitting
between the jack outer ring's panel-facing edge and the cable's first
control point. Coords given assume vertical cable (axis = down); rotate
painter for off-axis cables.

```
1. Body base:
   Filled rectangle (length × thickness) with rounded corners radius =
   thickness × 0.25. Fill depends on variant:
   - HEAT_SHRINK: linear gradient top #1A1A1A → bottom #0C0C0E (near-black
     glossy); 1 px inside the rect, paint a 2-stop ridge pattern — 1 px
     dark line every 1.4 px along the long axis, alpha 90 (gives shrink
     ridge read).
   - MOULDED_BOOT: solid fill = cable signal-type colour shifted toward
     deep (cable_col.darker(160)); no surface texture.
   - METAL_COLLAR: linear gradient finish palette
     (STEEL rim → mid → rim again across the short axis, top-down) — the
     "mid" stripe sits centred and produces the cylinder-curvature read.

2. Surface detail:
   - HEAT_SHRINK: skip — ridges painted in layer 1.
   - MOULDED_BOOT: skip — smooth surface.
   - METAL_COLLAR: 6 evenly-spaced vertical knurl lines along the
     ferrule length, pen #2A2A2A α 200, width 0.6 px. Knurl spacing =
     thickness / 6. Bauhaus-compliant — perfectly symmetric, rotationally
     even.

3. Top bevel (panel-facing edge):
   1 px highlight along the top edge (jack side) #FFFFFF α 130;
   1 px shadow along the bottom edge (cable side) #000 α 180.
   Gives the boot a "sits proud of the panel" read.

4. State overlay:
   - host_jack.MIDI-MAPPED:
       1 px dashed accent #E0A24E along the panel-facing edge of the boot
       (the top edge), dashed 2-1. Picks up the host marker.
   - host_jack.ERROR:
       darken body by 25 % (post-multiply alpha 0.75); on METAL_COLLAR
       drop specular to 0.
   - host_jack.DISABLED:
       flatten body + bevel to α 90.
   - Otherwise: no overlay.
```

### Cable — paint layers (back→front, 4 layers)

Cable is a cubic Bezier path drawn between two jack centres with a
catenary-droop control point set. Stroked twice — outline first, then
main stroke on top.

```
1. Catenary geometry:
   p0 = jack_a_centre + (axis_unit) × (outer_r + ferrule_length + 1)
   p3 = jack_b_centre + (axis_unit_b) × (outer_r + ferrule_length + 1)
   midpoint m = (p0 + p3) / 2
   span_xy = (p3 - p0)
   span_len = |span_xy|
   cp_y = +60 px (default catenary sag), clamped to:
       cp_y_clamped = min(cp_y, span_len * 0.45 - min_bend_r[tier])
       (prevents hairpin sag on short jumpers)
   cp1 = (p0.x + span_xy.x * 0.30, p0.y + cp_y_clamped)
   cp2 = (p3.x - span_xy.x * 0.30, p3.y + cp_y_clamped)

2. Outline stroke (darker, drawn first):
   Stroke colour = signal_palette_col.darker(190) (or × 0.55 mix toward black)
   Pen width = cable_tier_px + 2 * outline_px
   Cap = RoundCap, join = RoundJoin
   Alpha = state-derived (idle 220; disabled 90; error 200).

3. Main stroke (signal colour on top):
   Stroke colour = signal_palette_col (per signal_kind)
   Pen width = cable_tier_px
   Cap = RoundCap, join = RoundJoin
   ERROR override: stroke colour = #CC0000 with 1.5 Hz pulse over alpha
       180 → 220 (per signage error rate).

4. Signal-active modulation (CINEMATIC theme + signal-active state ONLY):
   Recompute layer-3 alpha = base × (0.85 + 0.15 × sin(2π × 0.4 × t))
   No additional bloom is painted on the cable itself — bloom is reserved
   for the JACK throat layer 6 (where the light actually emits in real
   gear); the cable simply communicates the modulation by its own alpha.
```

### BloomTheme reactivity summary

| Theme | Jack idle layer-1 shadow α | Jack throat layer-6 glow | Cable signal-active modulation |
|---|---|---|---|
| OFF | 30 | OFF | static at peak |
| SUBTLE | 50 | only when state=signal-active (0.6× CINEMATIC) | breath 0.95 → 1.0 |
| STANDARD | 90 | patched / signal-active (0.55× CINEMATIC) | breath 0.9 → 1.0 |
| CINEMATIC | 120 | full strength | breath 0.85 → 1.0 |

Reflective finish multipliers from `BloomTheme.{semi,full}_refl_*` apply to
the layer-6 throat glow only (cables and ferrules do not bloom).

---

## §5 Variant rationale — long-list considered + drops

### Jacks — considered

| Candidate | Status | Reason |
|---|---|---|
| `CHROME_RING_STANDARD` | LOCKED | Eurorack default; widest real-world precedent (Switchcraft 35RAPC2BV3 is the canonical part). |
| `BLACK_ANODIZED_RING` | LOCKED | Premium dark-module idiom; Make Noise / Mutable convention. |
| `BRASS_RING_VINTAGE` | LOCKED | Boutique / vintage idiom; Bastl / Folktek convention. |
| GOLD-PLATED RING | DROPPED | Palette clash with `project-patchwerk-hybrid-palette` — gold reads too warm against `#0F0F12` canvas. Brass already covers the warm-finish slot. |
| BNC | FROZEN | Post-RC; in `docs/RC1_DEEP_FREEZE.md`. |
| BANANA | FROZEN | Post-RC. |
| TT / BANTAM | FROZEN | Post-RC. |
| USB-C | FROZEN | Post-RC; not a signal-routing jack. |
| DIN-5 / DIN-7 | FROZEN | Post-RC. |
| OPTICAL TOSLINK | FROZEN | Post-RC. |
| D-flat / key-way 3.5 mm | DROPPED | Asymmetric — violates `project-bauhaus-symmetric-shape-rule`. Real (some military-spec jacks have these) but breaks the rotational-symmetry rule. |
| Jack with integrated LED ring | DROPPED | Conflicts with the LED element pass (LEDs are their own element); creates a parsing ambiguity ("is this an LED or a jack?"). |
| Square / rectangular jack housing | DROPPED | Not a real-world 3.5 mm convention; rectangular bezels are 1/4″ TS panel idiom — out of scope. |

### Ferrules — considered

| Candidate | Status | Reason |
|---|---|---|
| `HEAT_SHRINK` | LOCKED | DIY Eurorack default; cheapest production; ubiquitous on Tiptop Stackcables. |
| `MOULDED_BOOT` | LOCKED | Pro-audio / Mogami convention; takes signal-type colour cleanly. |
| `METAL_COLLAR` | LOCKED | Premium / Neutrik convention; pairs with `METAL_COLLAR` finish on hero modules. |
| Tapered moulded boot (wide at jack, narrow at cable) | DROPPED | Asymmetric along cable axis — violates Bauhaus rule. Real (Hosa CMM uses this) but the taper reads as "cheap consumer cable" at canvas zoom. |
| Strain-relief spring (vintage Roland) | DROPPED | Visually ambiguous — the spring coils read as a pattern that fights cable rendering. Surface only if vintage Roland aesthetic explicitly requested post-RC. |
| Bare connector (no ferrule at all) | DROPPED | Looks unfinished / broken at canvas zoom; cables always show a termination in real gear. |
| Coloured shrink wrap (red / blue per signal kind) | DROPPED | Conflicts with sparse-accent rule; signal-type colour already lives on the cable, not the ferrule. |
| Knurled rubber boot | DROPPED | Knurled-rubber idiom from XLR connectors; doesn't match 3.5 mm panel-jack reality. |
| Hex-shaped ferrule | DROPPED | Hex doesn't exist on real ferrules; would violate Variant Reality Check. |

### Cables — considered

Cable visuals are already locked (2026-05-08). This pass only re-confirms.

| Candidate | Status | Reason |
|---|---|---|
| Hybrid C+D signal-type palette | LOCKED 2026-05-08 | Decision at `demos/design_spec_point5_cables.py`. |
| Cable bloom / glow halo around stroke | DROPPED 2026-05-08 | "No glow, no bloom" — per `project-patchwerk-cable-colours`. Bloom is jack-throat-only. |
| Twisted-pair appearance (two parallel strokes) | DROPPED | Read as "broken / split cable" at canvas zoom. |
| Dashed insulation pattern | DROPPED | Decorative; conflicts with simplistic Bauhaus aesthetic. |
| Red accent on any cable | DROPPED | `project-patchwerk-accent-sparse` — red is error-only across the entire app. |

### Cross-cutting drops

- **Patched LED on jack body** — confused with the LED element pass; the
  throat glow (layer 6) already communicates patched/signal-active. Adding a
  separate LED creates two redundant indicators.
- **Animated cable "data-flowing-from-A-to-B" particle** — too busy; would
  add visual chaos with 20+ cables on a patch.
- **Per-channel cable thickness variation within same patch** — would imply
  signal level (audio vs CV); the colour already communicates signal kind,
  no need to encode level.

---

## §6 Integration plan — what mainline must do

### Target widget classes / paint helpers

```
syb_core/widgets/jack.py
    class JackV3(QWidget)
        __init__(variant, tier, signal_kind, side="below"_locked, parent=None)
        # paints layers 1-7 + emits hover_enter / clicked / patched signals
    def paint_jack(painter, cx, cy, outer_r, variant, state, finish, theme,
                   time_s=0.0, midi_mapped=False)

syb_core/widgets/ferrule.py
    # Stateless paint helper — no QWidget needed (one ferrule per cable end is
    # too cheap to wrap in a widget; called from the cable engine paint pass).
    def paint_ferrule(painter, attach_pt, axis_deg, length_px, thickness_px,
                      variant, host_colour, host_jack_state, finish, theme)

syb_core/cable/cable_render.py
    # Replaces the existing inline cable paint code in mainline ModuleNode /
    # CableEngine. Wraps the layered paint pipeline above.
    def paint_cable_segment(painter, p0, p3, signal_kind, tier,
                            jack_a_state, jack_b_state, theme, time_s=0.0)
    def cable_palette_for(signal_kind: str) -> QColor
    def min_bend_radius_for(tier: str) -> float
```

### Primitives reused

- **Bevel ring + radial-gradient finish base** — same primitive as
  `paint_fastener` layer 2 + 4 (`docs/SCREWS_RIVETS_RECIPE_LOCK.md §4`).
  Lift directly.
- **Specular dot** — same primitive as fastener layer 5. The jack's outer
  ring uses a smaller specular dot (radius outer_r × 0.18, not the
  fastener's full r × 0.45) to read as a slim ring rather than a head.
- **State pulse alpha formula** — `0.65 + 0.35 × sin(2π × 1.5 × t)` for
  error; `0.7 + 0.3 × sin(2π × 0.6 × t)` for learning; `0.85 + 0.15 × sin(2π
  × 0.4 × t)` for signal-active. Identical formulae to
  `SIGNAGE_CORE_RECIPE_LOCK.md §4 layer 5`.
- **BloomTheme** — read `idle_led_peak`, `active_peak`, `learning_peak`,
  `error_peak` from `demos/bloom_theme.py`. Consume the same
  `DEFAULT_THEME` the rest of the design language uses.
- **Cubic Bezier catenary** — keep the existing mainline cable engine's
  Bezier path; only the stroke styling + colour resolution moves to
  `cable_render.py`. The catenary control-point math is preserved.

### New primitives needed

1. `paint_jack_throat_glow(p, cx, cy, inner_r, color, peak, theme)` —
   layer 6 above; point-emitter radial gradient.
2. `cable_palette_for(signal_kind)` — dict lookup with `audio` fallback.
3. `min_bend_radius_for(tier)` — table lookup.
4. `port_label_anchor(jack_outer_r, jack_cy, port_label_tier)` — returns
   `(label_anchor_y, gap_px)` so layout can position the label correctly
   per `SIGNAGE_CORE_RECIPE_LOCK.md` lock-time amendment.

### Footprint contract for layout

`JackV3` reports its full footprint (jack + reserved label band below) via
`sizeHint()`. Mainline layout code MUST respect the full hint — never crop
the label band, never overlap with the next row. This is the contract that
honours the signage lock-time amendment.

### Pipeline differences (jack vs other elements)

- Jacks are **interactive** (mouse events: hover, click, patch start/end);
  ferrules and cables are **passive** (paint-only).
- Mainline's `CableEngine` is the single owner of cable rendering. The
  recipe-lock doc does NOT add a separate cable widget — it documents the
  visual contract the engine must satisfy.
- `JackV3.paintEvent` is the only place where layer 6 (throat glow) runs.
  The cable engine does NOT paint cable glow; only the jack does, at the
  cable's endpoints.

### Refactor steps

1. Create `syb_core/widgets/jack.py` + `syb_core/widgets/ferrule.py` +
   `syb_core/cable/cable_render.py`, copying the canonical functions from
   `demos/preview_engine_ports_cables_ferrules_phase45.py`.
2. Replace the existing inline jack paint in `ModuleNode._paint_ports` with
   `JackV3` widget instances (or `paint_jack(...)` calls if widget overhead
   is too high for the 6-port-per-module density).
3. Replace the existing cable-engine stroke code with `paint_cable_segment`.
4. Add `signal_kind` resolution: read the source port's `signal_kind` on
   patch establish; cache on the Cable instance. (`signal_kind` already
   exists on the port spec — no new field needed.)
5. Add a `host_jack_state` lookup in `CableEngine.paint` — for each
   endpoint, resolve the connected jack's state and pass through to
   `paint_cable_segment` so the cable can derive its modulation.
6. Wire `JackV3.midi_mapped_signal` to the existing MIDI-mapping pathway.
7. Add the label-band budget call: layout code computes the row height
   using `jack.sizeHint()` instead of just `jack_outer_r`.
8. `py_compile` clean. Build a mainline revision. Verify against the
   matrix.

### Mainline revision integration test

1. Build new revision `syb_modular_ui_prototype_<next>.py` with the three
   new modules lifted.
2. Apply to **3 representative modules**:
   - `vco` (4 ports, mix of audio/cv) — exercises CHROME jack + audio +
     pitch cable colours
   - `mixer_8` (8 audio in, 2 audio out) — exercises high port density at
     L tier
   - `buttplug_linear_out` (3 ports) — exercises long port labels under
     reserved band
3. Launch, visually compare each module's jacks against the corresponding
   matrix cell. Diff acceptable: minor pixel anti-aliasing differences.
   NOT acceptable: missing variants, wrong tier sizes, wrong colours, label
   overlap with jack ring.
4. Test interaction states:
   - Hover a jack → outer ring lifts (HOVER state).
   - Patch a cable → throat glow appears (PATCHED).
   - Send live signal through the patch → throat + cable breathe
     (SIGNAL-ACTIVE).
   - Right-click to MIDI-learn → dashed amber ring on jack; cable
     stroke breathes at 0.6 Hz.
   - Force port error (debug shortcut) → ring pulses red at 1.5 Hz; cable
     turns red.
   - Disable module → all jacks + connected cables dim to α 90.
5. If pass → section LOCKED. Update memory
   `feedback-integration-plan-documented-tested` status board.

---

## §7 Acceptance criteria

Section is **preview-LOCKED** when ALL of the following hold:

- ✅ All 3 jack variants render bauhaus-clean (circle + ring silhouette; no
  asymmetric features).
- ✅ All 3 ferrule variants render bauhaus-clean (cylinder / rectangle
  silhouette, bilaterally symmetric along cable axis).
- ✅ Tier sizes match Eurorack panel-jack reality at canvas zoom — jack-M
  (10 px) reads as a real 3.5 mm Switchcraft at typical canvas zoom.
- ✅ Cable rendering enforces minimum bend radius per tier — no zero-radius
  corners visible at any span length in the cable bench.
- ✅ Ferrule never reads as part of the jack ring — the visual seam between
  jack outer ring and ferrule body is always discernible at M tier and up.
- ✅ Port-label band is RESERVED + RENDERED below every jack matrix cell
  per the signage lock-time amendment — label never overlaps ring, gap
  per tier honoured.
- ✅ Phase 4.5 matrix demo (`demos/preview_engine_ports_cables_ferrules_phase45.py`)
  renders ALL jack variants × ALL tiers × ALL jack states × ALL finishes ×
  ALL themes with no skipped slots; ALL ferrule variants × ALL tiers ×
  applicable states × ALL finishes × ALL themes with no skipped slots; cable
  bench shows ALL 5 signal-type colours at S/M/L tiers with start/end
  ferrules and signal-active modulation toggle live.
- ✅ Every jack cell includes the locked PL_CAPS_TIGHT port label below it.
- ✅ Variant Reality Check — every variant cites ≥3 real-world references
  (jacks + ferrules); cable palette references the 2026-05-08 lock.
- ✅ Bauhaus filter — round / cylinder / rectangle / stroke only; no
  asymmetric grip nubs, tapers, key-ways, or notches.
- ✅ Sparse-red rule — red `#CC0000` appears ONLY in error state, on
  jack ring + cable stroke.
- ✅ +35% sized cells per `feedback-larger-demo-icons`.

Section is **INTEGRATION-LOCKED** only when:

- ⏳ `syb_core/widgets/jack.py` + `syb_core/widgets/ferrule.py` +
  `syb_core/cable/cable_render.py` exist and contain the lifted primitives.
- ⏳ Mainline revision built, launched, visually verified against the matrix
  on the three representative modules (`vco`, `mixer_8`,
  `buttplug_linear_out`).

Currently the integration step is pending — this recipe-lock + Phase 4.5
matrix unblock mainline to start the integration revision.

---

## Cross-references

- `docs/ONESHOT_ELEMENT_WORKFLOW.md` — workflow contract
- `docs/RC1_DEEP_FREEZE.md` — RC-1 scope; freezes BNC/banana/TT/USB/DIN/optical
- `docs/SIGNAGE_CORE_RECIPE_LOCK.md` — port-label PL_CAPS_TIGHT anchor amendment
- `docs/SCREWS_RIVETS_RECIPE_LOCK.md` — bevel + finish primitives reused
- `docs/SLIDER_RECIPE_LOCK.md` — bevel + specular conventions
- `demos/preview_engine_ports_cables_ferrules_phase45.py` — Phase 4.5 final matrix (canonical paint source)
- `demos/bloom_theme.py` — BloomTheme dataclass + 4 presets
- Memory keys honoured:
  `project-bauhaus-symmetric-shape-rule`,
  `project-design-tier-vocabulary`,
  `project-state-vocabulary`,
  `feedback-realistic-light-physics`,
  `project-bloom-user-settings-buckets`,
  `feedback-larger-demo-icons`,
  `feedback-variant-reality-check`,
  `feedback-final-preview-all-variants`,
  `project-patchwerk-hybrid-palette`,
  `project-patchwerk-accent-sparse`,
  `project-patchwerk-cable-colours` (palette already locked 2026-05-08),
  `feedback-engine-preview-audit-checklist`,
  `feedback-each-element-starts-at-r1` (jack variants from clean slate; cable colours pre-inherited).

---

## What's NEW vs what's CANONICAL

| Item | Source |
|---|---|
| 3 locked jack variants + tier set | NEW — this lock |
| 3 locked ferrule variants + tier set | NEW — this lock |
| Cable body recipe (paint pseudocode) | NEW — this lock (palette pre-canonical) |
| Jack-state vocabulary (9 states) | NEW — this lock |
| Cable + ferrule state-slaving model | NEW — this lock |
| Min-bend-radius table per tier | NEW — this lock |
| Port-label band budget contract | NEW — this lock (resolves signage amendment) |
| Cable signal-type palette | CANONICAL (`project-patchwerk-cable-colours`, 2026-05-08) |
| Hybrid palette body / canvas colours | CANONICAL (`project-patchwerk-hybrid-palette`) |
| Sparse-red accent rule | CANONICAL (`project-patchwerk-accent-sparse`, 2026-05-08) |
| State pulse alpha formulae (0.6 / 0.4 / 1.5 Hz) | CANONICAL (matches `SIGNAGE_CORE_RECIPE_LOCK.md`, `LED_RECIPE_LOCK.md`) |
| Bevel + radial-gradient finish primitives | CANONICAL (lifted from `SCREWS_RIVETS_RECIPE_LOCK.md`) |
| BloomTheme reflectivity multipliers | CANONICAL (`demos/bloom_theme.py`) |
