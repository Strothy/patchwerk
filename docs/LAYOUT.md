# Module layout

**The rule that matters most: nobody places anything by hand.** A module's faceplate is the output of one pure function, `layout(manifest)` in `src/core/layout.ts`. It returns a box for every control and jack, in grid cells. The app draws those boxes. The gallery, and any future editor, uses the same function. There are no per-module renderers and no pixel offsets.

The legacy app was abandoned over faceplate layout. Six placement systems fought each other, widths were picked by hand, and widget sizes disagreed between documents (see ORIGIN.md). This document exists so that doesn't happen again.

## The grid

- **One cell is 20 px** at zoom 1. Every box position and size is a whole number of cells.
- **Height is fixed at 20 cells**, like a Eurorack row. From the top down:
  - a 2-cell top rail with the name and screws
  - the controls zone
  - the jack zone
  - a 1-cell bottom rail
- **Width is in HP (1 HP = 1 cell).** It is always computed: the smallest width, from 4 HP up, that fits the content in the fixed height. A module that needs more than 64 HP is a layout error, and the test fails on it. The biggest legacy module, `edge_mode` (26 inputs, 40 controls), needs 49 HP.

## Widget footprints

Each widget has one footprint, which includes its label and value readout. Painting reads the same table, so what's drawn can never outgrow its box.

| Widget | Cells (w × h) | Used for |
|---|---|---|
| knob S | 2 × 3 | a control hinted `small`, and every range bound: an `x_min` or `x_max` beside an `x` control |
| knob M | 3 × 4 | every knob and slider by default |
| knob L | 4 × 5 | a control hinted `primary` |
| selector | 4 × 2 (5 × 2 if an option has more than 7 characters) | selector controls |
| button | 3 × 2 | button controls, latched or momentary |
| jack | 3 × 3 | every port |
| screen | full width × 7, at least 14 HP | the scope display |
| unsupported | 3 × 2 | any control type without a widget yet, shown as a labelled stub so nothing silently vanishes |

Changing a footprint is a deliberate, global decision. The gallery and the test re-run over all 80 modules straight away.

## Placement

1. **Screen first.** A module with a screen gets it at the top of the controls zone, at full width.
2. **Controls:**
   - Hinted `primary` controls come first, in hint order. The rest follow in manifest order.
   - They are packed left to right in rows (shelves), and each row is centred.
   - Controls with `show_on_node: false` or `advanced_only: true` are left off the face and belong in the settings panel.
3. **Jacks:**
   - They sit at the bottom, above the rail.
   - Inputs form a block on the left and outputs a block on the right, in manifest order, row by row.
   - The split of columns between inputs and outputs is chosen to use the fewest rows.
4. **Width:** the smallest HP where the controls and the jacks both fit in the fixed height.

## Hints (data only, optional)

A manifest may carry `"face": { "primary": [...], "small": [...], "order": [...], "hide": [...] }`. These are control keys only. They never hold coordinates, sizes in pixels, or code.

## Look

The look is our own take on Eurorack in the Cylix style:
- dark instrument panels with Cylix's accent corner brackets
- screws in the rails
- inputs with neutral jack rings, outputs with accent rings, and IN/OUT labels on their blocks

Styling only paints the boxes. Changing the look (skins, contrast, tracker #12) never moves anything.

## Checks

- `src/core/layout.test.ts` lays out every manifest in `fixtures/manifests`. It fails on:
  - an overflow past 64 HP
  - a box outside the face, or two boxes that overlap
  - any visible control or port without a box
- **The gallery** (`npm run dev`, then open `http://localhost:5183/?gallery`, also linked from the lab) draws all 80 faces with the real layout and the real widgets. Design feedback goes there and becomes a rule change here, never a one-module fix.
