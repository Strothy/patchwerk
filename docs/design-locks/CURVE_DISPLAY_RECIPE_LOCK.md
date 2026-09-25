# Curve / Transfer-Function Display — Recipe Lock

_Design round in progress — DEMO_CURVE_DISPLAY_DESIGN (demo-agent)._
_Brief: `docs/CURVE_DISPLAY_DESIGN_BRIEF.md`. Sibling bar: `docs/SCOPE_INSET_RECIPE_LOCK.md`,
`docs/SEGMENTED_DISPLAY_RECIPE_LOCK.md`._

This is the canonical recipe for the **curve / transfer-function display** — the
on-screen graph inset that plots **output-vs-input** for a shaping function
(waveshaper transfer curve; the `curve_editor` control; future ADSR/LFO shape
previews). It is the screen-graph sibling of the locked 7-segment + scope-inset
displays. End-state = a pure-Qt `syb_core/design/displays.py:render_curve_display`
extracted by mainline after lock (same split as `render_seven_seg`).

The display is an **LCD/phosphor graph inset** sitting inside the locked
**FLAT_BEZEL_LCD** bezel (the scope-inset frame — shared container, NOT re-picked
here). This recipe owns the **interior graph treatment**: field, graticule,
identity reference, curve stroke, playhead, edit handles, states, tiers,
finish/bloom.

---

## Picks log (appended as locked)

### R1 — LOOK / silhouette  ·  picked 2026-05-26
**Picked: Variant C — `BLUEPRINT_EDITOR`** (the current app waveshaper look).

- Demo: `demos/curve_display_R1_look.py` (4 variants A/B/C/D on Hybrid-Palette
  faceplate tiles, animated playhead, shape cycler).
- Defining traits of C: software design-tool aesthetic — 5×5 grid, **dashed
  identity diagonal** (y=x reference), curve drawn as a clean editor polyline,
  amber playhead marker. Modelled on DAW/plugin curve editors (Ableton, transfer
  shapers) — "this is something you author a curve in", not a passive readout.
- Considered + not picked: A `CURVE_TRACER_PHOSPHOR` (Tek-576 curve tracer look,
  on-palette green), B `DSO_MATH_LCD` (modern dotted-grid clean), D
  `VINTAGE_AMBER_FUNCTION` (warm amber scope).

### R1b — PALETTE resolution  ·  picked 2026-05-26
**Picked: Blueprint STRUCTURE + on-palette PHOSPHOR GREEN.**

The locked look = Variant C's *structure* (software-editor feel) recoloured to the
canonical phosphor palette — NOT the blue shown in the demo. This honors the brief
("don't invent a new palette"; phosphor-green default) while keeping the
distinguishing blueprint character.

**Locked R1 look — the canonical curve display:**

| Element | Recipe |
|---|---|
| **Bezel / frame** | Shared locked `FLAT_BEZEL_LCD` (scope-inset frame); NOT re-picked here. |
| **Screen field** | `#070A10` (canonical LCD off-black; same as scope-inset FLAT_BEZEL_LCD). |
| **Graticule** | **5×5** even grid (the blueprint density — distinct from scope's 8×8), neutral cool-grey `#22262E` (no blue tint — on-palette neutral, sibling of scope grid greys). |
| **Identity diagonal** | **dashed y=x reference line**, faint phosphor-green-grey `rgba(91,255,140,55)` — the KEY blueprint signature element (scope inset has none). Reads as "transfer function reference". |
| **Curve stroke** | **phosphor green `#5BFF8C`** (canonical), clean anti-aliased polyline, round cap/join. (Width + bloom set in the scale + finish/bloom rounds.) |
| **Playhead marker** | vertical line at current input x + intersection dot. Colour set in the state round (amber from blueprint vs neutral — to be confirmed). |
| **Edit handles** | `curve_editor` mode only — node dots + selected/hover styling; set in the state round. |
| **Character** | "a graph you author a curve in" — software design-tool, on the locked phosphor palette. |

Remaining rounds: **scale** (tier sizes + how stroke/grid/handle scale), **state**
(idle/active/edit/disabled + modulated/learning/error + playhead & handle colours),
**finish/bloom** (matte/semi/reflective × OFF/SUBTLE/STANDARD/CINEMATIC), **engine
preview** on a real waveshaper faceplate, then **lock**.

### SCALE — tier sizes + scaling rules  ·  locked 2026-05-26

The inset is sized by the **host rect** (the waveshaper preview is a large
body-width box, not a fixed tier area); the **tier** selects how stroke / handle /
grid / playhead-dot scale. Canonical tier table:

| Tier | Area W×H | Bezel px | Curve stroke | Handle r | Grid div | Diag w | Playhead dot r |
|---|---|---|---|---|---|---|---|
| **XS** | 96×72   | 1 | 1.0 | 3.0 | **4×4** | 0.8 | 1.8 |
| **S**  | 128×96  | 2 | 1.3 | 4.0 | **4×4** | 0.8 | 2.0 |
| **M**  | 176×132 | 2 | 1.6 | 5.0 | **5×5** | 1.0 | 2.4 |
| **L**  | 240×180 | 3 | 2.0 | 6.0 | **5×5** | 1.0 | 2.8 |
| **XL** | 320×240 | 4 | 2.5 | 7.0 | **5×5** | 1.2 | 3.2 |

**Scaling rules (locked):**
- **Grid density THINS on small tiers** — 4×4 at XS/S, the blueprint 5×5 from M up
  (user pick: tiny screens shouldn't look cluttered). Grid is **uniform thin**
  cool-grey (no major/minor distinction); the dashed identity diagonal is the only
  emphasised reference line.
- **Curve stroke width** scales 1.0→2.5 px across tiers.
- **Edit-handle radius** scales 3→7 px (the app's current 6 px ≈ L tier).
- **Bezel px** matches the SCOPE_INSET tier table (1/2/2/3/4).
- Field inner **pad** = `max(4, area_w × 0.035)` (proportional margin).
- The display takes the **host w/h verbatim**; tier only drives the scalar params
  above — so the big waveshaper box renders at tier `XL` scaling in a ~440×320 rect.

### STATE — vocabulary  ·  locked 2026-05-26

| State | Trigger (host) | Treatment | Animation |
|---|---|---|---|
| **idle** | function set, no live input | curve at ×0.82 brightness; playhead line dimmed, no dot | static |
| **active** | live input being shaped | full-brightness curve; **phosphor-white** playhead line + dot riding the curve at the input position | playhead sweeps |
| **edit** | `curve_editor` (shape == "custom") | editor handles shown (node dots); selected = white ring, hover = pale-yellow, dragging = teal, idle handle = amber `#FFAA00` | static |
| **modulated** | shape param CV-modulated | curve brightness + glow breathe ×0.82→1.0 @ **0.4 Hz** | breathe |
| **learning** | a curve param under MIDI-learn | amber corner marker (top-right triangle) pulsing @ **0.6 Hz** | marker pulse |
| **disabled** | module disabled | whole inset opacity 0.32, curve desaturated to grey | static |
| **error** | renderer raised / bad data | red `#CC0000` rim pulse @ **1.0 Hz** + centred `!`; curve dimmed, playhead hidden | rim pulse |

- **Playhead = phosphor white-green** (line `rgba(200,255,220,150)`, dot
  `#E1FFEB`). Amber playhead is a non-canonical option (`playhead_amber=True`)
  kept available but NOT the default — amber stays the MIDI/learning accent
  (sparse-red/amber discipline).
- **Sparse-red:** red appears ONLY in `error`. All other states stay neutral /
  phosphor / amber-accent.
- Pulse rates borrowed from `LED_RECIPE_LOCK` / `SCOPE_INSET` (0.4 / 0.6 / 1.0 Hz).

### FINISH / BLOOM  ·  locked 2026-05-26

- **Canonical default = matte + SUBTLE** (`reflectivity=0.0`, `bloom=None`→SUBTLE),
  matching the locked `render_seven_seg` / `render_time_display` siblings — the app
  + Studio call it this way and get the locked look.
- `reflectivity > 0.05` → faint white top-gloss over the field (semi/reflective).
- `bloom` resolves None→SUBTLE / `"OFF|SUBTLE|STANDARD|CINEMATIC"` / 0..1 intensity /
  any object with `.name`. Bloom = linear-stroke phosphor underglow on the curve
  (additive `Plus` wide soft shell + mid shell + crisp core). Peak alphas:
  OFF 0 / SUBTLE 22 / STANDARD 40 / CINEMATIC 64 (+1.2× core width at CINEMATIC).
- Like the sibling primitives, the recipe does **NOT** read any global theme — the
  caller passes theme-derived args.

---

## Canonical source (lift target for mainline)

`demos/curve_display_recipe.py` — defines, pure-Qt, no main_app/modules import:

- `render_curve_display(p, x, y, w, h, points, *, marker=None, handles=None,
  selected_handle=-1, hover_handle=-1, drag_handle=-1, state="idle", tier="M",
  reflectivity=0.0, bloom=None, show_grid=True, t=0.0, playhead_amber=False)`
- `paint_flat_bezel(p, outer, bezel_px, reflectivity)` (shared FLAT_BEZEL_LCD)
- `CURVE_TIERS`, palette consts (`FIELD_BG`, `GRID_MINOR`, `GREEN_PHOSPHOR`, …)
- `curve_value` / `sample_curve` (waveshaper shape math — copied, for the demos)

Demo windows (verification):
- `demos/curve_display_R1_look.py` — R1 look picker (4 variants).
- `demos/curve_display_studio.py` — consolidated scale + state + editor + finish/bloom.
- `demos/preview_engine_curve_display.py` — engine preview on a real WAVESHAPER faceplate.

Offscreen smoke: 4,725 renders clean (9 shapes × 5 tiers × 7 states × 3 finishes ×
5 bloom settings).

---

## Integration plan — what mainline does (follow-on task, same split as 7-seg)

1. **Extract `render_curve_display` → `syb_core/design/displays.py`** verbatim from
   `demos/curve_display_recipe.py` (drop the demo-only `curve_value`/`sample_curve`;
   those stay caller-side). Pure painter, no `main_app` import — the same contract
   as `render_seven_seg` / `render_time_display` / `render_scope_bezel`. `bloom=None`
   + `reflectivity=0` reproduce the locked matte+SUBTLE look.
2. **`waveshaper` static preview** (`modules/builtin/waveshaper/renderer.py`
   `_build_waveshaper_preview` equivalent) — replace the hand-rolled `add_rect` bg +
   `add_path` green curve + `add_rect` marker with a single curve-display item that
   delegates its paint to `render_curve_display(...)`. Sample the curve via the
   existing `ctx.waveshaper_curve_value`; pass `marker = phase_out`, `state` derived
   from host (idle/active/disabled/error), `tier = "XL"`.
3. **`WaveshaperCurveEditorItem`** (`main_app/syb_canvas_items.py`) — its `paint`
   delegates to `render_curve_display(..., handles=<custom_points>,
   selected_handle/hover_handle/drag_handle, state="edit")`. Interaction (drag/add/
   delete/Catmull-Rom eval, `_HANDLE_R`, hit-testing) stays in the item; only the
   paint is shared. Note `_HANDLE_R=6` ≈ the L-tier handle (consistent).
4. **Faceplate Studio** — `StudioCustomRenderContext.add_curve_editor` +
   `_paint_display` `curve` variant dispatch to `render_curve_display` (it currently
   falls back to a plain rect / sub-canvas template), so the Studio renders the real
   curve display. The app's generic path can then draw `display` elements with it.
5. Verify: `py_compile`, offscreen smoke, `_node_dump` byte-identical sweep for all
   non-waveshaper modules, the waveshaper item delta confined to the preview, user
   visual-verify against `demos/preview_engine_curve_display.py`.

**The demo round owns DESIGN + recipe lock only; the syb_core extraction +
wiring are follow-on mainline / faceplate-studio tasks (RELAY'd).**

---

## What's NEW vs CANONICAL

| Item | Source |
|---|---|
| Curve-display primitive (blueprint structure + phosphor green) | NEW — this lock |
| 5-tier scale table + grid-thins-on-small-tiers rule | NEW — this lock |
| State vocab (idle/active/edit/modulated/learning/disabled/error) for a graph | NEW — this lock |
| Dashed identity diagonal (y=x) as the transfer-function signature | NEW — this lock |
| FLAT_BEZEL_LCD bezel | CANONICAL (`SCOPE_INSET_RECIPE_LOCK`) |
| Phosphor-green `#5BFF8C` / LCD field `#070A10` | CANONICAL (scope-inset / LED locks) |
| Linear-stroke phosphor bloom | CANONICAL (`feedback-realistic-light-physics`) |
| Pulse rates 0.4 / 0.6 / 1.0 Hz | CANONICAL (LED / scope-inset locks) |
| Sparse-red (error only) | CANONICAL (`project-patchwerk-accent-sparse`) |
| 5-tier XS/S/M/L/XL vocabulary | CANONICAL (`project-design-tier-vocabulary`) |
| matte+SUBTLE canonical default | CANONICAL (`render_seven_seg` / `render_time_display`) |
