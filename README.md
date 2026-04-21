# class-flow

A desktop application for designing and visualising class workflows. Combine class diagrams with flowcharts — build workspaces containing classes organised by namespace, then wire their methods together into named workflows.

Built with [Tauri](https://tauri.app) (Rust backend) and React + TypeScript (frontend).

---

## Prerequisites

### System dependencies

Tauri requires a few system libraries. Follow the official guide for your OS:  
https://tauri.app/start/prerequisites/

**Linux (Debian/Ubuntu)**
```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
```

**macOS** — Xcode Command Line Tools are sufficient:
```bash
xcode-select --install
```

**Windows** — Install the [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) and [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/).

### Toolchain

| Tool | Version | Install |
|---|---|---|
| Rust | stable | https://rustup.rs |
| Node.js | 18 + | https://nodejs.org |
| Tauri CLI | 2.x | `cargo install tauri-cli --version "^2"` |

Verify everything is in place:
```bash
rustc --version
node --version
cargo tauri --version
```

---

## Installation

```bash
git clone <repo-url>
cd class-flow

# Install frontend dependencies
cd ui && npm install && cd ..
```

---

## Development

Start the app with hot-reload (launches the Vite dev server and the Tauri window together):

```bash
cargo tauri dev
```

The window will open automatically. Changes to the React/TypeScript frontend reload instantly; changes to Rust code trigger a recompile.

---

## Production build

```bash
cargo tauri build
```

Produces a platform-native installer under `src-tauri/target/release/bundle/`:
- **Linux** — `.deb` and `.AppImage`
- **macOS** — `.dmg`
- **Windows** — `.msi` and `.exe`

---

## Running tests

```bash
# All workspace tests
cargo test

# Core domain model tests only
cargo test -p core
```

---

## Usage

### Creating a workspace

When class-flow opens, click **New Workspace** and enter a name. A workspace is the top-level container for all your classes and workflows.

### Saving and loading

Use the toolbar at the top of the window:

| Button | Action |
|---|---|
| **Save** | Save to the current file (prompts for a location on first save) |
| **Save As…** | Save to a new file |
| **Load** | Open an existing workspace `.json` file |
| **New…** | Create a new workspace |

Workspaces are stored as plain `.json` files — they can be opened in any text editor, shared, or checked into version control.

### Namespaces and classes

1. Click **+ Namespace** in the sidebar (or the button at the bottom) to create a namespace. Namespaces map to real-world constructs like a C# namespace or a TypeScript module.
2. Click **+ Class** to open the class editor. Fill in:
   - **Class name** and **namespace**
   - Tick **Global** if the class represents free functions (TypeScript modules, etc.)
   - **Properties** — name, type annotation, access modifier (`public`/`private`/`protected`), `readonly`, `static`
   - **Methods** — name, return type, access modifier, `static`, and any number of named parameters
3. Classes appear as nodes on the canvas. Drag them by their header bar to reposition.

Click the **✎** icon on any class node (or its name in the sidebar) to edit it.

### Workflows

1. Click **+ Workflow** in the sidebar to create a named workflow.
2. Click the workflow's name in the sidebar to activate it — a pulsing pill appears at the top of the canvas and a panel opens on the right.
3. **Connect methods**: hover over a class node to reveal the small round handles on each method row. Drag from a right-side handle (source) to a left-side handle (target) on any other method to create a step connection. An animated arrow will appear.
4. **Class mutation steps**: use the **+ Class mutation step** form in the workflow panel to add a `create` or `update` action on a class — useful for representing object construction in a flow.
5. Steps are listed in the workflow panel in topological order. Click **✕** next to a step to remove it.
6. Click the **✕** in the workflow panel header (or click the workflow name again in the sidebar) to deactivate the workflow.

### Canvas navigation

| Action | Input |
|---|---|
| Pan | Click and drag on empty canvas |
| Zoom | Scroll wheel |
| Move a node | Drag by the class header bar |
| Fit all nodes | Controls button (bottom-left) |

---

## Project structure

```
crates/
  core/       Domain types and business logic (pure Rust, no Tauri)
  platform/   Tauri command layer and platform bridge
src-tauri/    Tauri binary shell
ui/           React + TypeScript frontend
docs/         Design spec, architecture, and roadmap
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for a full technical overview and [`docs/DESIGN_SPEC.md`](docs/DESIGN_SPEC.md) for the product design.
