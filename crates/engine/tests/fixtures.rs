//! Every ported module replays its golden traces (fixtures/modules/<type>.json, captured from the legacy Python) and must
//! match. Also writes lab/ported.json (when the local lab exists) so the lab's Modules tab shows what is ported.
use patchwerk_engine::module::Io;
use patchwerk_engine::Registry;
use serde_json::{Map, Value};
use std::path::PathBuf;

fn root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../..")
}

/// The per-tick param schedules the extractor used (it recorded only their names).
fn scripted(scenario: &str, key: &str, t: usize) -> f64 {
    let press = |at: usize, len: usize| if (at..at + len).contains(&t) { 1.0 } else { 0.0 };
    match (scenario, key) {
        ("record_and_export", "start_button") => press(5, 2),
        ("record_and_export", "stop_button") => press(200, 2),
        ("record_and_export", "export_button") => press(220, 2),
        _ => press(30, 3), // press[<button>]
    }
}

fn close(a: f64, b: f64) -> bool {
    a == b || (a - b).abs() <= 1e-6 * a.abs().max(b.abs()).max(1.0) // inputs were stored at 12 digits; integrators amplify that
}

/// None when every scenario matches, else the first mismatch.
fn check(module_type: &str, doc: &Value) -> Option<String> {
    let reg = Registry::get();
    let manifest = reg.manifest(module_type)?;
    let dt = doc["dt"].as_f64().unwrap();
    for sc in doc["scenarios"].as_array().unwrap() {
        let name = sc["name"].as_str().unwrap();
        let ticks = sc["ticks"].as_u64().unwrap() as usize;
        let mut params: Map<String, Value> = sc["params"].as_object().cloned().unwrap_or_default();
        let script: Vec<String> = sc["param_script"].as_array().unwrap().iter().map(|v| v.as_str().unwrap().to_string()).collect();
        let inputs = &sc["inputs"];
        let outputs = sc["outputs"].as_object().unwrap();
        let mut module = reg.make(module_type).unwrap();
        module.reset();
        let mut out = Vec::new();
        for t in 0..ticks {
            for k in &script {
                params.insert(k.clone(), scripted(name, k, t).into());
            }
            let ins: Vec<f64> = manifest.input_ports.iter().map(|p| inputs[&p.name][t].as_f64().unwrap_or(p.default)).collect();
            out.clear();
            let mut io = Io { manifest, inputs: &ins, params: &mut params, out: &mut out };
            module.process(&mut io, dt);
            for (key, trace) in outputs {
                let want = &trace[t];
                let got = out.iter().find(|(k, _)| k == key).map(|(_, v)| *v);
                let ok = match (want, got) {
                    (Value::Null, None) => true,
                    (Value::Number(n), Some(g)) => close(n.as_f64().unwrap(), g),
                    (Value::String(s), Some(g)) => (s == "nan" && g.is_nan()) || (s == "inf" && g == f64::INFINITY) || (s == "-inf" && g == f64::NEG_INFINITY),
                    _ => false,
                };
                if !ok {
                    return Some(format!("{module_type} [{name}] tick {t} output {key}: want {want}, got {got:?}"));
                }
            }
        }
    }
    None
}

#[test]
fn ported_modules_match_their_legacy_fixtures() {
    let mut ported = Vec::new();
    let mut failures = Vec::new();
    for m in Registry::get().manifests() {
        let path = root().join("fixtures/modules").join(format!("{}.json", m.module_type));
        let doc: Value = serde_json::from_str(&std::fs::read_to_string(&path).unwrap_or_else(|e| panic!("{path:?}: {e}"))).unwrap();
        if doc["deterministic"] == Value::Bool(false) {
            continue; // random modules: statistical checks in their own tests
        }
        match check(&m.module_type, &doc) {
            None => ported.push(m.module_type.clone()),
            Some(err) => failures.push(err),
        }
    }
    let lab = root().join("lab");
    if lab.is_dir() {
        let _ = std::fs::write(lab.join("ported.json"), serde_json::json!({ "modules": ported }).to_string());
    }
    assert!(failures.is_empty(), "fixture mismatches:\n{}", failures.join("\n"));
}
