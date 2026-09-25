//! What a module sees each tick: its resolved inputs, its params (which it may write status back into), `dt`, and
//! where it puts its outputs.
use crate::manifest::Manifest;
use serde_json::{Map, Value};

pub trait Module: Send {
    /// Back to the state of a freshly placed module (transport stop, a new patch).
    fn reset(&mut self) {}
    fn process(&mut self, io: &mut Io, dt: f64);
}

/// One tick's view of a module. Inputs are in manifest port order; lookups by name are a short linear scan.
pub struct Io<'a> {
    pub manifest: &'a Manifest,
    pub inputs: &'a [f64],
    pub params: &'a mut Map<String, Value>,
    pub out: &'a mut Vec<(&'static str, f64)>,
}

impl Io<'_> {
    /// An input by port name; `default` when the module has no such port (the legacy `inputs.get(name, default)`).
    pub fn input(&self, name: &str, default: f64) -> f64 {
        // ponytail: linear scan over at most ~16 ports; a per-type index if profiling ever shows it
        self.manifest.input_ports.iter().position(|p| p.name == name).map_or(default, |i| self.inputs[i])
    }

    pub fn set(&mut self, name: &'static str, value: f64) {
        self.out.push((name, value));
    }

    /// A param as text, as legacy `str(params.get(key, default))` read it.
    pub fn param_str(&self, key: &str, default: &str) -> String {
        match self.params.get(key) {
            Some(Value::String(s)) => s.clone(),
            Some(Value::Number(n)) => n.to_string(),
            Some(Value::Bool(b)) => if *b { "True" } else { "False" }.into(),
            _ => default.into(),
        }
    }

    /// A param as a number, as legacy `float(params.get(key, default))` read it; unparseable text falls back.
    pub fn param_num(&self, key: &str, default: f64) -> f64 {
        match self.params.get(key) {
            Some(Value::Number(n)) => n.as_f64().unwrap_or(default),
            Some(Value::String(s)) => s.trim().parse().unwrap_or(default),
            Some(Value::Bool(b)) => f64::from(u8::from(*b)),
            _ => default,
        }
    }
}
