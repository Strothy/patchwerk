//! The patch document (legacy format, `meta.version` 1). Keys the engine does not use (annotations, groups, boxes, meta,
//! each module's `ui` beyond ranges and depths) are kept as they came, so a load and save loses nothing.
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Patch {
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub modules: Vec<ModuleInst>,
    #[serde(default)]
    pub connections: Vec<Connection>,
    #[serde(flatten)]
    pub extra: Map<String, Value>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ModuleInst {
    pub id: String,
    #[serde(rename = "type")]
    pub kind: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub params: Map<String, Value>,
    /// Input-backed control values (a knob's base), by port name.
    #[serde(default)]
    pub inputs: Map<String, Value>,
    #[serde(default)]
    pub ui: Map<String, Value>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Connection {
    pub src_module: String,
    pub src_port: String,
    pub dst_module: String,
    pub dst_port: String,
    #[serde(default)]
    pub color_index: i64,
}

impl ModuleInst {
    pub fn input(&self, key: &str) -> Option<f64> {
        self.inputs.get(key).and_then(num)
    }

    /// `ui.<table>.<key>`, e.g. `ui.control_mod_depths.rate`.
    pub fn ui_num(&self, table: &str, key: &str) -> Option<f64> {
        self.ui.get(table)?.get(key).and_then(num)
    }

    /// The user's range for a control (`ui.control_ranges.<key>`), else the manifest's.
    pub fn range(&self, key: &str, lo: f64, hi: f64) -> (f64, f64) {
        let r = self.ui.get("control_ranges").and_then(|t| t.get(key));
        let lo = r.and_then(|r| r.get("min")).and_then(num).unwrap_or(lo);
        let hi = r.and_then(|r| r.get("max")).and_then(num).unwrap_or(hi);
        if lo > hi {
            (hi, lo)
        } else {
            (lo, hi)
        }
    }
}

/// A JSON number, or text holding one (legacy patches store both).
pub fn num(v: &Value) -> Option<f64> {
    match v {
        Value::Number(n) => n.as_f64(),
        Value::String(s) => s.trim().parse().ok(),
        Value::Bool(b) => Some(f64::from(u8::from(*b))),
        _ => None,
    }
}
