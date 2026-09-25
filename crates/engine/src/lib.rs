//! Patchwerk's engine: module types, the patch graph and a fixed-rate tick thread. No UI, no Tauri: the app and the
//! tests drive it the same way.
pub mod engine;
pub mod manifest;
pub mod module;
pub mod modules;
pub mod patch;
pub mod runner;
pub mod signal;

pub use engine::{Engine, Tap};
pub use modules::Registry;
pub use patch::Patch;
pub use runner::{Batch, Command, Runner};
