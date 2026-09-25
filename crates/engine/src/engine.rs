//! The patch graph at run time: module instances in dependency order, cable input resolution, one tick.
use crate::manifest::{Control, Manifest};
use crate::module::{Io, Module};
use crate::modules::Registry;
use crate::patch::{num, ModuleInst, Patch};
use crate::signal::clamp;
use serde_json::{Map, Value};
use std::collections::{HashMap, VecDeque};

struct Cable {
    src: usize,
    src_port: String,
    dst_port: usize,
    midi: bool,
}

struct Node {
    inst: ModuleInst,
    manifest: &'static Manifest,
    module: Box<dyn Module>,
    params: Map<String, Value>,
    inputs: Vec<f64>,
    out: Vec<(&'static str, f64)>,
    cables: Vec<Cable>,
}

impl Node {
    fn output(&self, port: &str) -> f64 {
        self.out.iter().find(|(k, _)| *k == port).map_or(0.0, |(_, v)| *v)
    }
}

pub struct Engine {
    nodes: Vec<Node>,
    order: Vec<usize>,
    by_id: HashMap<String, usize>,
    pub sim_time: f64,
}

/// One value the UI watches: a module's resolved input or its output, refreshed every tick.
#[derive(Debug, Clone, serde::Serialize, PartialEq)]
pub struct Tap {
    pub module: String,
    pub port: String,
    pub kind: &'static str, // "in" | "out"
}

impl Default for Engine {
    fn default() -> Self {
        Engine { nodes: Vec::new(), order: Vec::new(), by_id: HashMap::new(), sim_time: 0.0 }
    }
}

impl Engine {
    /// Rebuild from a patch. A module whose id and type survive keeps its state (a live edit does not restart every LFO),
    /// as the legacy runtime's `preserve_from` did. Unknown module types are left out and read as 0.
    pub fn load(&mut self, patch: &Patch) {
        let reg = Registry::get();
        let mut old: HashMap<String, Node> = std::mem::take(&mut self.nodes).into_iter().map(|n| (n.inst.id.clone(), n)).collect();
        for inst in &patch.modules {
            let Some(manifest) = reg.manifest(&inst.kind) else { continue };
            let mut params = manifest.param_defaults.clone();
            params.extend(inst.params.clone());
            let node = match old.remove(&inst.id) {
                Some(mut n) if n.inst.kind == inst.kind => {
                    n.inst = inst.clone();
                    n.params = params;
                    n.cables.clear();
                    n
                }
                _ => {
                    let mut module = reg.make(&inst.kind).expect("registered type");
                    module.reset();
                    Node { inst: inst.clone(), manifest, module, params, inputs: vec![0.0; manifest.input_ports.len()], out: Vec::new(), cables: Vec::new() }
                }
            };
            self.nodes.push(node);
        }
        self.by_id = self.nodes.iter().enumerate().map(|(i, n)| (n.inst.id.clone(), i)).collect();
        for c in &patch.connections {
            let (Some(&src), Some(&dst)) = (self.by_id.get(&c.src_module), self.by_id.get(&c.dst_module)) else { continue };
            let Some(dst_port) = self.nodes[dst].manifest.input_ports.iter().position(|p| p.name == c.dst_port) else { continue };
            let midi = self.nodes[src].inst.kind == "midi_cv" && self.nodes[src].params.get("_midi_map").and_then(|v| v.as_str()) == Some("true");
            self.nodes[dst].cables.push(Cable { src, src_port: c.src_port.clone(), dst_port, midi });
        }
        self.order = self.topological_order();
    }

    /// Transport stop / a fresh start: every module back to its reset state, the clock to 0.
    pub fn reset(&mut self) {
        for n in &mut self.nodes {
            n.module.reset();
            n.out.clear();
        }
        self.sim_time = 0.0;
    }

    /// Kahn's order. A cycle is broken by dropping its edges: those modules read their partners' previous-tick outputs.
    fn topological_order(&self) -> Vec<usize> {
        // ponytail: the legacy app also pre-excluded two named feedback routes (lfo.out -> lfo.amp/rate/..., clock_divider_stack
        // clock -> div_clock); here any cycle is broken generically, which can put one module of such a pair a tick apart.
        let n = self.nodes.len();
        let mut deps: Vec<Vec<usize>> = vec![Vec::new(); n];
        let mut outgoing: Vec<Vec<usize>> = vec![Vec::new(); n];
        for (dst, node) in self.nodes.iter().enumerate() {
            for c in &node.cables {
                if !deps[dst].contains(&c.src) {
                    deps[dst].push(c.src);
                    outgoing[c.src].push(dst);
                }
            }
        }
        let mut order = Vec::with_capacity(n);
        let mut placed = vec![false; n];
        loop {
            let mut ready: VecDeque<usize> = (0..n).filter(|&i| !placed[i] && deps[i].is_empty()).collect();
            while let Some(i) = ready.pop_front() {
                if placed[i] {
                    continue;
                }
                placed[i] = true;
                order.push(i);
                for &next in &outgoing[i] {
                    deps[next].retain(|&d| d != i);
                    if deps[next].is_empty() && !placed[next] {
                        ready.push_back(next);
                    }
                }
            }
            if order.len() == n {
                return order;
            }
            // what is left is stuck on a cycle: drop the stuck -> stuck edges and go on
            for d in deps.iter_mut() {
                d.retain(|&src| placed[src]);
            }
        }
    }

    pub fn tick(&mut self, dt: f64) {
        self.sim_time += dt;
        for oi in 0..self.order.len() {
            let i = self.order[oi];
            let resolved = self.resolve_inputs(i);
            let node = &mut self.nodes[i];
            node.inputs = resolved;
            node.out.clear();
            let mut io = Io { manifest: node.manifest, inputs: &node.inputs, params: &mut node.params, out: &mut node.out };
            node.module.process(&mut io, dt);
        }
    }

    /// Legacy `_resolve_inputs`: each port starts at its knob base (else the port default); the first cable replaces it;
    /// more cables on a gate take the max, on a signal add their offset from the base; cabled input knobs are then
    /// clamped to their range.
    fn resolve_inputs(&self, i: usize) -> Vec<f64> {
        let node = &self.nodes[i];
        let m = node.manifest;
        let mut resolved: Vec<f64> = m.input_ports.iter().map(|p| node.inst.input(&p.name).unwrap_or(p.default)).collect();
        let mut cabled = vec![false; resolved.len()];
        for c in &node.cables {
            let raw = self.nodes[c.src].output(&c.src_port);
            let port = &m.input_ports[c.dst_port];
            let mapped = map_cable(m, &node.inst, &port.name, raw, c.midi);
            let p = c.dst_port;
            if !cabled[p] {
                resolved[p] = mapped;
                cabled[p] = true;
            } else if port.is_gate() {
                resolved[p] = resolved[p].max(mapped);
            } else {
                resolved[p] += mapped - node.inst.input(&port.name).unwrap_or(0.0);
            }
        }
        for (p, port) in m.input_ports.iter().enumerate() {
            let Some(ctrl) = m.control(&port.name) else { continue };
            if cabled[p] && ctrl.control_type == "knob" && ctrl.value_source == "input" {
                let (lo, hi) = node.inst.range(&ctrl.key, ctrl.minimum, ctrl.maximum);
                resolved[p] = clamp(resolved[p], lo, hi);
            }
        }
        resolved
    }

    /// Set a knob's base value (`inputs.<port>`), as a drag on the knob does. No rebuild.
    pub fn set_input(&mut self, module: &str, port: &str, value: f64) {
        if let Some(&i) = self.by_id.get(module) {
            self.nodes[i].inst.inputs.insert(port.into(), value.into());
        }
    }

    pub fn set_param(&mut self, module: &str, key: &str, value: Value) {
        if let Some(&i) = self.by_id.get(module) {
            self.nodes[i].inst.params.insert(key.into(), value.clone());
            self.nodes[i].params.insert(key.into(), value);
        }
    }

    /// What the UI watches: every module's outputs and the inputs of monitor modules (scopes).
    pub fn taps(&self) -> Vec<Tap> {
        let mut taps = Vec::new();
        for n in &self.nodes {
            for p in &n.manifest.output_ports {
                taps.push(Tap { module: n.inst.id.clone(), port: p.name.clone(), kind: "out" });
            }
            if n.manifest.category == "Monitor" {
                for p in &n.manifest.input_ports {
                    taps.push(Tap { module: n.inst.id.clone(), port: p.name.clone(), kind: "in" });
                }
            }
        }
        taps
    }

    /// The current value of every tap, in `taps()` order.
    pub fn read_taps(&self, taps: &[Tap], into: &mut Vec<f32>) {
        into.clear();
        for t in taps {
            let v = self.by_id.get(&t.module).map_or(0.0, |&i| {
                let n = &self.nodes[i];
                if t.kind == "out" {
                    n.output(&t.port)
                } else {
                    n.manifest.input_ports.iter().position(|p| p.name == t.port).map_or(0.0, |p| n.inputs[p])
                }
            });
            into.push(v as f32);
        }
    }

    pub fn output(&self, module: &str, port: &str) -> f64 {
        self.by_id.get(module).map_or(0.0, |&i| self.nodes[i].output(port))
    }
}

/// Legacy `map_connected_input_to_control_range`: a cable into an input-backed knob moves the knob around its base by
/// `raw / 100 * depth * (hi - lo)`. A knob whose range dips below 0 takes the cable in its own units as an offset
/// (so a bipolar LFO swings it both ways). A MIDI source maps absolutely across the range. Anything that is not an
/// input-backed control takes the cable value as it is.
pub fn map_cable(m: &Manifest, inst: &ModuleInst, port: &str, raw: f64, midi: bool) -> f64 {
    let Some(ctrl) = m.control(port) else { return raw };
    if ctrl.control_type == "selector" && ctrl.value_source == "input" {
        return match ctrl.options.len() {
            2 => binary(raw),
            0 => raw,
            n => raw.round().clamp(0.0, (n - 1) as f64),
        };
    }
    if ctrl.control_type != "knob" || ctrl.value_source != "input" {
        return raw;
    }
    if fixed_binary(m, ctrl) {
        return binary(raw);
    }
    let (lo, hi) = inst.range(&ctrl.key, ctrl.minimum, ctrl.maximum);
    let base = inst.input(&ctrl.key).or_else(|| num(&ctrl.default)).unwrap_or(0.0);
    let depth = inst.ui_num("control_mod_depths", &ctrl.key).unwrap_or(100.0).clamp(0.0, 100.0) / 100.0;
    if lo < 0.0 && !midi {
        return base + raw * depth; // unclamped: resolve_inputs clamps after summing every cable
    }
    // ponytail: the legacy unit-mode path (a rate knob shown in seconds) maps in display units; lands with M6's units
    let norm = raw / 100.0;
    if midi {
        clamp(lo + norm * depth * (hi - lo), lo, hi)
    } else {
        clamp(base + norm * depth * (hi - lo), lo, hi)
    }
}

fn binary(v: f64) -> f64 {
    if v >= 0.5 {
        1.0
    } else {
        0.0
    }
}

fn fixed_binary(m: &Manifest, ctrl: &Control) -> bool {
    let gate_port = m.input_ports.iter().any(|p| p.name == ctrl.key && p.is_gate());
    let named = matches!(ctrl.key.trim().to_lowercase().as_str(), "toggle" | "trigger" | "gate");
    let decimals = ctrl.extra.get("decimals").and_then(Value::as_i64).unwrap_or(2);
    let nominal = ctrl.minimum.abs() <= 1e-9 && (ctrl.maximum - 1.0).abs() <= 1e-9 && decimals <= 0;
    gate_port || named || nominal
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn patch(v: serde_json::Value) -> Patch {
        serde_json::from_value(v).unwrap()
    }

    #[test]
    fn lfo_into_scope_is_seen_on_the_scope_tap() {
        let mut e = Engine::default();
        e.load(&patch(json!({ "modules": [
            { "id": "l", "type": "lfo", "inputs": { "rate": 1.0, "amp": 40.0, "offset": 50.0 } },
            { "id": "s", "type": "scope_4ch" }],
            "connections": [{ "src_module": "l", "src_port": "out", "dst_module": "s", "dst_port": "in1" }] })));
        let taps = e.taps();
        let i = taps.iter().position(|t| t.module == "s" && t.port == "in1" && t.kind == "in").unwrap();
        let mut row = Vec::new();
        for n in 1..=60 {
            e.tick(1.0 / 60.0);
            e.read_taps(&taps, &mut row);
            let want = 50.0 + 40.0 * (2.0 * std::f64::consts::PI * n as f64 / 60.0).sin();
            assert!((row[i] as f64 - want).abs() < 1e-3, "tick {n}: {} vs {want}", row[i]);
        }
        assert_eq!(taps.iter().filter(|t| t.module == "s").count(), 4); // the scope's four inputs, no outputs
    }

    #[test]
    fn a_cable_into_a_knob_moves_it_around_its_base_and_clamps() {
        let mut e = Engine::default();
        // constant 50 into oscillator.amp (knob 0..100, base 30): 30 + 50/100 * 100 = 80
        e.load(&patch(json!({ "modules": [
            { "id": "c", "type": "constant", "params": { "value": 50.0 } },
            { "id": "c2", "type": "constant", "params": { "value": 90.0 } },
            { "id": "o", "type": "oscillator", "inputs": { "amp": 30.0 } }],
            "connections": [{ "src_module": "c", "src_port": "out", "dst_module": "o", "dst_port": "amp" }] })));
        e.tick(1.0 / 60.0);
        e.tick(1.0 / 60.0);
        assert_eq!(e.nodes[e.by_id["o"]].inputs[1], 80.0);
        // a second cable adds its own offset from the base; the sum is clamped to the range: 80 + (100 - 30) -> 100
        e.load(&patch(json!({ "modules": [
            { "id": "c", "type": "constant", "params": { "value": 50.0 } },
            { "id": "c2", "type": "constant", "params": { "value": 90.0 } },
            { "id": "o", "type": "oscillator", "inputs": { "amp": 30.0 } }],
            "connections": [
                { "src_module": "c", "src_port": "out", "dst_module": "o", "dst_port": "amp" },
                { "src_module": "c2", "src_port": "out", "dst_module": "o", "dst_port": "amp" }] })));
        e.tick(1.0 / 60.0);
        assert_eq!(e.nodes[e.by_id["o"]].inputs[1], 100.0);
    }

    #[test]
    fn a_bipolar_knob_takes_the_cable_as_an_offset_in_its_units() {
        // lfo.offset is -100..100: constant 20 into it with base 10 -> 10 + 20 * depth(0.5) = 20
        let mut e = Engine::default();
        e.load(&patch(json!({ "modules": [
            { "id": "c", "type": "constant", "params": { "value": 20.0 } },
            { "id": "l", "type": "lfo", "inputs": { "offset": 10.0 }, "ui": { "control_mod_depths": { "offset": 50 } } }],
            "connections": [{ "src_module": "c", "src_port": "out", "dst_module": "l", "dst_port": "offset" }] })));
        e.tick(1.0 / 60.0);
        assert_eq!(e.nodes[e.by_id["l"]].inputs[2], 20.0);
    }

    #[test]
    fn a_feedback_loop_still_ticks_every_module() {
        let mut e = Engine::default();
        e.load(&patch(json!({ "modules": [{ "id": "a", "type": "add" }, { "id": "b", "type": "add" }],
            "connections": [
                { "src_module": "a", "src_port": "out", "dst_module": "b", "dst_port": "a" },
                { "src_module": "b", "src_port": "out", "dst_module": "a", "dst_port": "a" }] })));
        assert_eq!(e.order.len(), 2);
        e.tick(1.0 / 60.0);
    }

    #[test]
    fn a_live_edit_keeps_module_state() {
        let mut e = Engine::default();
        let p = patch(json!({ "modules": [{ "id": "l", "type": "lfo", "inputs": { "rate": 1.0, "amp": 10.0 } }] }));
        e.load(&p);
        for _ in 0..15 {
            e.tick(1.0 / 60.0);
        }
        e.load(&p); // e.g. a cable added elsewhere
        e.tick(1.0 / 60.0);
        let want = 10.0 * (2.0 * std::f64::consts::PI * 16.0 / 60.0).sin(); // tick 16, not tick 1 of a restarted LFO
        assert!((e.output("l", "out") - want).abs() < 1e-9, "the LFO carried on instead of restarting");
    }
}
