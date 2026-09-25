use crate::module::{Io, Module};

pub struct Constant;
impl Module for Constant {
    fn process(&mut self, io: &mut Io, _dt: f64) {
        let v = io.param_num("value", 0.0);
        io.set("out", v);
    }
}

pub struct Add;
impl Module for Add {
    fn process(&mut self, io: &mut Io, _dt: f64) {
        let v = io.input("a", 0.0) + io.input("b", 0.0);
        io.set("out", v);
    }
}

pub struct Multiply;
impl Module for Multiply {
    fn process(&mut self, io: &mut Io, _dt: f64) {
        let v = io.input("a", 1.0) * io.input("b", 1.0);
        io.set("out", v);
    }
}
