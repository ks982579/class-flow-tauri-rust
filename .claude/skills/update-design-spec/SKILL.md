---
name: update-design-spec
description: Updates docs/DESIGN_SPEC.md to reflect the current state of the application after code changes. Run this after completing a feature or bug fix.
---

Review `docs/DESIGN_SPEC.md` and update it to accurately reflect the current state of the application. You have full context from this conversation about what was just changed.

Read the current spec first:

```
docs/DESIGN_SPEC.md
```

Then check each section against what you know about the implementation:

**Vision** — still accurate? Does it describe what the app actually does?

**Core Entities** — do the field names, types, and descriptions match the implemented domain model? Check property/method modifier flags, the Global pseudo-class behaviour, WorkflowStep kinds.

**UI Surfaces** — does each surface described actually exist? Are the interactions accurate (e.g. drag vs click, one active workflow vs simultaneous, which elements have connectable ports)? Add any surfaces that exist but aren't documented (toolbar, panels, etc.).

**Theme** — do the documented palette values match `ui/src/theme.css`?

**Out of Scope for v1** — remove anything that has since been implemented.

Rules:
- Make only targeted edits. Do not rewrite sections that are already accurate.
- Do not add generic filler. Every sentence must describe something that actually exists in the UI or domain model.
- Preserve the document's tone and structure.
- If a section is accurate, leave it alone.
