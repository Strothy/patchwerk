//! A module type's manifest: its ports, controls and param defaults. The JSON is the legacy `manifest.json` format
//! (fixtures/manifests), kept as-is so legacy patches and the fixtures line up; unknown keys ride along in `extra`.
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Port {
    pub name: String,
    #[serde(default = "signal")]
    pub signal_kind: String,
    #[serde(default)]
    pub default: f64,
}

impl Port {
    /// Gate and trigger ports combine several cables by max; signal ports add their offsets.
    pub fn is_gate(&self) -> bool {
        matches!(self.signal_kind.to_ascii_lowercase().as_str(), "gate" | "trigger")
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Control {
    pub key: String,
    #[serde(default)]
    pub label: String,
    #[serde(default = "knob")]
    pub control_type: String,
    /// `input` (the value is an input port's base), `param`, or `auto` (input when a port has this key).
    #[serde(default = "auto")]
    pub value_source: String,
    #[serde(default)]
    pub default: Value,
    #[serde(default)]
    pub minimum: f64,
    #[serde(default = "hundred")]
    pub maximum: f64,
    #[serde(default)]
    pub options: Vec<Value>,
    #[serde(flatten)]
    pub extra: Map<String, Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Manifest {
    pub module_type: String,
    #[serde(default)]
    pub category: String,
    #[serde(default)]
    pub input_ports: Vec<Port>,
    #[serde(default)]
    pub output_ports: Vec<Port>,
    #[serde(default)]
    pub param_defaults: Map<String, Value>,
    #[serde(default)]
    pub controls: Vec<Control>,
    #[serde(flatten)]
    pub extra: Map<String, Value>,
}

impl Manifest {
    pub fn parse(json: &str) -> Manifest {
        serde_json::from_str(json).unwrap_or_else(|e| panic!("bad manifest: {e}"))
    }

    pub fn control(&self, key: &str) -> Option<&Control> {
        self.controls.iter().find(|c| c.key == key)
    }

    /// Where a control's value lives: in the module's `inputs` (a port's base) or its `params`.
    pub fn control_is_input(&self, c: &Control) -> bool {
        match c.value_source.as_str() {
            "input" => true,
            "param" => false,
            _ => self.input_ports.iter().any(|p| p.name == c.key),
        }
    }
}

fn signal() -> String {
    "signal".into()
}
fn knob() -> String {
    "knob".into()
}
fn auto() -> String {
    "auto".into()
}
fn hundred() -> f64 {
    100.0
}
