//! The app shell: the engine runs on its own thread (patchwerk-engine's Runner); these commands are how the UI edits
//! the patch and the transport, and the Channel is how watched values stream back.
use patchwerk_engine::manifest::Manifest;
use patchwerk_engine::{Batch, Command, Patch, Registry, Runner};
use tauri::ipc::Channel;

struct Engine(Runner);

/// Every module type the engine knows, for the module menu and the faceplates.
#[tauri::command]
fn catalog() -> Vec<Manifest> {
    Registry::get().manifests().to_vec()
}

/// Watched values (scope inputs, every output) arrive here in batches, about 30 a second. A new subscription replaces
/// the old one (a reloaded page).
#[tauri::command]
fn engine_subscribe(engine: tauri::State<'_, Engine>, on_batch: Channel<Batch>) {
    engine.0.send(Command::Sink(Box::new(move |b| {
        let _ = on_batch.send(b); // the page is gone: nothing to tell
    })));
}

/// A structural change (a module or cable added or removed): the engine rebuilds, keeping each surviving module's state.
#[tauri::command]
fn engine_load(engine: tauri::State<'_, Engine>, patch: Patch) {
    engine.0.send(Command::Load(patch));
}

/// A knob moved: its base value, no rebuild.
#[tauri::command]
fn engine_set_input(engine: tauri::State<'_, Engine>, module: String, port: String, value: f64) {
    engine.0.send(Command::SetInput { module, port, value });
}

#[tauri::command]
fn engine_set_param(engine: tauri::State<'_, Engine>, module: String, key: String, value: serde_json::Value) {
    engine.0.send(Command::SetParam { module, key, value });
}

#[tauri::command]
fn engine_transport(engine: tauri::State<'_, Engine>, action: String) -> Result<(), String> {
    engine.0.send(match action.as_str() {
        "play" => Command::Play,
        "pause" => Command::Pause,
        "stop" => Command::Stop,
        _ => return Err(format!("Unknown transport action: {action}")),
    });
    Ok(())
}

/// The frontend's errors and notices, into the same log as the backend's (the terminal in dev, a file in a release).
#[tauri::command]
fn log_line(level: String, text: String) {
    match level.as_str() {
        "error" => log::error!("[ui] {text}"),
        "warn" => log::warn!("[ui] {text}"),
        _ => log::info!("[ui] {text}"),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|_, _, _| {}))
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                .max_file_size(2_000_000)
                .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepOne)
                .build(),
        )
        .manage(Engine(Runner::start(60.0)))
        .invoke_handler(tauri::generate_handler![catalog, engine_subscribe, engine_load, engine_set_input, engine_set_param, engine_transport, log_line])
        .run(tauri::generate_context!())
        .expect("error while running Patchwerk");
}
