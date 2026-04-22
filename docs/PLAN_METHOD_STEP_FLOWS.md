# Plan: Method-Level Step Flows

## Context

The canvas previously showed class structure and cross-method workflow sequences, but methods themselves were opaque — you couldn't see what a method does internally or which other methods it calls. This feature adds flowchart-style **steps inside each class method**: each step holds a free-text statement (e.g. "find correct id") and optionally connects to another class method to show that logic is delegated there.

This is distinct from the existing Workflow system:
- **Workflows** — named, top-level sequences showing execution order across the whole system
- **Method steps** — internal to one method; document its logic and outgoing delegations

The result: class nodes on the canvas can expand to show their methods' step-by-step logic, with dashed delegation arrows pointing to the methods that handle each piece.

---

## Phase 1 — Core Domain Model

**File**: `crates/core/src/models.rs`

Two new types:

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MethodStepConnection {
    pub class_id: Uuid,
    pub method_id: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MethodStep {
    pub id: Uuid,
    pub statement: String,
    pub connection: Option<MethodStepConnection>,
}
```

`Method` gains `#[serde(default)] pub steps: Vec<MethodStep>` — backward-compatible with old workspace files.

Helper methods on `Method`:
- `add_step(statement) -> MethodStep`
- `remove_step(id: Uuid)`
- `step_mut(id: Uuid) -> Option<&mut MethodStep>`

Helper on `Workspace`:
- `find_method_mut(class_id, method_id) -> Option<&mut Method>` — searches across all namespaces

`Workspace::remove_class` also scrubs all `MethodStepConnection`s that point to the removed class.

---

## Phase 2 — Platform Bridge + Commands

**File**: `crates/platform/src/bridge.rs` — 5 new methods on `PlatformBridge` + `CoreBridge`:

```rust
fn add_method_step(ws, class_id, method_id, statement) -> BridgeResult<MethodStep>
fn update_method_step(ws, class_id, method_id, step_id, statement) -> BridgeResult<()>
fn remove_method_step(ws, class_id, method_id, step_id) -> BridgeResult<()>
fn set_method_step_connection(ws, class_id, method_id, step_id, target_class_id, target_method_id) -> BridgeResult<()>
fn clear_method_step_connection(ws, class_id, method_id, step_id) -> BridgeResult<()>
```

**File**: `crates/platform/src/commands.rs` — 5 new `#[tauri::command]` functions.

**File**: `src-tauri/src/lib.rs` — all 5 registered in `generate_handler![]`.

---

## Phase 3 — TypeScript Types + API

**File**: `ui/src/types.ts`

```ts
export interface MethodStepConnection { classId: string; methodId: string; }
export interface MethodStep { id: string; statement: string; connection: MethodStepConnection | null; }
```

`Method` gains `steps: MethodStep[]`.

**File**: `ui/src/api.ts` — 5 new invoke wrappers.

---

## Phase 4 — UI: Expandable Method Rows in ClassNode

**File**: `ui/src/components/ClassNode.tsx`

- Local state `expandedMethods: Set<string>` — method rows are collapsible, toggled by clicking the method header
- Expand arrow (`▸`/`▾`) on each method row
- When expanded: step list with inline statement editing (click → edit, blur/Enter → save, Escape → cancel), connection label (click to clear), delete button
- Add step row: text input + Enter/+ button
- Each step has a source handle: `step-source|{methodId}|{stepId}` (pipe delimiter avoids UUID hyphen ambiguity)

**File**: `ui/src/components/ClassNode.css` — new styles for `.method-steps`, `.step-row`, `.step-statement`, `.step-connection`, `.step-handle`, `.step-edit-input`, etc.

---

## Phase 5 — UI: Canvas Step Connection Edges

**File**: `ui/src/components/Canvas.tsx`

Step connection edges are derived from the full workspace (always visible, not workflow-dependent):

```
source: cls.id / step-source|{methodId}|{stepId}
target: step.connection.classId / target-{step.connection.methodId}
style:  dashed, var(--text-muted), strokeWidth 1
```

`onConnect` distinguishes two drag types by handle prefix:
- `step-source|…` → calls `api.setMethodStepConnection`
- `source-…` → existing workflow `api.connectMethods` (unchanged)

Step connections can be cleared by clicking the connection label on the step row in ClassNode (calls `api.clearMethodStepConnection`).
