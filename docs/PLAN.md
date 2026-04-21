# Execution Plan — class-flow

Phased roadmap from blank scaffold to a working workflow visualization tool. Each phase produces something runnable or verifiable before the next begins.

---

## Phase 0 — Repo Scaffolding

**Goal**: convert the single-crate repo to a Cargo workspace and stand up the Tauri shell.

- [ ] Convert `Cargo.toml` to a workspace manifest
- [ ] Create `crates/core/` with its own `Cargo.toml` (`serde`, `serde_json`, `uuid`)
- [ ] Create `crates/platform/` with its own `Cargo.toml` (depends on `core`)
- [ ] Run `cargo tauri init` to generate `src-tauri/` and `ui/` scaffold
- [ ] Wire `src-tauri/` to depend on `platform`
- [ ] Verify `cargo build` and `cargo tauri dev` both succeed on the empty shell

**Exit criteria**: `cargo tauri dev` opens a blank Tauri window.

---

## Phase 1 — Core Domain Model

**Goal**: all domain types exist, serialize/deserialize correctly, and have basic CRUD logic.

- [ ] Define all types in `crates/core/src/`: `Workspace`, `Namespace`, `Class`, `Property`, `Method`, `Parameter`, `Workflow`, `WorkflowStep`, `StepEdge`
- [ ] Define enums: `AccessModifier`, `Mutability`, `StepKind`, `MutationAction`
- [ ] Derive `serde::{Serialize, Deserialize}`, `Clone`, `Debug` on all types
- [ ] Use `uuid::Uuid` for all IDs
- [ ] Implement workspace-level CRUD: add/remove namespace, add/remove class, add/remove workflow, add/remove step
- [ ] Write unit tests for: round-trip serialization, CRUD invariants (e.g. removing a class removes its method references from all workflows)

**Exit criteria**: `cargo test -p core` passes.

---

## Phase 2 — Platform Bridge

**Goal**: Tauri commands exist and the workspace can be saved/loaded from disk.

- [ ] Define `PlatformBridge` trait in `crates/platform/`
- [ ] Implement `TauriBridge` struct that holds `Arc<Mutex<Workspace>>`
- [ ] Tauri commands: `load_workspace`, `save_workspace`, `get_workspace`, class CRUD, workflow CRUD, step CRUD
- [ ] Register commands with Tauri in `src-tauri/main.rs`
- [ ] Auto-save on every mutation (save to last-used path)
- [ ] Manual test: invoke commands from the Tauri dev console

**Exit criteria**: open a workspace JSON file, add a class via `invoke`, reload the app, class persists.

---

## Phase 3 — Canvas UI (MVP)

**Goal**: classes are visible on the canvas; the sidebar is functional.

- [ ] Set up Vite + React + TypeScript in `ui/`
- [ ] Install React Flow (or chosen canvas library)
- [ ] Implement dark retro theme (`ui/src/theme.css`) with CSS custom properties
- [ ] Sidebar component: namespace tree, workflow list, action buttons
- [ ] Class node component: property section + method section with port markers
- [ ] Load workspace on app start; render class nodes
- [ ] "New Class" modal: name, namespace selector, add properties/methods with modifier controls
- [ ] "New Namespace" modal

**Exit criteria**: create a namespace, create two classes with methods — both appear as nodes on the canvas.

---

## Phase 4 — Workflow Editor

**Goal**: workflows can be created and steps wired between method ports.

- [ ] "New Workflow" modal: name
- [ ] Workflow selector / tab in sidebar to set the active workflow
- [ ] Click a method port → starts a pending edge; click another method port → completes a `WorkflowStep` edge
- [ ] `WorkflowStep` nodes rendered between method ports (or as edge labels)
- [ ] "Edit Workflow" panel: ordered step list, ability to reorder/delete steps
- [ ] Visual distinction between multiple workflows (color overlay or toggle)

**Exit criteria**: create a workflow, connect three method ports in sequence, save, reload — workflow survives.

---

## Phase 5 — Polish & Future Hooks

**Goal**: loose ends, quality-of-life, and stub hooks for future features.

- [ ] Nested class support in "Edit Class" UI (add class inside class)
- [ ] `Global` pseudo-class: surface as a user-creatable class type in the "New Class" form; visually distinguished on the canvas (distinct border/label)
- [ ] Class mutation steps in workflows (Create / Update actions, not just method calls)
- [ ] Keyboard shortcuts for common actions (new class, new workflow)
- [ ] `parser/` crate stub: trait `LanguageParser` with a no-op implementation; a single disabled UI button "Import from file" as a placeholder
- [ ] Update CLAUDE.md with final crate layout and any commands that changed

**Exit criteria**: app is usable for a demo; parser button present but disabled.

---

## Reference

- Design details: [`DESIGN_SPEC.md`](./DESIGN_SPEC.md)
- Technical architecture: [`ARCHITECTURE.md`](./ARCHITECTURE.md)
