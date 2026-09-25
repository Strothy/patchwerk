# Segmented Display Recipe Lock — Section 6 of the design-language spec

_Locked 2026-05-20. One-shot pass per `docs/ONESHOT_ELEMENT_WORKFLOW.md`._

This is the canonical implementation spec for the **segmented numeric / hex
display** across all PATCHWERK / SYB Live Cable modules. Scope = **7-segment
digit clusters** used wherever a numeric readout is required (BPM, channel
index, MIDI channel, step counter, value displays where a numeric output is
called for).

**Frozen — do NOT design in this pass:** 14-segment alphanumeric, dot-matrix
arrays, pixel-matrix value displays. Those belong to the **scope-inset**
element pass (see `docs/RC1_DEEP_FREEZE.md`). This recipe covers numeric
segmented rendering only.

Mainline must lift these primitives verbatim when building `SegDisplayV3`
(target widget class — see §6 Integration).

---

## TL;DR — the lock

| Component | Recipe |
|---|---|
| **Variants (3 locked)** | `CLASSIC_RED_7SEG` · `AMBER_VINTAGE_7SEG` · `GREEN_PHOSPHOR_7SEG` |
| **Real-world refs** | HP HDSP-7503 (red) · Kingbright SA15-11SRWA (amber) · Lite-On LSHD-A101 (green) |
| **Tier set (XS/S/M/L/XL)** | digit-height 5 / 8 / 11 / 14 / 18 px production (preview ×1.85 = 9 / 15 / 20 / 26 / 33 px) |
| **Aspect ratio** | digit width = 0.55 × digit height (rectangle silhouette, Bauhaus-clean) |
| **Segment thickness** | ratio 0.16 × digit height — clamped min 1 px |
| **Inter-digit spacing** | 0.16 × digit height (gap between adjacent digit cells; decimal-point dot inflates gap by `+seg_t` after host digit) |
| **State vocabulary (9)** | `idle` · `DIGITS_LIT` · `DIGITS_BLANK` · `MIDI_MAPPED` · `MIDI_LEARNING` · `MODULATED` · `AUTOMATED` · `DISABLED` · `ERROR` |
| **Bloom geometry** | per-segment **rectangle** (linear-strip emitter per `feedback-realistic-light-physics`) — NEVER an isotropic radial halo over the whole digit |
| **Off-segment ghost** | always rendered at α 28-44 (variant-specific) — the dim seg shadow under the panel mask, even when DIGITS_BLANK |
| **Panel mask** | dark plastic carrier `#0A0A0C` α 240 over body fill; digit silhouette is a rectangle aperture |
| **Decimal point dot** | square w = h = `seg_t * 1.4`, placed at lower-right of digit cell, gap = `seg_t * 0.6` |
| **Bloom theme presets** | OFF / SUBTLE / STANDARD / CINEMATIC consumed via shared `bloom_theme.py` — `active_peak` for lit segs, `modulated_peak` for MOD, `error_peak` for ERROR, `learning_peak` for MIDI_LEARNING |
| **Reflectivity / finish** | matte 0.0 · semi 0.5 · reflective 1.0 — halo size + alpha scales per `bloom_theme` mults |
| **Sparse-red rationale** | The classic red 7-seg variant IS the active readout. The accent rule (`project-patchwerk-accent-sparse`) restricts incidental red — readouts are intentional, full-time emissive elements and are exempt. The variant choice is itself a colour decision that pairs with module function. |
| **Bauhaus rule** | rectangular segments only — NO retro slanted / italic seg fonts (e.g. classic calculator slant ×). Vertical, perfectly upright digit silhouette. |

---

## §1 Variants

Per `docs/ONESHOT_ELEMENT_WORKFLOW.md`, every variant slot logs ≥3 candidates
with named real-world references. Bauhaus symmetric-shape rule applies: every
segment is a rectangle primitive; the digit silhouette is rectangular; no
slanted / italic / decorative segment shapes. All three variants share the
same geometry — they differ in **colour family** and **panel-mask treatment**
only.

### `CLASSIC_RED_7SEG`

**Use case:** BPM, channel index, master display where a classic synth / sequencer / industrial-meter feel is wanted. The most recognisable seg-display silhouette in production electronics.

| Param | Value |
|---|---|
| Lit seg colour | `#FF3220` (deep saturated red — HP HDSP-7503 typical) |
| Lit highlight | `#FF8060` (top 30 % of segment, lighter) |
| Ghost seg colour | `#3A1410` α 80 (very dim red-brown, the dim seg shadow under the mask) |
| Bloom colour | `#FF6648` |
| Panel mask | `#0A0A0C` α 240 (almost-black dark plastic) |

**Real-world references:**
1. HP HDSP-7503 (red 7-seg, common in vintage HP test gear)
2. Kingbright SA08-11EWA (single-digit red 7-seg, modern Eurorack BPM displays — common in Korg Volca-style hardware)
3. Roland TR-808 / TR-909 step / pattern displays (classic studio context)
4. Wavestate / Microfreak Korg classic red BPM digit clusters

### `AMBER_VINTAGE_7SEG`

**Use case:** vintage / studio aesthetic; warm, slightly muted; pairs well with hybrid palette beige / brass faceplate finishes; recommended for modules with a "warmth / saturation" identity (tape simulators, vintage filter modules, channel strips).

| Param | Value |
|---|---|
| Lit seg colour | `#FFA040` (deep saturated amber — Kingbright SA15-11SRWA typical) |
| Lit highlight | `#FFD088` |
| Ghost seg colour | `#3A2410` α 90 |
| Bloom colour | `#FFB960` |
| Panel mask | `#0A0A0C` α 240 |

**Real-world references:**
1. Kingbright SA15-11SRWA (amber 7-seg, used in Mackie / Tascam mixer LEDs)
2. Tektronix 465M oscilloscope channel digit displays
3. Vintage Roland Jupiter-6 patch-number display (amber-orange seg)
4. Sequential Pro-One / Prophet-600 patch number display

### `GREEN_PHOSPHOR_7SEG`

**Use case:** modern / scientific / lab feel; high contrast against dark faceplate; pairs well with cooler hybrid palette (charcoal / blued-steel modules); recommended for utility / measurement / scope-adjacent modules (clock divider, step counter, frequency readout).

| Param | Value |
|---|---|
| Lit seg colour | `#40D060` (medium-bright phosphor green — Lite-On LSHD-A101 typical) |
| Lit highlight | `#80F0A0` |
| Ghost seg colour | `#102818` α 90 |
| Bloom colour | `#60E080` |
| Panel mask | `#0A0A0C` α 240 |

**Real-world references:**
1. Lite-On LSHD-A101 (green 7-seg, lab / scientific instrument staple)
2. Fluke 87 / HP 34401A multimeter green seg displays
3. Doepfer A-160 clock divider step display (modular eurorack)
4. Behringer / Klark Teknik digital mixer green seg meters

**Bauhaus filter applied:** all three are rectangular-segment, perfectly
upright (NOT slanted / italic — the classic calculator slant is rejected), and
each cites multiple real-world hardware references. Variants differ in palette
ONLY — geometry is shared, so a single paint function with a colour table
handles all three.

---

## §2 Tier sizes (XS/S/M/L/XL)

Segmented-display tiers are driven by **digit height** (the natural physical
spec on real seg-display datasheets — character height in mm). Production
values are derived from real seg-display character heights (HP HDSP-7503 ≈
2.5 mm; Lite-On 5 mm; HP / Kingbright bar-graph 7-8 mm; large SBC modules
10-15 mm; pilot-lamp size 20 mm).

All values are at **production canvas pixel scale**. Demo previews render at
+35 % per `feedback-larger-demo-icons` (matrix cell sizing only — production
tier numbers do NOT scale).

| Tier | Digit H (prod) | Digit W | Seg thickness | Inter-digit gap | Preview digit H | Real-world reference |
|---|---|---|---|---|---|---|
| **XS** | 5 px | 3 px | 1 px | 1 px | 9 px | HP HDSP-7503 (2.5 mm char) — tiny status digit |
| **S** | 8 px | 4 px | 1 px | 1 px | 15 px | Lite-On LSHD-A101 (5 mm) — small step counter |
| **M** | 11 px | 6 px | 2 px | 2 px | 20 px | Kingbright SA15 (7 mm) — **DEFAULT** BPM / chan |
| **L** | 14 px | 8 px | 2 px | 2 px | 26 px | HP HDSP-7807 (10 mm) — module status readout |
| **XL** | 18 px | 10 px | 3 px | 3 px | 33 px | Large pilot-lamp seg (15-20 mm) — hero readout |

### N-digit cluster widths (production)

The cluster width for `N` digits at tier `T` is:

```
W_cluster = N * digit_w(T) + (N - 1) * gap(T) + 2 * margin
margin    = seg_t(T)  # 1 px inset on each side inside the panel mask
```

Worked widths (production, no decimal point):

| Tier | 1 digit | 2 digits | 3 digits | 4 digits | 6 digits |
|---|---|---|---|---|---|
| XS | 5 px | 11 px | 17 px | 23 px | 35 px |
| S | 8 px | 17 px | 26 px | 35 px | 53 px |
| M | 12 px | 26 px | 40 px | 54 px | 82 px |
| L | 16 px | 34 px | 52 px | 70 px | 106 px |
| XL | 22 px | 47 px | 72 px | 97 px | 147 px |

Add `seg_t * 2.6` to the cluster width for each decimal-point dot.

### Tier selection rule (production)

- **XS** — tiny single-digit step counter / mode index (e.g. clock_divider
  divisor digit).
- **S** — multi-digit MIDI channel / channel index (`01`–`16`).
- **M** — **DEFAULT** for BPM (`120.0`), step counter (`16`), generic value
  readouts. Project default for any unspecified seg-display use.
- **L** — module-level large readouts (hero BPM on a transport module).
- **XL** — full-faceplate hero displays (rare; only on transport / dedicated
  display modules).

### Pairing rule (host control tier → display tier)

The display tier is normally **one tier larger** than the param-label tier of
the closest host control (an M-tier knob with an S-tier param label pairs
with an M-tier display readout). Where a display replaces a param label
(`ML_VALUE_REPLACES_LABEL` from `docs/SIGNAGE_CORE_RECIPE_LOCK.md`), the
display takes the param label's tier slot directly.

---

## §3 State vocabulary (9 states)

Segmented displays are emissive elements and inherit the canonical emissive
state vocabulary (per `project-state-vocabulary`). Nine states total.

| State | Lit seg fill | Ghost seg | Marker | Animation | Trigger |
|---|---|---|---|---|---|
| **idle** | OFF (no segs lit) | variant.ghost α | — | static | display is powered but holding no value (post-init) |
| **DIGITS_LIT** | variant.lit | variant.ghost α | — | static | normal operation — showing a value |
| **DIGITS_BLANK** | OFF (no segs lit), middle segment ('g') lit as dash on every digit | variant.ghost α | — | static | display is in "no-value / not assigned" mode (a row of dashes `----`) |
| **MIDI_MAPPED** | variant.lit | variant.ghost α | small filled square 2×2 px in lower-left corner of panel mask, deep amber `#E0A24E` α 220 | static | host bound to a MIDI CC / channel |
| **MIDI_LEARNING** | breathing — alpha modulated by `learning_pulse_lo→hi` | variant.ghost α | corner marker (same as MIDI_MAPPED) blinking 0.6 Hz | 0.6 Hz slow breath — `m = 0.5 + 0.5 * sin(2π × 0.6 × t)` applied to all lit segs | mainline awaiting next CC for binding |
| **MODULATED** | variant.lit — subtle brightness modulation; alpha `0.7 + 0.3 * sin(2π × 0.4 × t)` | variant.ghost α | — | 0.4 Hz sine breath on lit-seg brightness only | parameter under CV modulation |
| **AUTOMATED** | variant.lit | variant.ghost α | small filled circle ø `seg_t * 1.0` at lower-left of panel mask, palette amber `#FFC652` α 220; gentle drift hint by slowly cycling lit value | static (or value cycles slowly through preset sequence at 0.3 Hz) | parameter driven by recorded automation |
| **DISABLED** | greyed — variant.lit → `#606066` α 100 | variant.ghost α 40 | — | static | module disabled / patch-load lock |
| **ERROR** | red flash @ 1.5 Hz overlaid on whatever was being shown — ALL segs (lit + ghost) blink to `#CC0000` α 220 then return to base state | variant.ghost α | — | 1.5 Hz square pulse (50 % duty); applies even on non-red variants | runtime error in host module |

### State combination rules

- **MIDI_LEARNING** combines with **DIGITS_LIT** or **DIGITS_BLANK** (the display still shows its value while learning, but the value pulses).
- **ERROR** overrides any other state's animation — red 1.5 Hz blink wins on top of MOD / LEARN / AUTO; segs return to base colour between blinks.
- **DISABLED** overrides MOD / LEARN / AUTO animation (display is dim and static).
- **MIDI_MAPPED** corner marker stays drawn on top of any animation except DISABLED (no marker when disabled).

### Off-segment ghost (always drawn)

Even when DIGITS_BLANK or in `idle`, the off-segments must render the **dim
seg shadow under the panel mask** — a real 7-seg display always shows seven
faint rectangles per digit (the inactive segments are physically present under
the diffuser). This is rendered as `variant.ghost` α 80-90 on every segment
that is NOT lit. Set this to zero alpha during the DISABLED state's α 40
already-dim treatment.

### MIDI-MAPPED vs CONTROL-MIDI-MAPPED

Segmented displays themselves are not normally MIDI-mapped — the **value
they show** comes from a host parameter that may be mapped. The MIDI_MAPPED
state on a seg-display is therefore a forwarded reflection of the host's
own MIDI binding (the display shows the marker so the user can see the value
under MIDI control without looking at the source knob).

---

## §4 Recipe — paint layers per variant

All three variants share one paint function. The variant determines colour
table entries only — geometry, segment maps, digit lookup, and bloom geometry
are identical.

### Per-digit paint sequence

```
For digit cell at (cx, cy) with digit_h, digit_w, seg_t:
 1. Panel mask layer:
     - Cell rect = QRectF(cx - digit_w/2 - 1, cy - digit_h/2 - 1,
                          digit_w + 2, digit_h + 2)
     - Fill panel.mask (#0A0A0C α 240)

 2. Off-segment ghost layer:
     For each of 7 segments (a..g) NOT in the active map for current digit:
       - Build segment rect path (rectangle primitive — see segment map below)
       - Fill with variant.ghost (e.g. #3A1410 α 80)
       - Pen NoPen
     (DIGITS_BLANK and `idle` skip the active map; DIGITS_BLANK still draws
     the 'g' middle segment as the dash via the active-map step below.)

 3. On-segment fill layer:
     For each of 7 segments in the active map for current digit:
       - Build segment rect path
       - Linear gradient top-to-bottom: variant.lit_hilite at top 30 %,
         variant.lit at bottom 70 %
       - Fill, pen NoPen
       - If state == MODULATED: alpha *= 0.7 + 0.3 * sin(2π × 0.4 × t)
       - If state == MIDI_LEARNING: alpha *= 0.5 + 0.5 * sin(2π × 0.6 × t)
       - If state == ERROR and (t * 1.5) % 1.0 < 0.5:
           fill = #CC0000 α 220 instead of variant.lit
       - If state == DISABLED: fill = #606066 α 100

 4. Per-segment rectangle bloom (realistic-light-physics — NEVER radial halo
    over the digit; each lit segment is a tiny rectangle of LED, so the bloom
    must be per-segment):
     For each segment in the active map:
       - peak_alpha = theme.active_peak (or modulated/learning/error per state)
       - radius_mult = (1.4 if state in (LIT, MIDI_MAPPED) else
                       1.2 if state == MODULATED else
                       1.3 if state in (MIDI_LEARNING, AUTOMATED) else
                       1.5 if state == ERROR else 0)
       - bloom_rect = segment_rect expanded by seg_t * radius_mult on long axis
                                          and seg_t * radius_mult * 0.6 on short axis
       - _additive_halo_rect(p, bloom_rect, variant.bloom_colour,
                             peak_alpha, reflectivity, theme)

 5. Decimal-point dot (when digit is the host of a decimal point):
     - dot_rect = QRectF(cx + digit_w/2 + seg_t*0.6,
                         cy + digit_h/2 - seg_t * 1.4,
                         seg_t * 1.4, seg_t * 1.4)
     - Fill state.lit_fill (matches active-segment fill)
     - If state == MIDI_LEARNING / MODULATED / ERROR: same alpha modulation
     - Per-segment rectangle bloom on dot_rect (radius_mult 1.2)

 6. Decimal point ghost (always, even off):
     - Same dot rect filled with variant.ghost α (matches off-segment ghost)
     - Painted BEFORE step 5 (step 5 overdraws when point is lit)
```

### Per-cluster paint sequence

```
For an N-digit cluster at top-left (cluster_x, cluster_y):
 1. Outer panel mask:
     - Cluster rect = QRectF(cluster_x, cluster_y,
                             W_cluster, digit_h + 4)
     - Fill panel.mask (#0A0A0C α 240) with corner radius 1 px
     - 1 px BEVEL_LO stroke around the outer rect (the carrier-PCB edge)

 2. For each digit i in 0..N-1:
     - cx_i = cluster_x + margin + digit_w/2 + i * (digit_w + gap)
     - cy_i = cluster_y + 2 + digit_h/2
     - paint_digit(p, cx_i, cy_i, digit_value, has_decimal, variant, state, ...)

 3. Cluster marker (MIDI_MAPPED / AUTOMATED / MIDI_LEARNING):
     - 2×2 px filled square at (cluster_x + 2, cluster_y + digit_h + 1)
     - Colour per state

 4. Digit-cluster panel bevel (final):
     - 1 px BEVEL_HI stroke along top edge of cluster rect (inner)
     - This sells the "module PCB notch over which the seg-display sits"
```

### Segment letter → coordinate map (classic 7-seg layout)

Standard convention: segments labelled `a` through `g`. Geometry uses the
digit-cell-local coordinate system `(0, 0)` at upper-left, `(digit_w, digit_h)`
at lower-right. `t = seg_t`.

```
 ┌──a──┐
 f     b
 ├──g──┤
 e     c
 └──d──┘
```

| Segment | Rect (x, y, w, h) |
|---|---|
| **a** (top horizontal) | `(t, 0, digit_w - 2t, t)` |
| **b** (upper-right vertical) | `(digit_w - t, t, t, (digit_h - 3t) / 2)` |
| **c** (lower-right vertical) | `(digit_w - t, digit_h/2 + t/2, t, (digit_h - 3t) / 2)` |
| **d** (bottom horizontal) | `(t, digit_h - t, digit_w - 2t, t)` |
| **e** (lower-left vertical) | `(0, digit_h/2 + t/2, t, (digit_h - 3t) / 2)` |
| **f** (upper-left vertical) | `(0, t, t, (digit_h - 3t) / 2)` |
| **g** (middle horizontal) | `(t, digit_h/2 - t/2, digit_w - 2t, t)` |

The segments are rectangles (not slanted parallelograms). This is the Bauhaus
filter applied to the digit silhouette — no italic / display-LED slant. The
small `t`-wide gap between horizontal and vertical segments at corners is
preserved as in real 7-seg hardware (single-piece moulded diffusers show the
same gap).

### Full 0–9 + A–F hex digit lookup

| Digit | Active segments |
|---|---|
| `0` | a, b, c, d, e, f |
| `1` | b, c |
| `2` | a, b, d, e, g |
| `3` | a, b, c, d, g |
| `4` | b, c, f, g |
| `5` | a, c, d, f, g |
| `6` | a, c, d, e, f, g |
| `7` | a, b, c |
| `8` | a, b, c, d, e, f, g |
| `9` | a, b, c, d, f, g |
| `A` | a, b, c, e, f, g |
| `b` | c, d, e, f, g |
| `C` | a, d, e, f |
| `d` | b, c, d, e, g |
| `E` | a, d, e, f, g |
| `F` | a, e, f, g |
| `-` (dash) | g |
| ` ` (blank) | (none) |

(`A`–`F` hex follows the canonical mixed-case convention: `b` and `d`
lowercase because `B` and `D` are visually indistinguishable from `8` and `0`
respectively on a 7-segment display.)

### Liftable paint pseudocode

```python
SEGMENT_MAP = {
    'a': lambda dw, dh, t: QRectF(t,      0,             dw - 2*t, t),
    'b': lambda dw, dh, t: QRectF(dw - t, t,             t,        (dh - 3*t) / 2),
    'c': lambda dw, dh, t: QRectF(dw - t, dh/2 + t/2,    t,        (dh - 3*t) / 2),
    'd': lambda dw, dh, t: QRectF(t,      dh - t,        dw - 2*t, t),
    'e': lambda dw, dh, t: QRectF(0,      dh/2 + t/2,    t,        (dh - 3*t) / 2),
    'f': lambda dw, dh, t: QRectF(0,      t,             t,        (dh - 3*t) / 2),
    'g': lambda dw, dh, t: QRectF(t,      dh/2 - t/2,    dw - 2*t, t),
}

DIGIT_SEGS = {
    '0': "abcdef",   '1': "bc",       '2': "abdeg",    '3': "abcdg",
    '4': "bcfg",     '5': "acdfg",    '6': "acdefg",   '7': "abc",
    '8': "abcdefg",  '9': "abcdfg",
    'A': "abcefg",   'b': "cdefg",    'C': "adef",     'd': "bcdeg",
    'E': "adefg",    'F': "aefg",
    '-': "g",        ' ': "",
}

def paint_digit(p, cx, cy, dh, dw, t, ch, has_dot, variant, state, t_anim,
                theme, reflectivity):
    # 1. panel mask
    cell = QRectF(cx - dw/2 - 1, cy - dh/2 - 1, dw + 2, dh + 2)
    p.fillRect(cell, variant.mask)
    # 2. off-segment ghost (and 3. lit segments) — segment rects are translated
    #    from the local (0,0)–(dw,dh) frame into world coordinates.
    active = DIGIT_SEGS.get(ch, "")
    for seg_name, rect_fn in SEGMENT_MAP.items():
        local = rect_fn(dw, dh, t)
        rect = local.translated(cx - dw/2, cy - dh/2)
        if seg_name in active:
            paint_lit_segment(p, rect, variant, state, t_anim, theme, reflectivity)
        else:
            p.fillRect(rect, variant.ghost)
    # 4. per-segment rectangle bloom for each LIT segment
    # 5/6. decimal point ghost + on if has_dot
```

---

## §5 Variant rationale — what was considered and dropped

**Considered + dropped:**

1. **`BLUE_LED_7SEG`** — popular in modern consumer kit. **Dropped**: blue
   does not pair cleanly with the hybrid palette (`#1E2024` body, `#0F0F12`
   canvas) — the lit blue spec collides with the canvas blue-grey at low alpha
   and washes out under reflective finish. Modern blue 7-seg also drifts
   towards "amateur kit / hobby" aesthetic which is off-brand for PATCHWERK.

2. **`WHITE_7SEG`** — modern, neutral. **Dropped**: white-on-dark provides
   limited differentiation from the param-label idle colour (`#E6E8EC`), and
   eliminates the variant's role as a visual hint about the host module's
   identity. The whole point of three variants is to give modules a colour
   "family" that signals their function (red = transport, amber = vintage /
   warmth, green = utility / lab). White provides no such signal.

3. **`ITALIC_SLANT_7SEG`** — classic calculator / pocket-LED-display look
   (Casio, TI calculator era). **Dropped** by Bauhaus filter
   (`project-bauhaus-symmetric-shape-rule`) — slanted segments break the
   symmetric / rectangle-primitive rule. The variant is widely seen in
   real-world hardware (so the Variant Reality Check passes), but it fails
   the Bauhaus filter and stays out of the locked set.

4. **`VFD_BLUEGREEN_7SEG`** (vacuum-fluorescent display look) — beautiful in
   real life. **Dropped**: VFD glow is a very different bloom physics (thick
   plasma cloud, not rectangle strip emitters). Mapping that into the rectangle
   bloom primitive would either misrepresent VFD (giving it LED-strip bloom)
   or require a new bloom primitive. Defer to a possible future post-RC pass.

5. **`HIGH_DPI_PIXEL_MATRIX`** (e.g. 5×7 dot matrix per char) — covers full
   alphanumeric. **Dropped** by scope: this is the **scope-inset** element's
   territory, not the segmented-display element (per `docs/RC1_DEEP_FREEZE.md`
   one-shot scope). Numeric / hex coverage with 7-seg is sufficient for every
   currently-shipping RC-1 module readout.

6. **14-segment alphanumeric** — supports full alphabet. **Dropped** by scope:
   no current RC-1 module displays alphanumeric strings on a segmented
   element. Module names use the type-strip (see signage core); numeric
   readouts use 7-seg.

**Retained but not picked as default:** all three locked variants are valid
choices; **`AMBER_VINTAGE_7SEG` is the project default** when no variant is
specified, because (a) it pairs with the largest set of modules without
clashing (the red and green variants are louder and want to be deliberate),
and (b) it matches the deep amber `PAL_LIT.hi` already used elsewhere
(slider handle palette, MIDI-learn indicator).

### Why `CLASSIC_RED_7SEG` does NOT break the sparse-accent rule

`project-patchwerk-accent-sparse` reserves `#CC0000` red for ERROR and
active-modulated states ONLY. A red 7-seg display continuously shows a red
readout, which would look like a perpetual accent violation.

The rule does NOT apply because:

1. A seg-display is **the active readout** — its entire purpose is to be a
   continuous, full-time emissive element. The sparse-accent rule applies to
   incidental UI accents (cable colours, separators, header underlines), not
   to displays whose sole purpose is to emit light.
2. The lit colour of the red variant (`#FF3220`) is **deliberately different**
   from the error-accent colour (`#CC0000`). The two reds are
   distinguishable: the lit-seg red is brighter / more orange-leaning, while
   the error red is darker and more pure. The ERROR state on a red 7-seg
   display flashes to `#CC0000` for the 1.5 Hz blink, providing the
   characteristic accent semantics even on top of a red base.
3. The red variant is **picked deliberately per module** — only modules whose
   function justifies a red identity (transport / clock / dedicated BPM
   displays) should use it. The other modules get amber (default) or green
   (lab / utility).

This rationale is documented here so future audits do not erroneously flag
the red variant as a sparse-accent violation.

---

## §6 Integration plan — what mainline must do

### Target widget class

**`SegDisplayV3(variant, tier, n_digits, *, has_decimal=False, parent=None)`** — Qt widget wrapping one digit cluster.

```python
class SegDisplayV3(QWidget):
    def __init__(self, parent=None, *, variant: str = "AMBER_VINTAGE_7SEG",
                 tier: str = "M", n_digits: int = 4, has_decimal: bool = False):
        ...
        self._state: str = "DIGITS_LIT"
        self._value: str = "0" * n_digits
        self._reflectivity: float = 0.0
        self._theme: BloomTheme = DEFAULT_THEME

    def set_state(self, state: str) -> None: ...
    def set_value(self, value: str) -> None: ...  # caller responsible for padding
    def set_reflectivity(self, v: float) -> None: ...
    def set_theme(self, theme: BloomTheme) -> None: ...

    def paintEvent(self, _ev) -> None: ...
```

### Files to add

```
syb_core/widgets/
  segdisplay.py         # SegDisplayV3 + SEGMENT_MAP + DIGIT_SEGS + paint helpers
  segdisplay_variants.py  # VARIANT_REGISTRY (3 locked variants — palette tables)
```

Both `demos/preview_engine_segmented_display_phase45.py` and `main_app/...`
import from `syb_core.widgets.segdisplay`.

### Required new primitives

| Primitive | Source after integration | Description |
|---|---|---|
| `_additive_halo_rect` | already in `demos/bloom_theme.py` | reused for per-segment rectangle bloom |
| `paint_digit(...)` | new in `syb_core/widgets/segdisplay.py` | per-digit paint loop (steps 1–6 above) |
| `paint_cluster(...)` | new in `syb_core/widgets/segdisplay.py` | per-cluster paint loop (steps 1–4 above) |
| `VARIANT_REGISTRY` | new in `syb_core/widgets/segdisplay_variants.py` | dict of variant_name → palette dataclass |
| `STATE_REGISTRY` | new in `syb_core/widgets/segdisplay.py` | dict mapping state name → animation modifier closure |
| `TIERS` | new in `syb_core/widgets/segdisplay.py` | tier name → (digit_h, digit_w, seg_t, gap) table |

### Co-existence with signage `ML_VALUE_REPLACES_LABEL`

`docs/SIGNAGE_CORE_RECIPE_LOCK.md` defines `ML_VALUE_REPLACES_LABEL` — when
a knob's value would otherwise be shown as a static text label, a live numeric
readout renders above the control. **The two systems are complementary:**

| Use case | Render with |
|---|---|
| Numeric host parameter, readout in faceplate-native fancy emissive style | `SegDisplayV3` (this element) |
| Numeric host parameter, readout in compact text-only style next to knob | `ML_VALUE_REPLACES_LABEL` from signage core |
| Module name banner | `TypeStripV3` (signage core) |
| Knob / slider / switch name | `ML_CAPS_UNDER` from signage core |

When a `SegDisplayV3` is present on a module, the host control's parameter
label (e.g. `BPM` under the BPM knob) remains a normal `ML_CAPS_UNDER` text
label (text-mode), drawn **below** the host control per the locked port-label
anchor convention. The seg-display itself sits in a panel-mask aperture
elsewhere on the faceplate (typically above the host knob, or in a dedicated
display strip).

**Per-host rule:** never use both `ML_VALUE_REPLACES_LABEL` AND a
`SegDisplayV3` for the same parameter — pick one. `ML_VALUE_REPLACES_LABEL`
is the lighter / compact choice; `SegDisplayV3` is the heavier / hero
choice. Module-faceplate design decides per parameter.

### Integration test plan

1. Build a new revision `syb_modular_ui_prototype_<next>.py` adding the
   `syb_core/widgets/segdisplay*.py` modules and `SegDisplayV3` class.
2. Wire the BPM display on the clock module first (smallest blast radius).
3. `py_compile` clean.
4. Launch app, open a patch with a clock module, observe the BPM display.
5. **Compare visually against `demos/preview_engine_segmented_display_phase45.py`**
   — colours, tier sizes, per-segment bloom, ghost behaviour must match.
   Acceptable diff: minor anti-aliasing differences from QWidget vs
   QOpenGLWidget. NOT acceptable: missing ghost, radial halo over the whole
   digit, missing decimal point, wrong colour family.
6. Test state paths: idle → DIGITS_LIT → MIDI_MAPPED → MIDI_LEARNING → MODULATED
   → ERROR → DISABLED.
7. Once verified for clock-BPM: roll out to step_seq step-counter,
   channel_selector channel-index, MIDI channel readouts.
8. If pass: section LOCKED. Update memory
   `feedback-integration-plan-documented-tested` status board.
9. If fail: identify the broken layer, surgical fix, re-test.

---

## §7 Acceptance criteria

Section LOCKED only when ALL of the following are true:

- ✅ **Bauhaus-clean rectangular segments** — every segment is a rectangle
  primitive; no slanted / italic / decorative segment shapes.
- ✅ **Every digit legible at S tier** — S tier (8 px digit height) digits
  remain readable on matte + STANDARD theme at production scale; preview
  matrix demonstrates this.
- ✅ **Off-segments ghost visibly without overwhelming the lit segs** — the
  dim seg shadow is present at α 80-90 (variant-specific), proving the
  display is a real 7-seg silhouette and not a bespoke digit font. The ghost
  is dimmer than every lit-seg state including DIM.
- ✅ **Realistic-light-physics rectangle bloom per segment** — each lit
  segment renders its own rectangle bloom (elongated along the segment's
  long axis); NO isotropic radial halo over the whole digit. Off-segments
  do not bloom.
- ✅ **All 4 themes legible at every tier** — under OFF / SUBTLE / STANDARD /
  CINEMATIC themes, every tier × variant × state combination remains legible
  in the matrix; CINEMATIC at XL does not bleed beyond panel mask into the
  body fill at reflective finish.
- ✅ **Real-world reference cited per variant** — each of the three variants
  has multiple named real-world hardware references (HP HDSP-7503, Kingbright
  SA15-11SRWA, Lite-On LSHD-A101 plus secondary refs).
- ✅ **Phase 4.5 matrix renders every variant × tier × state × finish × theme**
  with no skipped slots (per `feedback-final-preview-all-variants`).
- ⏳ Mainline integration revision built, launched, visually verified against
  preview. **Currently pending.**

Until all eight pass, segmented displays are "preview-locked but
integration-pending."

---

## What's NEW vs what's CANONICAL

| Item | Source |
|---|---|
| 3 colour-family variants | **NEW** (this lock, 2026-05-20) |
| 5 tiers (XS/S/M/L/XL) | CANONICAL pattern (per `project-design-tier-vocabulary`); element-specific px values **NEW** |
| 9-state vocabulary | CANONICAL pattern (per `project-state-vocabulary`); seg-display-specific subset **NEW** |
| Per-segment rectangle bloom | CANONICAL principle (per `feedback-realistic-light-physics`); seg-display application **NEW** |
| `_additive_halo_rect` rectangle bloom primitive | CANONICAL (from `demos/bloom_theme.py`, added 2026-05-14) |
| Off-segment ghost layer | **NEW** (this lock, 2026-05-20) |
| Classic 7-seg `a..g` segment-letter map | **NEW** in PATCHWERK (canonical convention from real-world datasheets) |
| 0–9 + A–F hex digit lookup | **NEW** in PATCHWERK (canonical convention from real-world datasheets) |
| `SegDisplayV3` widget class | **NEW pending** (integration phase) |
| Co-existence rule with `ML_VALUE_REPLACES_LABEL` | **NEW** (this lock, 2026-05-20) |
