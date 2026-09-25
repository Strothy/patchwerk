# Fixtures

These were captured once from the legacy Python prototype (source commit in `index.json`). They are the behavioural contract for the rewrite. The extractor was a one-off script and is not part of this repo.

## `modules/<type>.json`: golden module traces

Each module's `process(inputs, dt)` was run on scripted inputs at a fixed `dt = 1/60`. The wall clock was replaced with a simulated clock that advances by `dt` each tick.

```jsonc
{
  "module_type": "lfo",
  "deterministic": true,        // false => uses RNG; compare statistically, not exactly
  "reads_wall_clock": false,    // true => module read time.*; sim clock was substituted
  "host_services": [],          // e.g. ["midi_service"]: fed by the host, so the traces are thin
  "scenarios": [{
    "name": "sweep",            // defaults | sweep | ramp | sweep[param=opt] | press[button]
    "params": {...},            // instance params at reset()
    "param_script": ["start_button"],  // params driven per tick (momentary buttons)
    "ticks": 600,
    "inputs":  { "<port>": [f64 per tick] },
    "outputs": { "<key>":  [f64 | null | "nan" | "inf" per tick] },
    "params_after": {...},      // params the module wrote back (status, counters)
    "error": null               // or {tick, traceback} if the legacy code threw
  }]
}
```

- The inputs are exactly what the module saw. Cable mapping and range scaling had already been applied, so replay them straight into the module.
- Floats are rounded to 12 significant digits, the inputs too, so modules that integrate (phase accumulators) drift slightly from the trace. Compare with `|a - b| <= 1e-6 * max(1, |a|, |b|)`.
- `funscript_recorder` has an extra `record_and_export` scenario that includes the `.funscript` files it wrote (`exported_files`).
- The modules fed by the host (MIDI, hotkey, manual trigger, status lights, scopes) produce flat traces here. Their behaviour needs hand-written specs.

## `manifests/<type>.json`

The legacy manifest for each module: ports, signal kinds, defaults, controls and ranges. This is the source for the new module definitions.

## `patches/`

Real saved patches and blueprints, used as the compatibility corpus for the patch loader. Their format is described in `docs/ORIGIN.md`.
