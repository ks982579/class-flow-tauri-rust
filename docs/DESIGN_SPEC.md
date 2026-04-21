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
```

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

### Main Canvas
- Class nodes rendered with labeled sections: properties above a divider, methods below
- Each method and property is a connectable port
- Workflow edges drawn between method ports (directed arrows)
- Multiple workflows shown simultaneously, distinguished by color or toggle

### Panels / Modals
- **Create / Edit Class**: name, namespace, add/remove/edit properties and methods with full modifier controls
- **Create / Edit Workflow**: name, description
- **Step connector**: click a method port to start a workflow edge, click another to complete it

---

## Theme

**Dark retro** — inspired by phosphor monitors and amber terminal displays.

- Backgrounds: near-black (`#0d0d0d` range), dark charcoal panels
- Primary accent: phosphor green (`#39ff14` toned down) or amber (`#ffb300` muted)
- Text: soft off-white, never pure `#ffffff`
- Borders: dim, low-contrast; subtle glow on active elements
- No bright whites, no saturated neons, no high-contrast gradients
- Font: monospace for class/method names; legible at small sizes

---

## Out of Scope for v1

- **Language parser**: pointing the app at a real `.cs` or `.ts` file to auto-import a class outline. The domain model is designed to support this without changes — it is simply not exposed in the UI for v1.
- Multi-user / collaboration
- Export to Mermaid or other formats
- Version history / undo beyond basic UI state
