# Slide Switch Recipe Lock — Section 5 of the design-language spec

_Locked 2026-05-20 via the one-shot RC-1 workflow (`docs/ONESHOT_ELEMENT_WORKFLOW.md`).
This is the canonical implementation spec for the slide-switch element across all
PATCHWERK / SYB Live Cable modules. Mainline lifts these primitives verbatim when
building `SlideSwitchV3` and any future linear-action selector widget._

---

## TL;DR — the lock

| Component | Recipe |
|---|---|
| **Sub-types (3 variants)** | SL1 Square bat · SL2 Rectangle ridged bat · SL3 Wide paddle |
| **Tier set (XS/S/M/L/XL)** | Handle 8×10 / 11×14 / 14×18 / 18×24 / 24×32 px (W×H along motion axis × across) |
| **Throw lengths** | 18 / 26 / 36 / 50 / 72 px (M = default) |
| **Detent pitch (3-pos baseline)** | 9 / 13 / 18 / 25 / 36 px between adjacent detents |
| **Position counts supported** | 2-pos · 3-pos · 5-pos (multi); production widget configurable |
| **State vocabulary (selector subset)** | 8 states — idle / hover / active-grabbed / MIDI-mapped / MIDI-learning / automated / disabled / error (no MODULATED — slide switches are discrete) |
| **Bloom geometry** | Underline glow beneath active position (linear) — `_additive_halo_linear` consumed via aspect-1:1.4; handle itself non-emissive |
| **Indicator strategy** | Coloured underline dot/bar BENEATH active detent position (faceplate silkscreen) — handle body is mechanical, not lit |
| **Symmetric scale rule** | Outside detent ticks count matches positions exactly (2-pos = 2 ticks, 3-pos = 3 with middle centred, etc.); ticks symmetric around throw centre |
| **Animation rates** | LEARN 2.5 Hz · AUTO 0.3 Hz · ERROR 1.5 Hz (no MOD — discrete element) |
| **Reflectivity / finish** | matte 0.0 · semi 0.5 · reflective 1.0 — same step convention as buttons + sliders |
| **Bloom theme presets** | OFF / SUBTLE / STANDARD / CINEMATIC (`bloom_theme.py`) — consumed for underline glow + faceplate-finish reflection |

---

## §1 Variants — 3 silhouette families

All silhouettes are bauhaus-symmetric primitives (square + rectangle only — no oblongs,
no tapers, no asymmetric finger-rests). Every variant cites ≥1 real-world reference per
`feedback_variant_reality_check`.

### SL1 — Square bat slide (compact)

**Use case:** dense per-module mode selectors; 2-pos on/off; tight signal-path modules
that can't spare horizontal real estate for a wide paddle. Workhorse for utility modules.

- **Silhouette:** Square handle (1:1 aspect) on horizontal slot — handle moves along the
  longer slot dimension.
- **Real-world references:**
  - **C&K JS-series** — sub-mini square slide switch (pcb-mount industrial).
  - **Apple iPhone mute switch** — square-cap micro slide on modern devices.
  - **Mutable Plaits "model" source switch** — Eurorack synth peer (square silver tab).

### SL2 — Rectangle ridged bat slide (default workhorse)

**Use case:** standard 2-pos / 3-pos mode selector on Eurorack-style modules; the
slide-switch DEFAULT when no specific constraint applies. Visible from arm's reach.

- **Silhouette:** Tall rectangle (h ≈ 1.3× w) on horizontal slot, with 3 horizontal ridge
  grooves across the face for grip texture. Rectangle is upright (long axis perpendicular
  to motion). Ridges are symmetric horizontal lines, not chevrons.
- **Real-world references:**
  - **C&K SS-12 / SS-22-series** — mil-spec PCB slide (rectangular bat with horizontal
    ridges; the canonical reference for industrial slide switches).
  - **TR-808 power/mode slide** — vintage drum machine selector with ridged rectangular
    fingertip slide.
  - **Schurter SLS-series** — panel-mount slide switch with ridged actuator.

### SL3 — Wide rectangle paddle slide (low-profile)

**Use case:** prominent mode banks (5-pos source selectors, waveform pickers) where the
position count matters at-a-glance; faceplate hero element on a synth module. Reads as
"this control is intentional" rather than an afterthought.

- **Silhouette:** Wide rectangle (w ≈ 1.6× h) on horizontal slot, with a single deep
  centre groove running along the motion axis. The groove is symmetric (centred), not a
  taper or chevron. Low profile (height < width) — sits closer to the faceplate.
- **Real-world references:**
  - **Roland Juno-60 / Juno-106 BANK selector** — wide low paddle slide with central
    groove (vintage synth canonical).
  - **Korg MS-20 mode slide** — wide rectangular paddle slide for filter mode selection.
  - **Schurter SLP-series** — pro-audio panel slide with low-profile paddle actuator.

---

## §2 Tier sizes — independent handle and throw axes (amended 2026-05-20 per user lock-time directive)

Slide switch dimensions are per-element; they share the canonical 5-tier vocabulary
(`project_design_tier_vocabulary`) but have independent px values. **Crucially, handle
size and throw length are INDEPENDENT axes** — production widget takes both as separate
tier parameters. This unbundles the worst case of a slim handle needing a long throw
(e.g. an 8-position bank selector with an XS handle for vertical fit) — see §2.3.

Widget API: `SlideSwitchV3(variant, handle_tier, throw_tier, n_positions, ...)`.

### §2.1 Handle tier — visual presence of the actuator

Sets fingertip target + visual mass. Independent of throw.

| Handle tier | Handle W × H (SL2 default ratio) | Use case | Real-world reference |
|---|---|---|---|
| **XS** | 8 × 10 px | Ultra-dense per-module mode arrays | Sub-miniature PCB slide (C&K JS-1024) |
| **S**  | 11 × 14 px | Compact mode tab; 1–2 Uw modules | Mutable Plaits source-switch class; volca mode tab |
| **M**  | 14 × 18 px | **DEFAULT** — standard 2/3-pos mode | Eurorack standard panel slide (C&K SS-12) |
| **L**  | 18 × 24 px | Prominent module-level bank/mode selector | Roland Juno BANK selector handle size |
| **XL** | 24 × 32 px | Hero faceplate selector | Korg MS-20 mode slide handle size |

**Variant aspect overrides (unchanged from R1):**
- **SL1 (square):** all tiers use 1:1 — `handle_h = handle_w` (takes the W column, ignores H).
- **SL2 (ridged rectangle bat) ← LOCKED PRODUCTION DEFAULT:** uses W × H as listed (tall rectangle, ridges horizontal across face).
- **SL3 (wide paddle):** inverted aspect — `handle_w = H × 1.0`, `handle_h = W × 0.95` (wide-and-low, same nominal area).

### §2.2 Throw tier — slot travel length

Sets the slot length the handle traverses end-to-end. Drives detent pitch via
`pitch = throw / (n_positions − 1)`. Independent of handle tier.

| Throw tier | Throw length | Max readable N (pitch ≥ 10 px) | Use case |
|---|---|---|---|
| **XS** | 18 px | N=2–3 | Tight slot — only 2-pos / 3-pos switches |
| **S**  | 26 px | N=2–4 | Compact 2–4 position selector |
| **M**  | 36 px | N=2–5 | **DEFAULT** — Eurorack standard 3-pos |
| **L**  | 50 px | N=2–6 | Bank selector up to 6-pos |
| **XL** | 72 px | N=2–8 | High-N bank selector / waveform picker (full 8-pos support) |

**Slot footprint formula (production):** `slot_length = throw + handle_w + 2 × end_margin (4 px)`.
Mainline layout uses this to compute horizontal Uw budget regardless of handle/throw mix.

### §2.3 Legality + auto-bump rule (lock-time amendment 2026-05-20)

`SlideSwitchV3.__init__` enforces this invariant at construction time:

```
pitch = throw_px / (n_positions − 1)
assert pitch >= 10, "detent pitch < 10 px is illegal — readability fails"
```

If a caller passes `(handle_tier=XS, throw_tier=S, n_positions=8)` (pitch ≈ 3.7 px), the
widget **auto-bumps `throw_tier` to the smallest legal value** (here: XL → pitch ≈ 10.3 px)
and emits a one-line `qWarning()` so layout code can see the bump. Handle tier never bumps —
the caller's visual choice is preserved.

This unblocks the "slim slider, 8 positions" worst case:
- `handle_tier=XS, throw_tier=XL, n_positions=8` → visually compact handle, long horizontal slot,
  pitch ≈ 10.3 px, fully legal and renderable.

Symmetric scale rule (`project_symmetric_scale_rule`) applies — outside tick count matches
`n_positions` exactly, symmetric around throw centre, regardless of handle/throw tier mix.

### §2.4 Tier-selection guidance (production)

| Scenario | handle_tier | throw_tier | N |
|---|---|---|---|
| Dense per-module utility on/off | S | S | 2 |
| Standard 3-pos mode (default) | M | M | 3 |
| 5-pos VCO waveform picker | L | L | 5 |
| 8-pos bank selector on hero module | M | XL | 8 |
| Slim 8-pos in tight Uw budget | XS | XL | 8 |
| 4-pos on 1Uw narrow module | S | M | 4 |

### XS-tier simplification (per the buttons-recipe audit precedent)

At XS tier detail collapses sub-pixel:
| Variant | XS-tier simplification |
|---|---|
| SL1 | drop bevel emboss inner; keep collar + cap + outline + specular dot only |
| SL2 | drop horizontal ridge grooves (handle paints as plain rectangle bat) |
| SL3 | drop centre groove (paints as plain wide rectangle) |

Simplifications kick in automatically in `SlideSwitchV3` paint dispatcher when
`tier == "XS"`.

---

## §3 State vocabulary — 8 states (slide switch subset)

Per `project_state_vocabulary` — slide switches DROP `modulated` (no continuous CV
target — positions are discrete) but keep all other canonical states. `automated` IS
applicable: an external automation lane can drive position changes over time.

| State | Visual cue | Animation |
|---|---|---|
| IDLE | Handle neutral greyscale; underline-dot under active position dim K_IND | static |
| HOVER | Faint K_IND rim halo around handle silhouette | static |
| ACTIVE-GRABBED | Handle palette switches to Deep amber (palette[5]); underline-dot bright amber + small linear bloom | static |
| MIDI-MAPPED | Dashed amber marker rectangle around the full slot footprint (handle + scale); underline-dot dim amber | static |
| MIDI-LEARNING | Pulsing pale-gold underline-dot + handle pale-gold tint | 2.5 Hz pulse |
| AUTOMATED | Handle dim amber; underline-dot slow-pulses + an additional ghost-handle marker shows the automation target position | 0.3 Hz |
| DISABLED | Opacity 0.32; handle and ticks both greyed; underline-dot off | static |
| ERROR | Pulsing red handle + red underline-dot | 1.5 Hz pulse |

**MODULATED omitted explicitly** — slide switches are mechanical detent selectors;
"modulated" requires a continuous CV target. If a future use case demands a slide
under CV control, it becomes an automation (`AUTOMATED` state) instead, with the
target position shown via the ghost-handle marker.

### MIDI-MAPPED marker primitive (NEW — lock here, build at integration)

`_marker_ring_slot(p, slot_rect, theme)` — dashed rounded-rectangle around the full
slot footprint (slot + outside scale ticks). Uses theme's `marker_thick` and
`marker_alpha`. Corner radius matches the slot's outer-rim corner (1.5 px).

### Ghost-handle marker (AUTOMATED state)

`_ghost_handle(p, cx, cy, w, h, variant)` — translucent (alpha ≤ 90) outline-only render
of the same handle silhouette at the automation-target position. Conveys "the
automation will move it HERE next" without obstructing the current physical position.

---

## §4 Recipe — paint layers

Paint order (back → front). Constants reference `Palette` indices from the
Hybrid Palette (`project_patchwerk_hybrid_palette`):

```
Hybrid Palette (canonical, body design):
  K_BODY     = #1E2024    (module body)
  K_BODY_HI  = #444448    (raised bevel highlight)
  K_BODY_LO  = #0F0F12    (canvas / recessed dark)
  K_BEVEL_HI = #525458    (light bevel face)
  K_BEVEL_LO = #4A4C50    (shadow bevel face)
  K_IND      = #C8C8CC    (silkscreen / dim indicator)
  K_AMBER_HI = #E0A24E    (Deep-amber active hi — palette[5])
  K_AMBER_MD = #B47A20    (Deep-amber active mid)
  K_AMBER_LO = #724A10    (Deep-amber active lo)
  K_GLOW     = rgba(180,122,32,100)
  K_RED      = #CC0000    (error sparse-red)
  K_LEARN    = #F0D068    (pale gold)
```

### Layers (every variant + state)

```
A. PANEL & SLOT (faceplate-mounted — drawn once per switch, not per variant)
  1. Panel cutout shadow — drop ellipse below the slot rect, K_BODY_LO α 90, 2 px deep
  2. Slot outer rim         — drawRoundedRect slot_outer, K_BEVEL_HI fill, 1.5 px outset
  3. Slot inner well        — drawRoundedRect slot_inner, K_BODY_LO fill (deep dark)
  4. Slot top/bottom seal   — 1 px black α 200 lines at slot top + bottom edges
  5. Inner-slot top shadow  — 4 px linear gradient α(220→0) top-down inside the well
  6. Inner-slot bot shadow  — 4 px linear gradient α(0→220) top-down inside the well

B. OUTSIDE SCALE — symmetric tick per position (per project_symmetric_scale_rule)
  7. For each detent position i in 0..n_positions-1:
     - Major tick at slot top:    1.4 × 7.5 px K_IND line above slot
     - Position dot beneath:      r=2.0 px K_IND filled circle below slot
     - On the ACTIVE position, swap dot fill to state colour (palette per state);
       on AUTOMATED, also draw the small ghost-handle at the target position

C. HANDLE — variant-specific body (10 paint layers, lifted from slider recipe pattern)
  8. Cast shadow            — drawRoundedRect handle_rect translated +(2,2), K_BODY_LO α 100
  9. Side face (3D lip)     — handle path translated down by h*0.30, subtract; fill
                              palette[side] (idle K_BODY_LO; active K_AMBER_LO darker)
 10. Base fill              — linear gradient handle_top→handle_bot:
                              hi (0%) → mid (45%) → lo (100%) per state palette
 11. Edge vignette          — radial gradient centred, α(0→0→v=80) over 0..0.6..1.0
 12. Bevel emboss           — top + left K_BEVEL_HI α(170);
                              bottom + right K_BEVEL_LO α(200); strength 1.0
 13. Rim light              — top + left rim white α(120); right rim α(60)
 14. Specular dot           — radial gradient at (cx, handle_top + h*0.16);
                              white α(235)→α(110)→α(0) over r = min(w,h) * 0.09
 15. Variant ornament       — SL1: none (clean square)
                              SL2: 3 horizontal ridges across face (1 px black α 200
                                   at y = h*0.30, 0.50, 0.70)
                              SL3: centre groove 1.4 px line across motion axis,
                                   white α 110 on top half + dark α 180 on bot half
 16. Outline                — 1 px K_BEVEL_LO edge
 17. Marker (if MIDI-MAPPED)— dashed K_AMBER_MD rectangle around slot_outer; theme
                              marker_thick / marker_alpha

D. STATE BLOOM (underline-dot glow — drawn last, additive)
 18. Active-position underline bloom — `_additive_halo_linear` aspect 1:1.4 below the
     active position dot, palette[state_glow], peak from theme.<state>_peak,
     animation phase from global t
```

### Variant pseudocode (liftable into `SlideSwitchV3.paintEvent`)

```python
def paint_slide_switch(p, slot_rect, variant, tier, n_positions, active_pos,
                       state, mapped, animation_t, theme, reflectivity, finish):
    """Paint a slide switch. All variants share layers A, B, D — only layer C ornament
    differs per variant (SL1/SL2/SL3) via the `_variant_ornament` callback."""
    # Layer A — panel + slot
    _paint_panel_shadow(p, slot_rect)
    _paint_slot_outer(p, slot_rect)
    _paint_slot_inner(p, slot_rect)
    _paint_slot_seals(p, slot_rect)
    _paint_slot_inner_shadows(p, slot_rect)

    # Layer B — outside scale (symmetric per n_positions)
    for i in range(n_positions):
        x_i = _detent_x(slot_rect, i, n_positions, tier_throw_for(tier))
        _paint_top_tick(p, x_i, slot_rect.top())
        _paint_bottom_dot(p, x_i, slot_rect.bottom(),
                          is_active=(i == active_pos),
                          state=state, theme=theme)

    # Layer C — handle (variant-driven)
    cx, cy, hw, hh = _handle_geom(slot_rect, variant, tier, active_pos, n_positions)
    palette = _palette_for_state(state, animation_t, theme)
    _paint_handle_shadow(p, cx, cy, hw, hh, palette)
    _paint_handle_side_face(p, cx, cy, hw, hh, palette)
    _paint_handle_base(p, cx, cy, hw, hh, palette)
    _paint_handle_vignette(p, cx, cy, hw, hh)
    _paint_handle_bevel(p, cx, cy, hw, hh)
    _paint_handle_rim_light(p, cx, cy, hw, hh)
    _paint_handle_specular(p, cx, cy, hw, hh)
    _variant_ornament[variant](p, cx, cy, hw, hh)   # SL1 none | SL2 ridges | SL3 groove
    _paint_handle_outline(p, cx, cy, hw, hh, palette)
    if mapped:
        _marker_ring_slot(p, slot_rect, theme)
    if state == "AUTOMATED":
        _ghost_handle(p, _target_cx(slot_rect, n_positions), cy, hw, hh, variant)

    # Layer D — state bloom (underline-dot glow)
    if state in ("ACTIVE", "MIDI_MAPPED", "MIDI_LEARNING", "AUTOMATED", "ERROR"):
        x_active = _detent_x(slot_rect, active_pos, n_positions, tier_throw_for(tier))
        _additive_halo_linear(p, x_active, slot_rect.bottom() + 6,
                              w_extent=hw * 1.4, h_extent=6.0,
                              color=palette["glow"],
                              peak=int(theme_peak_for(state, theme) *
                                       _anim_scale(state, animation_t)),
                              reflectivity=reflectivity)
```

### Palette per state

| State | Handle hi/mid/lo/side/edge | Underline-dot fill | Underline-bloom colour |
|---|---|---|---|
| IDLE | INACTIVE neutrals | K_IND | n/a (no bloom) |
| HOVER | INACTIVE + faint rim | K_IND | n/a |
| ACTIVE-GRABBED | K_AMBER_HI / MD / LO / dark / edge | K_AMBER_HI | K_GLOW |
| MIDI-MAPPED | INACTIVE + dashed amber slot ring | K_AMBER_MD | K_GLOW (dim) |
| MIDI-LEARNING | K_LEARN tint | K_LEARN | rgba(240,208,104,100) |
| AUTOMATED | K_AMBER_MD (dim) + ghost handle | K_AMBER_HI | K_GLOW |
| DISABLED | INACTIVE × 0.32 opacity | n/a | n/a |
| ERROR | K_RED tint | K_RED | rgba(204,0,0,160) |

---

## §5 Variant rationale — R1 long-list

Considered during the one-shot R1 sweep (2026-05-20):

| Considered variant | Outcome | Reason |
|---|---|---|
| **SL1 square bat** | ✅ KEPT | Bauhaus-pass (1:1 square); real-world (Apple mute, C&K JS); covers dense-array use case |
| **SL2 rectangle ridged bat** | ✅ KEPT | Bauhaus-pass (rectangle + horizontal ridges = symmetric); real-world (C&K SS-12, TR-808); workhorse default |
| **SL3 wide rectangle paddle** | ✅ KEPT | Bauhaus-pass (rectangle, centre groove symmetric); real-world (Roland Juno BANK, Korg MS-20); hero faceplate case |
| Lozenge / pill-shaped bat | ❌ DROPPED | Oblong silhouette — bauhaus rule rejects |
| Chevron-arrow paddle | ❌ DROPPED | Asymmetric finger-rest feature — bauhaus rule rejects |
| Tapered finger-tab (wider at top) | ❌ DROPPED | Taper — bauhaus rule rejects |
| Hex-cap slide | ❌ DROPPED | No real-world reference for hex-cap slides; hex aesthetic owned by hex buttons (B5a/B5b); cross-element duplication |
| Round disc slider (drum slide) | ❌ DROPPED | Real but rare; reads as a knob in linear slot — conflicts with knob vocabulary |
| Half-moon / D-shape handle | ❌ DROPPED | Asymmetric silhouette — bauhaus rule rejects |
| Notched handle (single notch on top) | ❌ DROPPED | Notch is asymmetric feature — bauhaus rule rejects |
| Knurled-rim (donut) slide | ❌ DROPPED | Rotational silhouette in linear motion conflicts with the linear-action category; better at knob layer |

Final keep set: 3 variants (SL1, SL2, SL3) — all bauhaus-symmetric with ≥3 real-world
references per variant. R1+R2 collapsed into one pass per RC-1 one-shot workflow.

---

## §6 Integration plan — what mainline must do

### File to refactor

`main_app/syb_modular_ui_prototype_<latest>.py` — currently no `SlideSwitchV3` class
exists (slide switches haven't been rendered in any production module yet). Lift this
recipe into a new widget class.

### Target widget class

```python
class SlideSwitchV3(QWidget):
    def __init__(self, parent=None, *, variant="SL2", tier="M",
                 n_positions=3, position=0, state="IDLE", mapped=False,
                 orientation="horizontal"):
        ...
        self._variant      = variant         # "SL1" | "SL2" | "SL3"
        self._tier         = tier            # "XS" .. "XL"
        self._n_positions  = n_positions     # 2 | 3 | 5 (any int ≥ 2)
        self._position     = position        # 0 .. n_positions-1
        self._state        = state           # canonical state name (see §3)
        self._mapped       = mapped
        self._orientation  = orientation     # horizontal default; vertical via QPainter.rotate(90)
        self._reflectivity = 0.0
        self._theme        = DEFAULT_THEME
        self._t            = 0.0
        self._timer        = QTimer(self); self._timer.timeout.connect(self._tick)
        self._timer.start(33)
        self.setMouseTracking(True)

    def set_state(self, state): ...
    def set_position(self, pos): ...
    def set_mapped(self, on): ...
    def set_reflectivity(self, v): ...
    def set_theme(self, theme): ...

    def paintEvent(self, _ev):
        p = QPainter(self); p.setRenderHint(QPainter.Antialiasing)
        paint_slide_switch(
            p, self._slot_rect(), self._variant, self._tier,
            self._n_positions, self._position, self._state, self._mapped,
            self._t, self._theme, self._reflectivity, self._finish,
        )

    def mousePressEvent(self, ev):
        # Map click x → nearest detent → setPosition + emit positionChanged
        ...
```

### Primitives reused (cross-element consistency)

| Primitive | Source | Already exists? |
|---|---|---|
| `_additive_halo_linear` | `preview_engine_sliders_colour.py` | ✅ — lift to `syb_core/widgets/bloom.py` at integration |
| `Hybrid Palette` constants | `slider_handle_demo.py` / `bloom_theme.py` | ✅ |
| 10-layer handle paint pattern | `slider_handle_demo.py:paint_recipe()` | ✅ — adapted from rectangular T-bar handle to plain rectangle handle |
| `_marker_ring_slot` (dashed slot ring) | NEW — sibling to button `_marker_ring_square` | ❌ build at integration |
| `_ghost_handle` (translucent target marker) | NEW — slide-switch specific | ❌ build at integration |
| `BloomTheme` + 4 presets | `bloom_theme.py` | ✅ |

### Suggested shared-module location

```
syb_core/widgets/
  slide_switch_recipe.py   # paint_slide_switch + per-layer painters
  slide_switch_variants.py # SL1/SL2/SL3 ornament fns + variant dispatch
  slide_switch_widget.py   # SlideSwitchV3 QWidget class
```

### Differences vs slider track

A slide switch shares **layer A** (panel + slot — almost identical to slider track
rim/well/seal/shadow) and **layer C steps 1–8 + outline** (the 10-layer paint pattern,
with the T-bar shape swapped for a plain rectangle/square handle). Differences:

1. **No fill column** — slider paints an active "fill bar" from track bottom up to grip;
   slide switch does not — discrete positions, no continuous level.
2. **No COMBO ticks at fixed pitch** — slider's COMBO track uses fixed-spacing ticks per
   `feedback_engine_preview_audit_checklist`; slide switch ticks count = n_positions
   (symmetric scale rule, position-driven not spacing-driven).
3. **Underline-dot indicator beneath each position** — slide switch only; not present
   on sliders.
4. **Discrete snap** — slide switch position snaps to detent on `mousePressEvent`;
   slider is continuous drag.
5. **Ghost-handle for AUTOMATED state** — slide switch shows the automation target as
   a translucent ghost at the destination position; slider AUTOMATED state shows
   continuous ghost-fill column.
6. **No MODULATED state** — slide switch has no continuous CV target; slider does.

### Sample production wirings (where SlideSwitchV3 will appear)

| Module | Variant | Tier | Positions | Use |
|---|---|---|---|---|
| `vco_classic` waveform select | SL3 | L | 5 | sine / tri / saw / sqr / pulse |
| `filter_state_variable` mode | SL2 | M | 3 | LP / BP / HP |
| `mixer_4ch` channel sources | SL1 | S | 2 | A / B per channel |
| `signal_router_2x4` row enable | SL1 | XS | 2 | on / off per row |
| `clock_source` rate range | SL2 | M | 3 | slow / med / fast |
| Faceplate-header global mode | SL3 | XL | 3 | hero selector (rare) |

---

## §7 Acceptance criteria

A slide-switch section is LOCKED when ALL are true:

- ✅ Recipe doc (this file) §1–§7 complete with ≥3 real-world references per variant.
- ✅ Phase 4.5 final preview matrix (`demos/preview_engine_slide_switch_phase45.py`)
  renders every variant × tier × state × finish × theme combination with no skipped
  slots and no clipping at XL.
- ✅ Bauhaus filter applied — all silhouettes are round/hex/square/rectangle primitives
  with no oblongs/tapers/notches/asymmetric features.
- ✅ Symmetric scale rule applied — tick count = n_positions at every position count.
- ✅ Every state legible at S tier under STANDARD theme — including disambiguation
  between AUTOMATED (slow-pulse + ghost handle) and MIDI-MAPPED (static dashed ring)
  and ACTIVE-GRABBED (bright amber + linear bloom).
- ✅ Finish toggle survives reflective worst-case — handle bevel + specular still
  reads clearly at reflective=1.0 + CINEMATIC theme.
- ⏳ Mainline `SlideSwitchV3` widget class built, integrated into at least one
  production module (e.g. `filter_state_variable` mode select), visually verified
  against the matrix preview. **Pending mainline integration phase.**

Until the mainline integration check passes, slide switches are "preview-locked but
integration-pending."

---

## What's NEW vs what's CANONICAL

| Item | Source |
|---|---|
| 3 variants (SL1 / SL2 / SL3) | CANONICAL (demo-agent 2026-05-20, one-shot R1) |
| 5 tiers (XS/S/M/L/XL) — slide-switch-specific px | CANONICAL (this doc 2026-05-20) |
| 8-state vocabulary (no MODULATED) | CANONICAL (selector subset, this doc 2026-05-20) |
| 10-layer handle paint pattern | CANONICAL (adapted from `slider_handle_demo.paint_recipe`) |
| Symmetric scale rule (ticks = n_positions) | CANONICAL (cross-cutting — `project_symmetric_scale_rule`) |
| `_marker_ring_slot` | **NEW pending** (build at integration) |
| `_ghost_handle` for AUTOMATED | **NEW pending** (build at integration) |
| `SlideSwitchV3` QWidget class | **NEW pending** (build at integration) |

---

## Cross-references

- [[project-bauhaus-symmetric-shape-rule]]
- [[project-design-tier-vocabulary]]
- [[project-design-element-scope]]
- [[project-state-vocabulary]]
- [[project-symmetric-scale-rule]]
- [[project-bloom-user-settings-buckets]]
- [[project-patchwerk-hybrid-palette]]
- [[feedback-variant-reality-check]]
- [[feedback-larger-demo-icons]]
- [[feedback-realistic-light-physics]]
- [[feedback-each-element-starts-at-r1]]
- [[feedback-final-preview-all-variants]]
- [[feedback-engine-preview-audit-checklist]]
- Sibling element recipe locks: `BUTTON_RECIPE_LOCK.md`, `SLIDER_RECIPE_LOCK.md`
