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

Defined in `platform`, implemented in terms of `core`. Signature mirrors the set of Tauri commands:

```rust
trait PlatformBridge {
    fn load_workspace(&self, path: &Path) -> Result<Workspace>;
    fn save_workspace(&self, path: &Path, workspace: &Workspace) -> Result<()>;
    fn get_workspace(&self) -> Result<Workspace>;
    // ... class CRUD, workflow CRUD, step CRUD
}
```

### Tauri commands

All `#[tauri::command]` functions live here. They:
1. Deserialize inputs from the webview
2. Delegate to the `PlatformBridge` implementation
3. Serialize `core` types back to the webview

### Persistence

Workspace saved as JSON (`serde_json`) to a user-chosen file path. `platform` owns the file I/O; `core` only knows about the in-memory model.

---

## `ui` (Frontend)

**Stack**: React + TypeScript inside a Tauri webview. Framework/tooling TBD (Vite is the Tauri default).

**Canvas library**: TBD — React Flow is the leading candidate for rendering class nodes and workflow edges as a directed graph.

**Communication**: `@tauri-apps/api`'s `invoke` function only. The UI never calls Rust directly — it calls named Tauri commands exposed by `platform`.

**State**: Local React state / context for UI interaction state; workspace data fetched from / pushed to the Rust backend via commands. No external state management library needed for v1.

**Theme**: CSS custom properties for all palette values. A single `theme.css` file defines the dark retro palette; components reference variables only (no hard-coded colors in component CSS).

---

## Future: `parser` Crate

An optional crate that accepts a source file path and returns a `Vec<Class>` in `core` types. Plugs into `platform` as an optional Tauri command. No changes to `core` types are required — the `Class` type is already general enough to be constructed from parsed data.

Initial target: C# (`.cs`). Parsing strategy TBD (regex-based outline extraction vs. full syntax tree).

---

## Data Flow (example: create a class)

```
UI form submit
  → invoke("create_class", { namespace_id, name, ... })
  → platform: #[tauri::command] create_class(...)
  → platform: bridge.create_class(namespace_id, class_def)
  → core: workspace.namespace_mut(id).add_class(class_def)
  → platform: save_workspace(path, &workspace)   // auto-save
  → return Ok(updated_workspace)
  → UI updates canvas with new class node
```

---

## Key Constraints

- `core` must compile with no Tauri, no tokio, no file system access.
- All `#[tauri::command]` annotations exist only in `platform/` or `src-tauri/`.
- Theme palette is defined once in CSS variables — never duplicated in component styles.
- IDs are stable across save/load (UUIDs, not array indices).
