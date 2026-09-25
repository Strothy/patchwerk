use crate::module::{Io, Module};

/// `scope_4ch` computes nothing: the engine taps its four resolved inputs every tick and the UI keeps the history
/// (the legacy module kept it in module state only so its renderer could read it).
pub struct Scope4;
impl Module for Scope4 {
    fn process(&mut self, _io: &mut Io, _dt: f64) {}
}
