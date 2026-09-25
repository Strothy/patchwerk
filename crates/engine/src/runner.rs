//! The engine's own thread: ticks at a fixed rate with a fixed `dt`, whatever the UI is doing, and hands the watched
//! values out in batches (about 30 a second) to a sink (the app's Channel to the frontend; a Vec in tests).
use crate::engine::{Engine, Tap};
use crate::patch::Patch;
use serde::Serialize;
use serde_json::Value;
use std::sync::mpsc::{channel, RecvTimeoutError, Sender};
use std::thread::JoinHandle;
use std::time::{Duration, Instant};

pub type Sink = Box<dyn FnMut(Batch) + Send>;

pub enum Command {
    Load(Patch),
    SetInput { module: String, port: String, value: f64 },
    SetParam { module: String, key: String, value: Value },
    Play,
    Pause,
    /// Pause and reset every module and the clock.
    Stop,
    Sink(Sink),
    Quit,
}

/// What the UI gets. `taps` comes with the first batch after a load (the meaning of each value), then `frames` of
/// `taps.len()` values per tick, flattened, with each tick's sim time in `t`.
#[derive(Debug, Clone, Serialize, Default)]
pub struct Batch {
    pub layout: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub taps: Option<Vec<Tap>>,
    pub playing: bool,
    pub t: Vec<f64>,
    pub values: Vec<f32>,
}

pub struct Runner {
    tx: Sender<Command>,
    thread: Option<JoinHandle<()>>,
}

const FLUSH_EVERY: u32 = 2; // ticks per batch: 60 Hz ticks -> 30 batches a second
const MAX_CATCH_UP: u32 = 4; // a stall longer than this many ticks is dropped, never replayed at speed

impl Runner {
    pub fn start(rate_hz: f64) -> Runner {
        let (tx, rx) = channel::<Command>();
        let thread = std::thread::Builder::new()
            .name("patchwerk-engine".into())
            .spawn(move || {
                let period = Duration::from_secs_f64(1.0 / rate_hz);
                let dt = 1.0 / rate_hz;
                let mut engine = Engine::default();
                let mut sink: Option<Sink> = None;
                let mut playing = false;
                let mut layout = 0u64;
                let mut taps: Vec<Tap> = Vec::new();
                let mut batch = Batch::default();
                let mut row = Vec::new();
                let mut since_flush = 0u32;
                let mut next = Instant::now() + period;
                loop {
                    // commands until the next tick is due
                    let wait = next.saturating_duration_since(Instant::now());
                    match rx.recv_timeout(wait) {
                        Ok(cmd) => {
                            match cmd {
                                Command::Load(p) => {
                                    engine.load(&p);
                                    layout += 1;
                                    taps = engine.taps();
                                    batch = Batch { layout, taps: Some(taps.clone()), playing, ..Batch::default() };
                                    since_flush = FLUSH_EVERY; // send the new layout straight away
                                }
                                Command::SetInput { module, port, value } => engine.set_input(&module, &port, value),
                                Command::SetParam { module, key, value } => engine.set_param(&module, &key, value),
                                Command::Play => playing = true,
                                Command::Pause => playing = false,
                                Command::Stop => {
                                    playing = false;
                                    engine.reset();
                                }
                                Command::Sink(s) => {
                                    sink = Some(s);
                                    batch = Batch { layout, taps: Some(taps.clone()), playing, ..Batch::default() };
                                    since_flush = FLUSH_EVERY;
                                }
                                Command::Quit => return,
                            }
                            if Instant::now() < next {
                                continue;
                            }
                        }
                        Err(RecvTimeoutError::Timeout) => {}
                        Err(RecvTimeoutError::Disconnected) => return,
                    }
                    // due ticks (a short stall catches up, a long one is dropped)
                    let now = Instant::now();
                    let mut due = 0;
                    while next <= now && due < MAX_CATCH_UP {
                        next += period;
                        due += 1;
                    }
                    if next <= now {
                        next = now + period;
                    }
                    for _ in 0..due {
                        if playing {
                            engine.tick(dt);
                            engine.read_taps(&taps, &mut row);
                            batch.t.push(engine.sim_time);
                            batch.values.extend_from_slice(&row);
                        }
                        since_flush += 1;
                    }
                    if since_flush >= FLUSH_EVERY {
                        since_flush = 0;
                        if let Some(s) = sink.as_mut() {
                            if !batch.t.is_empty() || batch.taps.is_some() || batch.playing != playing {
                                batch.playing = playing;
                                s(std::mem::replace(&mut batch, Batch { layout, playing, ..Batch::default() }));
                            }
                        } else {
                            batch.t.clear();
                            batch.values.clear();
                        }
                    }
                }
            })
            .expect("spawn engine thread");
        Runner { tx, thread: Some(thread) }
    }

    pub fn send(&self, cmd: Command) {
        let _ = self.tx.send(cmd); // the thread only ends on Quit or drop
    }
}

impl Drop for Runner {
    fn drop(&mut self) {
        let _ = self.tx.send(Command::Quit);
        if let Some(t) = self.thread.take() {
            let _ = t.join();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::{Arc, Mutex};

    #[test]
    fn ticks_at_its_rate_and_sends_batches_with_the_layout_first() {
        let got: Arc<Mutex<Vec<Batch>>> = Arc::default();
        let r = Runner::start(60.0);
        let g = got.clone();
        r.send(Command::Sink(Box::new(move |b| g.lock().unwrap().push(b))));
        r.send(Command::Load(serde_json::from_value(serde_json::json!({ "modules": [{ "id": "l", "type": "lfo" }] })).unwrap()));
        r.send(Command::Play);
        std::thread::sleep(Duration::from_millis(500));
        r.send(Command::Pause);
        std::thread::sleep(Duration::from_millis(50));
        let got = got.lock().unwrap();
        let layout = got.iter().rev().find_map(|b| b.taps.clone()).unwrap();
        assert_eq!(layout.len(), 1);
        let t: Vec<f64> = got.iter().flat_map(|b| b.t.clone()).collect();
        assert!((24..=36).contains(&t.len()), "{} ticks in 0.5 s at 60 Hz", t.len());
        assert!(t.windows(2).all(|w| (w[1] - w[0] - 1.0 / 60.0).abs() < 1e-9), "fixed dt");
        let values: usize = got.iter().map(|b| b.values.len()).sum();
        assert_eq!(values, t.len());
    }
}
