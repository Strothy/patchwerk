//! Every module type the engine knows: its manifest (crates/engine/manifests/<type>.json, the legacy format) and how to
//! make one. Porting a module = its manifest here, its code in this folder, one line in `TYPES`, and its fixtures pass.
use crate::manifest::Manifest;
use crate::module::Module;
use std::sync::OnceLock;

mod basic;
mod generators;
mod monitor;

type Make = fn() -> Box<dyn Module>;

const TYPES: &[(&str, &str, Make)] = &[
    ("add", include_str!("../../manifests/add.json"), || Box::new(basic::Add)),
    ("constant", include_str!("../../manifests/constant.json"), || Box::new(basic::Constant)),
    ("lfo", include_str!("../../manifests/lfo.json"), || Box::new(generators::Osc::lfo())),
    ("multiply", include_str!("../../manifests/multiply.json"), || Box::new(basic::Multiply)),
    ("oscillator", include_str!("../../manifests/oscillator.json"), || Box::new(generators::Osc::oscillator())),
    ("scope_4ch", include_str!("../../manifests/scope_4ch.json"), || Box::new(monitor::Scope4)),
];

pub struct Registry {
    manifests: Vec<Manifest>,
}

impl Registry {
    pub fn get() -> &'static Registry {
        static R: OnceLock<Registry> = OnceLock::new();
        R.get_or_init(|| Registry { manifests: TYPES.iter().map(|(_, json, _)| Manifest::parse(json)).collect() })
    }

    pub fn manifests(&self) -> &[Manifest] {
        &self.manifests
    }

    pub fn manifest(&self, module_type: &str) -> Option<&Manifest> {
        self.manifests.iter().find(|m| m.module_type == module_type)
    }

    pub fn make(&self, module_type: &str) -> Option<Box<dyn Module>> {
        TYPES.iter().find(|(t, _, _)| *t == module_type).map(|(_, _, make)| make())
    }
}
