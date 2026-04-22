# Design Specification — class-flow

## Vision

class-flow is a desktop workflow visualization tool that combines class diagrams with flowcharts. Users build **workspaces** containing classes organized into namespaces, then wire class methods together into named **workflows** — producing a hybrid diagram that shows both code structure and execution flow in one canvas.

Think Mermaid, but interactive: you author the classes and connections directly in the tool rather than writing markup.

---

## Core Entities

### Workspace
The top-level container. Holds a set of namespaces and a list of workflows. Persisted to disk as a single JSON file.

### Namespace
A logical grouping of classes. Maps to real-world constructs like a C# namespace or a TypeScript module. A namespace contains one or more classes, including an optional `Global` pseudo-class.

### Class
The primary building block. A class belongs to a namespace and contains:

| Member | Description |
|---|---|
| **Properties** | Named fields with type, access modifier, mutability, and static flag |
| **Methods** | Named functions with parameters, return type, access modifier, and static flag |
| **Nested classes** | Classes declared inside another class (depth supported) |

**Access modifiers**: `public`, `private`, `protected`
**Mutability**: `mutable` (default), `immutable` (readonly/const semantics)
**Static**: boolean flag, applies to both properties and methods

#### Global pseudo-class
A `Global` class can be manually created by the user inside any namespace to represent free functions (relevant for TypeScript, C-style modules, etc.). It is never created automatically — languages like C# have no concept of free functions, so an implicit `Global` would be noise. It behaves like a normal class in the diagram but is visually distinguished (e.g. a different node border style).

### Property
```
name: String
type: String          // user-provided type annotation
access: AccessModifier
immutable: bool
static: bool
```

### Method
```
name: String
parameters: Vec<Parameter>   // name + type pairs
return_type: Option<String>
access: AccessModifier
static: bool
steps: Vec<MethodStep>
```

### MethodStep
A flowchart-style step inside a method. Represents a single unit of logic or delegation within the method body.

```
statement: String                    // free-text description, e.g. "find correct id"
connection: Option<MethodStepTarget> // optional delegation to another class method
```

When a connection is set, a dashed arrow is drawn on the canvas from the step to the target method, indicating "this logic is handled by that method."

### Workflow
A named, directed graph of **WorkflowSteps**. Represents a sequence (or branching sequence) of operations across class methods. Multiple workflows can exist in a workspace simultaneously and are listed in the sidebar.

### WorkflowStep
A node in a workflow graph. A step is one of:
- A **method call** — references a specific method on a specific class
- A **class mutation** — a create or update action on a class instance

Steps are connected by directed edges on the canvas, forming the flow.

---

## UI Surfaces

### Sidebar
- Namespace tree: expands to show classes within each namespace
- Workflow list: all named workflows in the workspace
- Action buttons: **New Class**, **New Workflow**, **New Namespace**

### Toolbar
Persistent bar at the top of the window:
- Workspace name display
- **Load** — open a `.json` workspace file via native file picker
- **Save** — save to the current file (opens a picker on first save)
- **Save As…** — save to a new file
- **New…** — create a new workspace

### Main Canvas
- Class nodes rendered with labeled sections: properties above a divider, methods below
- **Methods** have connectable port handles (left = target, right = source); properties are display-only
- Method rows are expandable (click to toggle): expanded rows show the method's step list
- Workflow edges drawn between method port handles (animated, accent-colored arrows); one workflow is active at a time
- **Method step delegation edges** are always visible as dashed, muted-color arrows — drawn from each step's source handle to its connected method's target handle

### Panels / Modals
- **Create / Edit Class**: name, namespace, is-global toggle, add/remove/edit properties and methods with full modifier controls
- **Create / Edit Workflow**: name only
- **Workflow step connector**: drag from a method's right-side handle to another method's left-side handle to create a workflow step connection (only available when a workflow is active)
- **Method step editing** (inline in the class node): expand a method row to add/edit/delete steps; each step has a free-text statement field; click a step's statement to edit it in-place
- **Method step delegation connector**: drag from a step's right-side handle (smaller, amber on hover) to any method's left-side handle to set a delegation connection; click the connection label on the step row to clear it
- **Workflow panel** (right side, visible when a workflow is active): topologically-sorted step list, remove individual steps, add class mutation steps, delete workflow

---

## Theme

**Dark retro** — inspired by phosphor monitors and amber terminal displays.

- Backgrounds: near-black (`#0c0c0c` base, `#121212` panels, `#1a1a1a` elevated)
- Primary accent: muted phosphor green (`#8aab48`); secondary amber (`#c09030`)
- Text: warm off-white (`#dedad0`); muted (`#7a7468`); dim (`#4a4640`)
- Borders: `#262626` — low-contrast, subtle
- No bright whites, no saturated neons, no high-contrast gradients
- Font: monospace (`JetBrains Mono` → `Fira Code` → `Consolas` fallback chain)

---

## Out of Scope for v1

- **Language parser**: pointing the app at a real `.cs` or `.ts` file to auto-import a class outline. The domain model is designed to support this without changes — it is simply not exposed in the UI for v1.
- Multi-user / collaboration
- Export to Mermaid or other formats
- Version history / undo beyond basic UI state
