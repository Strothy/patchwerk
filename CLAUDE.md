# Patchwerk: notes for contributors and coding agents

Patchwerk is a modular patching app for motion hardware. It is a clean Rust + Tauri rewrite of a legacy Python prototype.
- [docs/ROADMAP.md](docs/ROADMAP.md): the plan and the architecture.
- [docs/ORIGIN.md](docs/ORIGIN.md): what was salvaged, the engine semantics, and the **safety requirements**.

## Layout
- `crates/engine`: the engine. Plain Rust with no Tauri: modules, the patch graph, cable mapping, and the fixed-rate `Runner` thread.
- `src-tauri`: the app shell. Tauri commands wrap the Runner, and a `Channel` streams watched values to the UI.
- `src`: the React 19 + TypeScript UI. Pure logic lives in `src/core/*.ts`, each with a `*.test.ts` beside it.
- `fixtures`: golden traces recorded from the legacy app, plus the legacy manifests and patches. The behavioural contract.
- `e2e`: CDP-driven suites against the running dev app. They drive it through `window.patchwerkApp`, which exists in dev builds only.

## Checks
- `cargo test -p patchwerk-engine`: the engine, plus every ported module against its fixtures.
- `npm run lint && npm test && npm run build`: the UI.
- `node e2e/run.mjs`: needs the app running, started with `Patchwerk Dev.cmd` or `npm run tauri dev -- --config tauri.devtools.json`.

Ports: Vite 5183, CDP 9223. They are not the defaults, so Patchwerk can run beside other Tauri projects.

## Porting a module
1. Copy `fixtures/manifests/<type>.json` to `crates/engine/manifests/`.
2. Write its `Module` impl in `crates/engine/src/modules/`.
3. Add one line to `TYPES` in `modules/mod.rs`.
4. `cargo test -p patchwerk-engine` must pass its fixture scenarios.

Modules never read the wall clock. They integrate `dt`.

## Rules
- **Safety first.** Any change that touches device output must keep the rules in ORIGIN.md: rest is 0, every exit path sends rest, a heartbeat, limits on the host, and an e-stop that doesn't depend on the UI.
- The engine thread owns timing and output. The UI never schedules device writes.
- **Comments say why.** A deliberate shortcut gets a `ponytail:` comment that names its ceiling and the upgrade path.
- Commits are one descriptive sentence, then the details.
- No Python in this repo.
