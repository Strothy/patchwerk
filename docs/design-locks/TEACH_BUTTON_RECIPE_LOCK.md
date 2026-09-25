# Teach Button — Recipe Lock

The canonical **labeled-action / "Teach" pushbutton** for the PATCHWERK design
language (the MIDI-learn archetype; reusable for Arm / Capture / Reset / Listen-
type labeled actions). Sits beside the round B1/B2 buttons as a NEW, label-driven
member of the button family. Brief: `docs/TEACH_BUTTON_DESIGN_BRIEF.md`.

Demos:
- `demos/teach_button_picker.py` — R1 wide picker (6 face variants TA1–TA6 × 4 states).
- `demos/teach_button_scale.py` — **this round** (TA5 only, label-driven scale across the FULL canonical XS/S/M/L/XL tiers).

---

## R1 — FACE PICK (LOCKED by user, 2026-05-25)

> ### ✅ Pick = **TA5 — SPLIT LEGEND + TELL-TALE LED**

The locked face: a wide flush-cap pushbutton with the legend split into two zones —
a small **radial amber tell-tale LED** on the left and the **engraved text legend**
to its right. The LED is the persistent state cue (studio talkback / arm-reference
idiom); the cap itself stays neutral dark.

**Armed cue = the LED, in amber — NOT red.** When teaching is active the tell-tale
LED lights amber (`#FFC652`) and breathes; red `#CC0000` stays reserved for
active/modulated/error elsewhere and is deliberately not used here.

**Anatomy (left → right):**
1. Chrome collar (Hybrid bevel `#525458 → #32343A → #101014`, TL→BR) + drop shadow.
2. Flush dark cap (`#35353B → #1A1A1D`, vertical) recessed into the collar.
3. Tell-tale LED well (dark bezel `#0C0C0E`) with a round amber lens — a **point
   source**, so its ARMED glow is a **radial** bloom (correct light physics).
4. Engraved text legend (engraved dark drop + lit face), in the legend region to
   the right of the LED.

**States (MIDI-learn vocabulary):**
| State | LED | Legend | Notes |
|---|---|---|---|
| IDLE | dim amber-brown (`#4A3A1A→#1A1408`) | `#8A7A50` dim warm-grey | resting |
| HOVER | dim | brighter warm-grey | neutral rim cue |
| **ARMED / LISTENING** | **amber, breathing @ 1.4 Hz** + radial bloom | `#FFF2D0` near-white warm | the key "actively waiting for MIDI" state |
| DISABLED | dark | dimmed (≈0.32 opacity) | module off / not teachable |

Why TA5 over the others: the tell-tale lamp gives a persistent, unambiguous
"it's listening" cue that survives any faceplate finish or bloom setting (the lit
LED reads even with bloom OFF), without lighting the whole cap — closest to a real
console talkback/arm button.

---

## SCALE ROUND v2 — proposed rules (TA5, 2026-05-25) — PENDING user confirm

> Verify live: `.\.venv\Scripts\python.exe .\demos\teach_button_scale.py`
> (rows = **XS/S/M/L/XL** height · cols = ARM/TEACH/LISTEN/MIDI LEARN · State/Finish/Bloom toggles)
>
> **v2 correction (2026-05-25):** the first scale demo showed only S/M/L. The locked
> cross-element tier vocabulary is the FULL FIVE **XS/S/M/L/XL** (project decision
> 2026-05-14 — applies to EVERY design-language element). This sheet now renders all
> five so the user can decide which tiers this labeled element officially supports.

**Principle:** the app's ad-hoc pill is a fixed **200×38**. The canonical button
instead fixes a set of **heights** (the canonical tier ladder) and lets the
**width follow the legend**, so short labels are compact and long labels wide —
all the same element.

### Fixed HEIGHT tiers (XS / S / M / L / XL)
Per-element px values are independent (a Teach-button XS height is not a knob/LED
XS size); only the five tier NAMES are shared. M = 38px reproduces the app default
control-row height, and the rest ladder around it at +8px — a real-world range of
labeled industrial pushbutton row heights.

| Tier | Height | Real legend font (`0.34·H`) | Use |
|---|---|---|---|
| **XS** | **22 px** | 7 px | sub-miniature / dense diagnostic strip |
| **S**  | **30 px** | 10 px | compact control row |
| **M**  | **38 px** | 13 px | **canonical** — app default control row (reproduces the existing 200×38 row height) |
| **L**  | **46 px** | 16 px | prominent / hero action on a spacious faceplate |
| **XL** | **54 px** | 18 px | master / section-level dominant action |

### Per-tier LEGIBILITY verdict — which tiers this element should support
| Tier | Verdict | Notes |
|---|---|---|
| **XS** | ⚠️ **POOR / impractical for a labeled button** | 7px legend (clamped to an 8px floor in-demo). Short single words (`ARM`) barely read; multi-word legends crowd the cap. **Recommend NOT adopting XS for the Teach button** — use **S** as the smallest practical labeled tier. (XS stays in the vocabulary as a slot, unused here.) |
| **S** | ✅ GOOD | 10px legend — clear for short/medium legends; long ones widen substantially. Smallest tier worth officially supporting. |
| **M** | ✅ GOOD (default) | 13px legend — fully legible at any length; matches the app's existing row height. **The default Teach tier.** |
| **L** | ✅ GOOD | 16px legend — very legible; emphasised teach/arm action. |
| **XL** | ✅ GOOD (use sparingly) | 18px legend — largest; reserve for ONE dominant action per faceplate so it stays a focal point, not a competitor to normal controls. |

> **Recommendation surfaced for the user pick:** officially support **S / M / L / XL**;
> treat **XS** as out-of-scope for this labeled element (legend too small to engrave
> legibly). Default tier = **M**. User confirms the supported set.

### Label-driven WIDTH (per tier height `H`)
```
font_px  = round(0.34 · H)                 # legend size: 7px XS · 10 S · 13 M · 16 L · 18 XL
text_w   = measured advance of the legend at font_px (bold, +1.2px letter-spacing)
led_zone = 1.15 · H                        # collar + tell-tale LED well + gap before legend
pad_r    = 0.42 · H                         # right margin after the legend
W_raw    = led_zone + text_w + pad_r
W        = clamp(W_raw, W_min, W_max)
  W_min  = 3.6 · H    # floor — short legends still read as a WIDE button
  W_max  = 7.5 · H    # ceiling — beyond this the legend elides ("MIDI LEAR…")
```

### Measured REAL proportions — from the demo (real px width · LED-zone split %)
| Label | XS (22) | S (30) | M (38) | L (46) | XL (54) |
|---|---|---|---|---|---|
| `ARM`        | 79 · 32% | 108 · 32% | 137 · 32% | 166 · 32% | 194 · 32% |
| `TEACH`      | 87 · 29% | 122 · 28% | 149 · 29% | 180 · 29% | 211 · 29% |
| `LISTEN`     | 98 · 26% | 137 · 25% | 167 · 26% | 202 · 26% | 237 · 26% |
| `MIDI LEARN` | 140 · 18% | 197 · 18% | 239 · 18% | 288 · 18% | 338 · 18% |

`ARM` hits the **W_min floor** (`3.6·H`) at every tier — short legends still read as a
wide button. No representative legend elides at any tier (the W_max ceiling only bites
for legends longer than `MIDI LEARN`). The geometry is self-similar, so real width
scales linearly with tier height; the **LED/legend split is constant per column**
(32/29/26/18%) and **independent of tier** — the height-keyed LED zone (`1.15·H`) keeps
the tell-tale lamp a constant fraction of the button for a given legend, while occupying
a larger fraction of a short button than a long one. This is intended: the lamp stays a
fixed physical size for a given row height regardless of legend length.

### Face geometry (× H) — frozen from the picker's TA5
```
corner radius = 0.28 · H        collar inset  = 0.08 · H  (min 2px)
LED radius    = 0.27 · H        LED centre x  = left + 0.62 · H
```

### Finish + bloom behaviour
- **Finish** (matte 0.0 / semi 0.5 / reflective 1.0) widens the ARMED LED bloom
  radius (×1.0 / ×1.25 / ×1.5) — matte is the default canonical finish.
- **Bloom** presets (OFF / SUBTLE / STANDARD / CINEMATIC) scale the LED glow alpha
  via `BloomTheme.learning_peak` (0 / 75 / 150 / 210). At **OFF** the lit LED lens
  still renders amber (only the halo is suppressed) so the armed state stays legible.
- ARMED breathing rate = **1.4 Hz** (reads as "listening", slower than an error alarm).

> These scale rules are a PROPOSAL surfaced for the broker-relayed user pick. The
> next phase (STATE preview) and the engine preview refine, then the recipe and
> picks are finalised here. Integration target: a shared
> `syb_core/design/render_action_button(...)` primitive (module-dev RELAY, later)
> so the app's `LearnTeachButtonV3` and the Faceplate Studio render from one source.

---

## STATE PREVIEW (TA5 @ M, 2026-05-25) — PENDING user confirm

> Verify live: `.\.venv\Scripts\python.exe .\demos\teach_button_state.py`
> (Section A = the 4 states side by side @ M (38px), legend "TEACH" · Section B =
> ARMED glow stress at ARM / TEACH / MIDI LEARN · live **Finish** + **Bloom** toggles ·
> ARMED tell-tale breathes @ 1.4 Hz)

All four MIDI-learn states rendered at the canonical **M tier (38 px high)**. The
tell-tale LED is the persistent state cue; the cap stays neutral dark in every
state (no amber wash on the cap — the amber lives only in the lamp). Red `#CC0000`
is **not used** anywhere here (reserved).

### Per-state recipe — fill · collar/border · legend · LED · glow
| State | Cap fill (vertical) | Collar / border | Legend | Tell-tale LED | Glow |
|---|---|---|---|---|---|
| **IDLE** | `#35353B → #1A1A1D` neutral dark | Hybrid bevel `#525458 → #32343A → #101014` + drop shadow | `#8A7A50` dim warm-grey (engraved drop `#000` @150) | dim amber-**brown** radial `#4A3A1A → #1A1408` (clearly OFF) | none |
| **HOVER** | brightened `#42424A → #202024` | top bevel **lifted** to `#62646A` (neutral rim cue — NOT amber) | brighter warm-grey `#B8A878` | dim, a touch warmer `#5A4622 → #1A1408` (still OFF, no emission) | none |
| **ARMED / LISTENING** | neutral dark (= idle) + finish gloss sheen | normal bevel + shadow | near-white warm `#FFF2D0` | **lit amber**, lens `#FFE0A0 → #FFC652 → #B47A20`, **breathing @ 1.4 Hz** | **radial** amber halo (point source), additive `Plus`; peak + radius per finish/bloom below |
| **DISABLED** | neutral dark, **no** gloss | bevel + shadow, all @ **0.32 opacity** | idle `#8A7A50`, dimmed by the 0.32 opacity | flat dark `#1B1814 → #0E0C09` (no warmth) | none |

Whole-element **DISABLED** is a single `painter.setOpacity(0.32)` wrapping the
entire button paint (collar + cap + LED + legend) — uniformly dimmed, reads as
"not teachable". HOVER is deliberately a **neutral** brightening (cap + top bevel),
never an amber tint, so amber stays exclusively the "it's listening" signal.

### How FINISH modulates the ARMED glow
Finish = the faceplate surface gloss (matte default). It does two things:
| Finish | ARMED bloom radius | Cap + swatch gloss sheen |
|---|---|---|
| **matte** (0.0) | `led_r · 2.6 · 1.0` | none |
| **semi** (0.5) | `led_r · 2.6 · 1.25` | moderate diagonal specular streak (alpha ≈73) |
| **reflective** (1.0) | `led_r · 2.6 · 1.5` | bright specular streak (alpha ≈108) — the **worst case**: bright glow on a glossy surface |

The gloss sheen renders on the cap (upper-band clip) and the faceplate swatch for
**all non-disabled** states, so the finish toggle is visibly active even at IDLE/
HOVER; the bloom-radius widen only affects the **ARMED** lamp halo.

### How BLOOM modulates the ARMED glow
Bloom preset scales the halo **alpha peak** via `BloomTheme.learning_peak`,
breathing-scaled `peak = learning_peak · (0.55 + 0.45 · lit)`:
| Bloom | `learning_peak` | ARMED halo |
|---|---|---|
| **OFF** | 0 | **no halo** — but the lit lens still renders amber, so ARMED stays legible |
| **SUBTLE** | 75 | small/dim breathing halo |
| **STANDARD** | 150 | canonical breathing halo (default) |
| **CINEMATIC** | 210 | broad/bright breathing halo |

Result of the stress test (Section B): the lit lens guarantees the ARMED state is
unambiguous at **every** finish × bloom combination — even bloom OFF on a
reflective surface reads as "listening" because the lamp itself is lit amber; the
halo is purely an intensity amplifier, not the primary cue. Breathing rate stays
**1.4 Hz** (slower than an error alarm) in all combinations.

---

## ENGINE PREVIEW (TA5 on a real midi_cv faceplate, 2026-05-25) — TRUE PRODUCTION FIDELITY

> Verify live: `.\.venv\Scripts\python.exe .\demos\preview_engine_teach_button.py`
> (window: "Teach Button TA5 — Engine Preview (real MIDI faceplate)")
> TWO real midi_cv faceplates side by side — **LEFT = Teach IDLE · RIGHT = Teach
> ARMED/LISTENING** (tell-tale breathing @1.4 Hz, module signage in the LEARNING
> state). Live **Finish** (matte/semi/reflective) + **Bloom** (OFF/SUBTLE/STANDARD/
> CINEMATIC) toggles. The TA5 button is marked the **SELECTABLE** design element.

The final design phase: the locked TA5 button rendered **in context, at true
production pixels** (NOT the +35 % upscaled picker/scale/state sizing) on a
faithfully replicated production faceplate, so the ARMED amber can be judged
against the real dark body AND the reflective worst case.

**Faceplate replicated from the verified app** (`patchwerk_R0_035`; values hardcoded
in the demo, NO `main_app`/`modules` import):

| Element | Recipe (real px / hex) |
|---|---|
| Geometry | **midi_cv = Uw 2 · Ur 1 → 272 × 750 px** (`Uw·140 − 8` width; 750 px Ur-1 slot) |
| Body | `#1E2024` flat fill, square corners, no border |
| Bevel edges | 4 cosmetic 1px lines — top `#525458` · left `#4A4C50` · bottom `#0D0D10` · right `#131416` |
| Drop shadow | `#3A3A3A` @ 40 % (alpha 102), offset +2,+2 |
| Header strip | 36 px high (`_FACEPLATE_HEADER_H`), fill `#161618`, `#2A2A2A` separator, title `MIDI CV` in Arial 8 ALL-CAPS `#AAAAAA` letter-spacing +2 |
| **Teach button position** | centred, at **y = `_FACEPLATE_HEADER_H + 10` = 46** (exactly where the app places its 200×38 pill) |
| Fasteners | 4 corner PHILLIPS/STEEL screws, 8 px dia, 13 px inset |
| Output jack | JackV3 `CHROME_RING_STANDARD`, M tier (outer_r 10) + `OUT` signage; lit amber throat when the module is teaching |
| Signage states | idle `#E6E8EC` α220 · **learning `#E0A24E` α240** (the ARMED panel shows the whole-module LEARNING signage, as the app does) |
| Body controls | the real midi_cv on-node set — `value` display (green-phosphor readout), `rx` activity LED, `enabled`/`invert` param buttons |

**Engine-preview verdict (CONFIRMED):** at true M-tier px (38 px high, **151 px wide
for the `TEACH` legend** — label-driven, replacing the legacy fixed 200×38 pill) the
TA5 button reads cleanly in the header zone. The radial amber tell-tale is
unambiguous in **every** finish × bloom combination — including bloom **OFF on a
reflective faceplate** — because the lit lens itself renders amber (the halo is only
an intensity amplifier). Red `#CC0000` appears nowhere. The button paint is the
**byte-for-byte same `paint_ta5_state` recipe** as the state preview, ported verbatim
at real px → the engine preview adds no new design decision, it validates the locked
one in production context.

---

## ✅ COMPLETE LOCKED RECIPE — TA5 "Teach" labeled-action button

> The canonical labeled-action / MIDI-learn pushbutton for PATCHWERK. Reusable for
> Arm / Capture / Reset / Listen-type labeled actions. Survives the engine preview.

### Face geometry (× tier height `H`)
```
corner radius = 0.28 · H        collar inset  = 0.08 · H  (min 2px)
LED radius    = 0.27 · H        LED centre x  = left + 0.62 · H
```
Anatomy (left→right): chrome collar (`#525458 → #32343A → #101014`, TL→BR) + drop
shadow → flush dark cap (`#35353B → #1A1A1D`, vertical) recessed by the collar inset
→ tell-tale LED well (dark bezel `#0C0C0E`, point-source lens) → engraved text legend.

### Label-driven WIDTH (per tier height `H`)
```
font_px  = round(0.34 · H)                         # legend size
text_w   = advance of the legend (bold, +1.2 px letter-spacing) at font_px
W_raw    = 1.15·H (LED zone) + text_w + 0.42·H (right pad)
W        = clamp(W_raw, 3.6·H (floor), 7.5·H (ceiling → legend elides))
```
Self-similar across tiers; short legends (`ARM`) sit on the `3.6·H` floor and still
read as a wide button. The LED/legend split is constant per legend, independent of
tier (the LED stays a fixed physical fraction of the row height).

### Palette
Hybrid body `#1E2024` · bevel `#525458 / #4A4C50` · canvas `#0F0F12`. Accent = amber
`#FFC652` (`#FFE0A0` lit-core highlight, `#B47A20` deep edge). Legend `#8A7A50` idle /
`#B8A878` hover / `#FFF2D0` armed. **Red `#CC0000` is reserved (active/modulated/error
elsewhere) and is NOT used by this element.**

### 5 SCALE TIERS — fixed HEIGHT, label-driven width (canonical XS/S/M/L/XL)
| Tier | Height | Legend font (`0.34·H`) | Supported? |
|---|---|---|---|
| XS | 22 px | 7 px | ⚠️ **out of scope** — legend too small to engrave legibly |
| **S** | 30 px | 10 px | ✅ smallest officially-supported tier |
| **M** | **38 px** | 13 px | ✅ **DEFAULT** — app control-row height (= legacy 200×38 row) |
| **L** | 46 px | 16 px | ✅ prominent / hero teach-arm action |
| **XL** | 54 px | 18 px | ✅ master / section action (use sparingly, ONE per faceplate) |

Supported set = **S / M / L / XL** (default **M**); **XS dropped** for this labeled
element (slot stays in the shared vocabulary, unused here).

### 4 STATES (MIDI-learn vocabulary) — the tell-tale LED carries the state
| State | Cap fill | Collar/border | Legend | Tell-tale LED | Glow |
|---|---|---|---|---|---|
| **IDLE** | `#35353B → #1A1A1D` neutral dark | Hybrid bevel + drop shadow | `#8A7A50` (engraved drop `#000` α150) | dim amber-**brown** `#4A3A1A → #1A1408` (clearly OFF) | none |
| **HOVER** | brightened `#42424A → #202024` | top bevel lifted `#62646A` (neutral, NOT amber) | `#B8A878` | dim, a touch warmer `#5A4622 → #1A1408` (still OFF) | none |
| **ARMED / LISTENING** | neutral dark + finish gloss | normal bevel + shadow | `#FFF2D0` near-white | **lit amber** lens `#FFE0A0 → #FFC652 → #B47A20`, **breathing @ 1.4 Hz** | **radial** amber halo (point source), additive `Plus` |
| **DISABLED** | neutral dark, no gloss | bevel + shadow @ **0.32 opacity** | idle, dimmed by the opacity | flat dark `#1B1814 → #0E0C09` | none |

DISABLED = a single `setOpacity(0.32)` wrapping the whole paint. HOVER is a
deliberately **neutral** brightening (never an amber tint) so amber stays exclusively
the "it's listening" signal. ARMED legend stays the legend word — the LED, not the
word, signals the state (so the same button can carry any legend).

### Finish + bloom behaviour
- **Finish** (matte 0.0 / semi 0.5 / reflective 1.0): adds a cap + faceplate gloss
  sheen on all non-disabled states (alpha ≈ 73 semi / 108 reflective), and widens the
  ARMED LED bloom radius ×1.0 / ×1.25 / ×1.5. Matte is the **default canonical finish**.
- **Bloom** (OFF / SUBTLE / STANDARD / CINEMATIC): scales the ARMED halo alpha peak via
  `BloomTheme.learning_peak` (0 / 75 / 150 / 210), breathing-scaled
  `peak = learning_peak · (0.55 + 0.45·lit)`. At **OFF** the lit lens still renders
  amber (only the halo is suppressed) so ARMED stays legible. STANDARD is the default.
- ARMED breathing rate = **1.4 Hz** (reads as "listening", slower than an error alarm).

### Integration target (the WYSIWYG end state)
A shared `syb_core/design` primitive — **`render_action_button(p, x, y, w, h, label,
*, state, reflectivity, bloom)`** — that both the app's `LearnTeachButtonV3` widget and
the Faceplate Studio element paint through (same pattern as `render_led` /
`paint_jack` / `render_seven_seg`). Reference paint = `paint_ta5_state` in
`demos/teach_button_state.py` (= `demos/preview_engine_teach_button.py`, real px).
Consumers: app MIDI-learn button (`_make_midi_learn_button` → `LearnTeachButtonV3`,
midi_cc/midi_cv/midi_lfo/midi_note_gate, header y=46) + Studio `variant="teach"`
placeholder pill (`_paint_teach_button`). **Build lands via the module-dev RELAY
AFTER the user approves this engine preview** (held per the brief).

---

## Workflow status
- [x] R1 wide picker → **TA5 locked** (user, 2026-05-25)
- [x] **Scale round** — TA5 label-driven across XS/S/M/L/XL; supported set = **S/M/L/XL** (XS dropped), default **M** (user-approved 2026-05-25) — `demos/teach_button_scale.py`
- [x] **State preview** — 4 states (IDLE/HOVER/ARMED/DISABLED) @ M × finish × bloom, ARMED breathing @1.4Hz, glow stress-tested vs reflective worst-case (user-approved 2026-05-25) — `demos/teach_button_state.py`
- [x] **Engine preview** — TA5 in context on a real midi_cv faceplate (bevel + shadow + real Uw/Ur 272×750 + header/signage/jacks), TRUE production px, IDLE + ARMED breathing live, finish/bloom toggles — `demos/preview_engine_teach_button.py` (**USER-APPROVED 2026-05-25** — "looks good")
- [x] **Recipe finalised** — complete locked recipe recorded above (face geometry · palette · 5 tiers · 4 states · finish/bloom · integration target)
- [x] **RELAYs SENT 2026-05-25** (broker, on behalf of demo-agent, after user approval): faceplate-studio (replace placeholder pill) · mainline (align `LearnTeachButtonV3`) · module-dev [HOLD] (shared `render_action_button` primitive) — see CLAUDE.md §RELAY.

> ✅ **TEACH BUTTON DESIGN LOCKED** — all 4 phases user-approved 2026-05-25 (R1 → TA5 · scale S/M/L/XL · 4 states · engine preview). Integration handed off via the 3 RELAYs above.
