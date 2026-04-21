# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**class-flow** is a workflow visualization tool that combines class diagrams with flowcharts. Users build workspaces containing classes (organized by namespace), then wire class methods together into named workflows — producing something like a hybrid Mermaid class diagram + flowchart, with a dark retro color theme.

The UI will be built with Tauri, but Tauri must never be imported directly into application logic. All platform/desktop integration goes through a thin wrapper layer so the renderer can be swapped without touching business logic.

## Build & Run

```bash
cargo build          # compile
cargo run            # run
cargo test           # all tests
cargo test <name>    # single test by name filter
cargo clippy         # lint
cargo fmt            # format
```

Once Tauri is added:
```bash
cargo tauri dev      # dev server with hot-reload
cargo tauri build    # production bundle
```

## Architecture

### Layering rules (strict)

```
core/          ← pure domain: no UI, no Tauri, no I/O
platform/      ← Tauri wrapper — exposes a stable API surface
               ← if Tauri is ever replaced, only this layer changes
ui/            ← frontend (likely TS/React via Tauri) — calls platform API only
```

`core` must never import `platform` or `ui`. `ui` must never import `tauri` directly.

### Domain model (core)

Key entities and their expected fields:

- **Workspace** — top-level container; holds namespaces and a list of workflows.
- **Namespace** — groups classes (maps to C# namespace, TS module, etc.).
- **Class** — belongs to a namespace; has:
  - Properties: name, type, access modifier (`public`/`private`/`protected`), mutability (`mut`/immutable), `static` flag
  - Methods: name, parameters, return type, same modifier/static flags
  - Nested classes (optional depth)
  - A sentinel **Global** class per namespace for free functions (TypeScript, etc.)
- **Workflow** — an ordered graph of **WorkflowStep** nodes; each step references a class method or a create/update action on a class.

### Platform wrapper

The `platform` crate (or module) wraps every Tauri command behind a trait/interface defined in `core`. The rest of the app calls that trait. Concrete Tauri implementations live only inside `platform`.

### Future: language parser

A planned optional module will accept a path to a source file (e.g. a `.cs` file) and produce a `Class` value in the domain model. It is out of scope for the initial build; design the `Class` type to be constructable from parsed data without changes.

### UI / Theme

Dark retro palette — low-brightness backgrounds, muted accent colors, easy on the eyes. No bright whites or high-contrast neons. Canvas renders classes as nodes with labeled ports (methods/properties); edges between ports represent workflow steps.

## Documentation

| File | Purpose |
|---|---|
| [`docs/DESIGN_SPEC.md`](docs/DESIGN_SPEC.md) | Product-level spec: entities, UI surfaces, theme |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Technical spec: crate layout, layer rules, data flow, type signatures |
| [`docs/PLAN.md`](docs/PLAN.md) | Phased execution roadmap (Phase 0–5) with per-phase exit criteria |
