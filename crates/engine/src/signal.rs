//! Signal helpers shared by modules (legacy syb_core/signal_math.py).

pub fn clamp(v: f64, lo: f64, hi: f64) -> f64 {
    lo.max(hi.min(v))
}

/// A gate or trigger is high at >= 0.5, so both the 0/1 and 0/100 conventions work.
pub fn gate_high(v: f64) -> bool {
    v >= 0.5
}

/// -1..1 for a phase in cycles; Python's floor-mod, so negative phases wrap the same way.
pub fn wave(shape: &str, phase: f64) -> f64 {
    let p = phase.rem_euclid(1.0);
    match shape {
        "triangle" => 4.0 * (p - (p + 0.5).floor()).abs() - 1.0,
        "saw" => 2.0 * p - 1.0,
        "square" => {
            if p < 0.5 {
                1.0
            } else {
                -1.0
            }
        }
        _ => (2.0 * std::f64::consts::PI * p).sin(),
    }
}

/// Rising-edge detector: true on the tick the signal goes high.
#[derive(Default, Clone, Copy)]
pub struct Edge(f64);

impl Edge {
    pub fn rising(&mut self, v: f64) -> bool {
        let up = gate_high(v) && !gate_high(self.0);
        self.0 = v;
        up
    }
}
