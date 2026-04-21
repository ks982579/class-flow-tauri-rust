use std::path::PathBuf;

use core::{Class, Method, Property, StepKind, Workspace};
use tauri::State;
use uuid::Uuid;

use crate::bridge::{CoreBridge, PlatformBridge};
use crate::error::PlatformError;
use crate::state::AppState;

// Every mutating command returns the full updated Workspace so the frontend
// can replace its state in one step without partial reconciliation.

// ── Helpers ───────────────────────────────────────────────────────────────────

fn auto_save(state: &AppState, ws: &Workspace) -> Result<(), PlatformError> {
    let path_guard = state.save_path.lock().unwrap();
    if let Some(path) = path_guard.as_ref() {
        let json = serde_json::to_string_pretty(ws)?;
        std::fs::write(path, json)?;
    }
    Ok(())
}

// ── Workspace ─────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn new_workspace(name: String, state: State<AppState>) -> Result<Workspace, String> {
    let ws = Workspace::new(name);
    *state.workspace.lock().unwrap() = Some(ws.clone());
    *state.save_path.lock().unwrap() = None;
    Ok(ws)
}

#[tauri::command]
pub fn load_workspace(path: String, state: State<AppState>) -> Result<Workspace, String> {
    let bytes = std::fs::read(&path).map_err(PlatformError::from)?;
    let ws: Workspace = serde_json::from_slice(&bytes).map_err(PlatformError::from)?;
    *state.workspace.lock().unwrap() = Some(ws.clone());
    *state.save_path.lock().unwrap() = Some(PathBuf::from(path));
    Ok(ws)
}

#[tauri::command]
pub fn save_workspace(path: Option<String>, state: State<AppState>) -> Result<(), String> {
    let ws_guard = state.workspace.lock().unwrap();
    let ws = ws_guard.as_ref().ok_or(PlatformError::NoWorkspace)?;
    if let Some(p) = path {
        let json = serde_json::to_string_pretty(ws).map_err(PlatformError::from)?;
        std::fs::write(&p, json).map_err(PlatformError::from)?;
        drop(ws_guard);
        *state.save_path.lock().unwrap() = Some(PathBuf::from(p));
    } else {
        let path_guard = state.save_path.lock().unwrap();
        let p = path_guard.as_ref().ok_or(PlatformError::NotFound("save path".into()))?;
        let json = serde_json::to_string_pretty(ws).map_err(PlatformError::from)?;
        std::fs::write(p, json).map_err(PlatformError::from)?;
    }
    Ok(())
}

#[tauri::command]
pub fn get_workspace(state: State<AppState>) -> Result<Workspace, String> {
    state
        .workspace
        .lock()
        .unwrap()
        .clone()
        .ok_or_else(|| PlatformError::NoWorkspace.to_string())
}

// ── Namespace ─────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn add_namespace(name: String, state: State<AppState>) -> Result<Workspace, String> {
    let bridge = CoreBridge;
    let mut guard = state.workspace.lock().unwrap();
    let ws = guard.as_mut().ok_or(PlatformError::NoWorkspace)?;
    bridge.add_namespace(ws, name)?;
    let ws_clone = ws.clone();
    drop(guard);
    auto_save(&state, &ws_clone).map_err(String::from)?;
    Ok(ws_clone)
}

#[tauri::command]
pub fn remove_namespace(id: Uuid, state: State<AppState>) -> Result<Workspace, String> {
    let bridge = CoreBridge;
    let mut guard = state.workspace.lock().unwrap();
    let ws = guard.as_mut().ok_or(PlatformError::NoWorkspace)?;
    bridge.remove_namespace(ws, id)?;
    let ws_clone = ws.clone();
    drop(guard);
    auto_save(&state, &ws_clone).map_err(String::from)?;
    Ok(ws_clone)
}

#[tauri::command]
pub fn rename_namespace(id: Uuid, name: String, state: State<AppState>) -> Result<Workspace, String> {
    let bridge = CoreBridge;
    let mut guard = state.workspace.lock().unwrap();
    let ws = guard.as_mut().ok_or(PlatformError::NoWorkspace)?;
    bridge.rename_namespace(ws, id, name)?;
    let ws_clone = ws.clone();
    drop(guard);
    auto_save(&state, &ws_clone).map_err(String::from)?;
    Ok(ws_clone)
}

// ── Class ─────────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn add_class(
    namespace_id: Uuid,
    name: String,
    is_global: bool,
    state: State<AppState>,
) -> Result<Workspace, String> {
    let bridge = CoreBridge;
    let mut guard = state.workspace.lock().unwrap();
    let ws = guard.as_mut().ok_or(PlatformError::NoWorkspace)?;
    bridge.add_class(ws, namespace_id, name, is_global)?;
    let ws_clone = ws.clone();
    drop(guard);
    auto_save(&state, &ws_clone).map_err(String::from)?;
    Ok(ws_clone)
}

#[tauri::command]
pub fn remove_class(class_id: Uuid, state: State<AppState>) -> Result<Workspace, String> {
    let bridge = CoreBridge;
    let mut guard = state.workspace.lock().unwrap();
    let ws = guard.as_mut().ok_or(PlatformError::NoWorkspace)?;
    bridge.remove_class(ws, class_id)?;
    let ws_clone = ws.clone();
    drop(guard);
    auto_save(&state, &ws_clone).map_err(String::from)?;
    Ok(ws_clone)
}

#[tauri::command]
pub fn replace_class(class: Class, state: State<AppState>) -> Result<Workspace, String> {
    let bridge = CoreBridge;
    let mut guard = state.workspace.lock().unwrap();
    let ws = guard.as_mut().ok_or(PlatformError::NoWorkspace)?;
    bridge.replace_class(ws, class)?;
    let ws_clone = ws.clone();
    drop(guard);
    auto_save(&state, &ws_clone).map_err(String::from)?;
    Ok(ws_clone)
}

// ── Properties & Methods ──────────────────────────────────────────────────────

#[tauri::command]
pub fn add_property(
    class_id: Uuid,
    prop: Property,
    state: State<AppState>,
) -> Result<Workspace, String> {
    let bridge = CoreBridge;
    let mut guard = state.workspace.lock().unwrap();
    let ws = guard.as_mut().ok_or(PlatformError::NoWorkspace)?;
    bridge.add_property(ws, class_id, prop)?;
    let ws_clone = ws.clone();
    drop(guard);
    auto_save(&state, &ws_clone).map_err(String::from)?;
    Ok(ws_clone)
}

#[tauri::command]
pub fn remove_property(
    class_id: Uuid,
    property_id: Uuid,
    state: State<AppState>,
) -> Result<Workspace, String> {
    let bridge = CoreBridge;
    let mut guard = state.workspace.lock().unwrap();
    let ws = guard.as_mut().ok_or(PlatformError::NoWorkspace)?;
    bridge.remove_property(ws, class_id, property_id)?;
    let ws_clone = ws.clone();
    drop(guard);
    auto_save(&state, &ws_clone).map_err(String::from)?;
    Ok(ws_clone)
}

#[tauri::command]
pub fn add_method(
    class_id: Uuid,
    method: Method,
    state: State<AppState>,
) -> Result<Workspace, String> {
    let bridge = CoreBridge;
    let mut guard = state.workspace.lock().unwrap();
    let ws = guard.as_mut().ok_or(PlatformError::NoWorkspace)?;
    bridge.add_method(ws, class_id, method)?;
    let ws_clone = ws.clone();
    drop(guard);
    auto_save(&state, &ws_clone).map_err(String::from)?;
    Ok(ws_clone)
}

#[tauri::command]
pub fn remove_method(
    class_id: Uuid,
    method_id: Uuid,
    state: State<AppState>,
) -> Result<Workspace, String> {
    let bridge = CoreBridge;
    let mut guard = state.workspace.lock().unwrap();
    let ws = guard.as_mut().ok_or(PlatformError::NoWorkspace)?;
    bridge.remove_method(ws, class_id, method_id)?;
    let ws_clone = ws.clone();
    drop(guard);
    auto_save(&state, &ws_clone).map_err(String::from)?;
    Ok(ws_clone)
}

// ── Workflow ──────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn add_workflow(name: String, state: State<AppState>) -> Result<Workspace, String> {
    let bridge = CoreBridge;
    let mut guard = state.workspace.lock().unwrap();
    let ws = guard.as_mut().ok_or(PlatformError::NoWorkspace)?;
    bridge.add_workflow(ws, name)?;
    let ws_clone = ws.clone();
    drop(guard);
    auto_save(&state, &ws_clone).map_err(String::from)?;
    Ok(ws_clone)
}

#[tauri::command]
pub fn remove_workflow(id: Uuid, state: State<AppState>) -> Result<Workspace, String> {
    let bridge = CoreBridge;
    let mut guard = state.workspace.lock().unwrap();
    let ws = guard.as_mut().ok_or(PlatformError::NoWorkspace)?;
    bridge.remove_workflow(ws, id)?;
    let ws_clone = ws.clone();
    drop(guard);
    auto_save(&state, &ws_clone).map_err(String::from)?;
    Ok(ws_clone)
}

#[tauri::command]
pub fn rename_workflow(id: Uuid, name: String, state: State<AppState>) -> Result<Workspace, String> {
    let bridge = CoreBridge;
    let mut guard = state.workspace.lock().unwrap();
    let ws = guard.as_mut().ok_or(PlatformError::NoWorkspace)?;
    bridge.rename_workflow(ws, id, name)?;
    let ws_clone = ws.clone();
    drop(guard);
    auto_save(&state, &ws_clone).map_err(String::from)?;
    Ok(ws_clone)
}

// ── Workflow steps ────────────────────────────────────────────────────────────

#[tauri::command]
pub fn add_step(
    workflow_id: Uuid,
    kind: StepKind,
    state: State<AppState>,
) -> Result<Workspace, String> {
    let bridge = CoreBridge;
    let mut guard = state.workspace.lock().unwrap();
    let ws = guard.as_mut().ok_or(PlatformError::NoWorkspace)?;
    bridge.add_step(ws, workflow_id, kind)?;
    let ws_clone = ws.clone();
    drop(guard);
    auto_save(&state, &ws_clone).map_err(String::from)?;
    Ok(ws_clone)
}

#[tauri::command]
pub fn remove_step(
    workflow_id: Uuid,
    step_id: Uuid,
    state: State<AppState>,
) -> Result<Workspace, String> {
    let bridge = CoreBridge;
    let mut guard = state.workspace.lock().unwrap();
    let ws = guard.as_mut().ok_or(PlatformError::NoWorkspace)?;
    bridge.remove_step(ws, workflow_id, step_id)?;
    let ws_clone = ws.clone();
    drop(guard);
    auto_save(&state, &ws_clone).map_err(String::from)?;
    Ok(ws_clone)
}

#[tauri::command]
pub fn connect_steps(
    workflow_id: Uuid,
    from_step_id: Uuid,
    to_step_id: Uuid,
    state: State<AppState>,
) -> Result<Workspace, String> {
    let bridge = CoreBridge;
    let mut guard = state.workspace.lock().unwrap();
    let ws = guard.as_mut().ok_or(PlatformError::NoWorkspace)?;
    bridge.connect_steps(ws, workflow_id, from_step_id, to_step_id)?;
    let ws_clone = ws.clone();
    drop(guard);
    auto_save(&state, &ws_clone).map_err(String::from)?;
    Ok(ws_clone)
}

#[tauri::command]
pub fn disconnect_steps(
    workflow_id: Uuid,
    from_step_id: Uuid,
    to_step_id: Uuid,
    state: State<AppState>,
) -> Result<Workspace, String> {
    let bridge = CoreBridge;
    let mut guard = state.workspace.lock().unwrap();
    let ws = guard.as_mut().ok_or(PlatformError::NoWorkspace)?;
    bridge.disconnect_steps(ws, workflow_id, from_step_id, to_step_id)?;
    let ws_clone = ws.clone();
    drop(guard);
    auto_save(&state, &ws_clone).map_err(String::from)?;
    Ok(ws_clone)
}

#[tauri::command]
pub fn connect_methods(
    workflow_id: Uuid,
    from_class_id: Uuid,
    from_method_id: Uuid,
    to_class_id: Uuid,
    to_method_id: Uuid,
    state: State<AppState>,
) -> Result<Workspace, String> {
    let bridge = CoreBridge;
    let mut guard = state.workspace.lock().unwrap();
    let ws = guard.as_mut().ok_or(PlatformError::NoWorkspace)?;
    bridge.connect_methods(ws, workflow_id, from_class_id, from_method_id, to_class_id, to_method_id)?;
    let ws_clone = ws.clone();
    drop(guard);
    auto_save(&state, &ws_clone).map_err(String::from)?;
    Ok(ws_clone)
}
