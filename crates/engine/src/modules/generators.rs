use crate::module::{Io, Module};
use crate::signal::{clamp, wave, Edge};

/// `lfo` and `oscillator`: the same phase-accumulating wave, differing only in their input defaults.
pub struct Osc {
    phase: f64,
    reset: Edge,
    defaults: [f64; 3], // rate, amp, offset when the port is missing
}

impl Osc {
    pub fn lfo() -> Osc {
        Osc { phase: 0.0, reset: Edge::default(), defaults: [0.1, 10.0, 0.0] }
    }
    pub fn oscillator() -> Osc {
        Osc { phase: 0.0, reset: Edge::default(), defaults: [0.2, 30.0, 50.0] }
    }
}

impl Module for Osc {
    fn reset(&mut self) {
        self.phase = 0.0;
        self.reset = Edge::default();
    }

    fn process(&mut self, io: &mut Io, dt: f64) {
        let [rate_d, amp_d, offset_d] = self.defaults;
        let rate = io.input("rate", rate_d).max(0.0);
        let amp = io.input("amp", amp_d).max(0.0);
        let offset = io.input("offset", offset_d);
        let phase_deg = io.input("phase", 0.0);
        let shape = io.param_str("shape", "sine");
        let unipolar = io.param_str("polarity", "bipolar").to_lowercase() == "unipolar";

        if self.reset.rising(io.input("reset", 0.0)) {
            self.phase = 0.0;
        }
        self.phase = (self.phase + dt * rate).rem_euclid(1.0);
        let mut raw = wave(&shape, self.phase + phase_deg / 360.0);
        if unipolar {
            raw = (raw + 1.0) * 0.5;
        }
        let out = offset + raw * amp;
        io.set("out", if unipolar { clamp(out, 0.0, 100.0) } else { out });
    }
}
