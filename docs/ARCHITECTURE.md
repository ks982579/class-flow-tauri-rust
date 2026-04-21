# Architecture — class-flow

## Layer Model

```
┌──────────────────────────────────────────┐
│   ui/   (Tauri webview — React / TS)     │
│   Renders canvas, forms, sidebar         │
│   Calls platform API only (invoke)       │
├──────────────────────────────────────────┤
│   platform/   (Tauri bridge crate)       │
│   ONLY layer that imports tauri          │
│   Defines PlatformBridge trait           │
│   Implements Tauri commands              │
├──────────────────────────────────────────┤
│   core/   (pure Rust domain crate)       │
│   All domain types and business logic    │
│   No UI, no I/O, no Tauri dependency     │
└──────────────────────────────────────────┘
```

**Rule**: `core` never imports `platform` or `ui`. `ui` never imports `tauri` directly. If Tauri is ever replaced, only `platform/` changes — `core` and `ui` are unaffected (beyond updating the invoke bindings).

---

## Crate / Directory Layout

```
Cargo.toml            ← workspace manifest
crates/
  core/               ← domain model, pure Rust
  platform/           ← Tauri bridge (the only Tauri-aware Rust code)
  parser/             ← (future) language file parser → Vec<Class>
src-tauri/            ← Tauri app shell; wires platform into the binary
ui/                   ← frontend source (React + TypeScript)
docs/                 ← this directory
```

---

## `core` Crate

**Responsibility**: define all domain types and enforce domain invariants. No async, no file I/O, no framework dependencies.

**Key types**:
```rust
Workspace       { id, name, namespaces: Vec<Namespace>, workflows: Vec<Workflow> }
Namespace       { id, name, classes: Vec<Class> }
Class           { id, name, namespace_id, properties, methods, nested_classes, is_global: bool }
Property        { id, name, type_annotation, access: AccessModifier, immutable: bool, static: bool }
Method          { id, name, parameters: Vec<Parameter>, return_type, access: AccessModifier, static: bool }
Parameter       { name, type_annotation }
Workflow        { id, name, steps: Vec<WorkflowStep>, edges: Vec<StepEdge> }
WorkflowStep    { id, kind: StepKind }   // StepKind = MethodCall | ClassMutation
StepEdge        { from_step_id, to_step_id }
```

**Enums**:
```rust
enum AccessModifier { Public, Private, Protected }
enum StepKind {
    MethodCall { class_id, method_id },
    ClassMutation { class_id, action: MutationAction },
}
enum MutationAction { Create, Update }
```

All types derive `serde::Serialize + Deserialize` and `Clone`. IDs are `uuid::Uuid` (or `String` wrapping a UUID).

**CRUD operations** live as plain functions or inherent methods on `Workspace` — no trait needed at this layer.

---

## `platform` Crate

**Responsibility**: expose `core` operations to the UI via a stable API. The sole owner of all `tauri` imports.

### `PlatformBridge` trait

Defined in `platform/src/bridge.rs`. The trait is **pure** — every method takes `&mut Workspace` and returns a result. No I/O, no async, no `State` parameters. This keeps the business logic testable and framework-independent.

```rust
trait PlatformBridge {
    fn add_namespace(&self, ws: &mut Workspace, name: String) -> BridgeResult<Namespace>;
    fn add_class(&self, ws: &mut Workspace, namespace_id: Uuid, name: String, is_global: bool) -> BridgeResult<Class>;
    fn connect_methods(&self, ws: &mut Workspace, workflow_id: Uuid,
                       from_class_id: Uuid, from_method_id: Uuid,
                       to_class_id: Uuid,   to_method_id: Uuid) -> BridgeResult<()>;
    // ... full namespace / class / property / method / workflow / step CRUD
}
```

`connect_methods` is the key compound operation: it find-or-creates a `MethodCall` step for each endpoint (reusing an existing step when the same class+method is already in the workflow), then connects them with a `StepEdge`.

### `AppState`

Defined in `platform/src/state.rs`. Managed by Tauri's `.manage()` call:

```rust
pub struct AppState {
    pub workspace: Mutex<Option<Workspace>>,
    pub save_path: Mutex<Option<PathBuf>>,
}
```

### Tauri commands

All `#[tauri::command]` functions live in `platform/src/commands.rs`. Each mutating command:
1. Locks `AppState::workspace`
2. Calls the appropriate `PlatformBridge` method on the `&mut Workspace`
3. Clones the updated workspace, drops the lock
4. Calls `auto_save` (writes JSON to `save_path` if one is set)
5. Returns the cloned workspace — **every mutating command returns the full `Workspace`** so the frontend replaces state in one step

File I/O (load/save) is handled directly in the command layer, not through the bridge trait.

### Persistence

Workspace saved as pretty-printed JSON (`serde_json`) to a user-chosen path. The path is stored in `AppState::save_path` and reused for auto-save on every subsequent mutation.

---

## `ui` (Frontend)

**Stack**: React 19 + TypeScript, bundled with Vite. Runs inside the Tauri webview.

**Canvas library**: `@xyflow/react` v12 (React Flow). Class nodes are custom node components; workflow step connections are React Flow edges derived from the active workflow's `steps` + `edges` arrays.

**Communication**: `@tauri-apps/api/core`'s `invoke` function only, via a typed wrapper in `ui/src/api.ts`. The UI never imports `tauri` outside of that file.

**File dialogs**: `@tauri-apps/plugin-dialog` (`tauri-plugin-dialog` on the Rust side) provides native OS open/save pickers for workspace files.

**State**: `ui/src/store.tsx` — a React context wrapping three pieces of state:
- `workspace: Workspace | null` — the authoritative in-memory workspace, always sourced from the Rust backend
- `positions: Record<string, {x,y}>` — per-class canvas coordinates (frontend-only, not persisted)
- `activeWorkflowId: string | null` — which workflow's edges are currently overlaid on the canvas

**Theme**: `ui/src/theme.css` defines all palette values as CSS custom properties. No component stylesheet hardcodes a colour.

---

## Future: `parser` Crate

An optional crate that accepts a source file path and returns a `Vec<Class>` in `core` types. Plugs into `platform` as an optional Tauri command. No changes to `core` types are required — the `Class` type is already general enough to be constructed from parsed data.

Initial target: C# (`.cs`). Parsing strategy TBD (regex-based outline extraction vs. full syntax tree).

---

## Data Flow (example: create a class)

```
UI form submit
  → invoke("add_class", { namespaceId, name, isGlobal })
  → platform: #[tauri::command] add_class(namespace_id, name, is_global, state)
  → lock AppState::workspace
  → CoreBridge::add_class(&mut workspace, namespace_id, name, is_global)
  → core: namespace.add_class(Class::new(...))
  → clone workspace, drop lock
  → auto_save writes JSON to save_path (if set)
  → return Ok(workspace_clone)
  → UI: setWorkspace(ws) — canvas re-renders with new class node
```

---

## Key Constraints

- `core` must compile with no Tauri, no tokio, no file system access.
- All `#[tauri::command]` annotations live only in `platform/src/commands.rs`; they are registered in `src-tauri/src/lib.rs`.
- Theme palette is defined once in `ui/src/theme.css` as CSS custom properties — never hardcoded in component stylesheets.
- IDs are stable across save/load (UUID v4 strings, not array indices).
- **serde camelCase on enums**: `#[serde(rename_all = "camelCase")]` at the enum level renames the variant *tag value* only. To rename fields *inside* a struct variant, each variant also needs its own `#[serde(rename_all = "camelCase")]` attribute. `StepKind` demonstrates this — both the enum and each variant carry the attribute.
