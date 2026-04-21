import { useState } from 'react';
import type { MutationAction, Workflow, Workspace, WorkflowStep } from '../types';
import { api } from '../api';
import { useStore } from '../store';
import './WorkflowPanel.css';

interface Props {
  workflow: Workflow;
  workspace: Workspace;
}

/** Topological sort — roots first, then their descendants. Falls back to insertion order. */
function sortedSteps(workflow: Workflow): WorkflowStep[] {
  const inDegree = new Map<string, number>(workflow.steps.map(s => [s.id, 0]));
  for (const e of workflow.edges) {
    inDegree.set(e.toStepId, (inDegree.get(e.toStepId) ?? 0) + 1);
  }
  const queue = workflow.steps.filter(s => (inDegree.get(s.id) ?? 0) === 0);
  const result: WorkflowStep[] = [];
  const visited = new Set<string>();
  while (queue.length) {
    const step = queue.shift()!;
    if (visited.has(step.id)) continue;
    visited.add(step.id);
    result.push(step);
    const children = workflow.edges
      .filter(e => e.fromStepId === step.id)
      .map(e => workflow.steps.find(s => s.id === e.toStepId))
      .filter((s): s is WorkflowStep => !!s);
    queue.push(...children);
  }
  for (const s of workflow.steps) {
    if (!visited.has(s.id)) result.push(s);
  }
  return result;
}

function stepLabel(step: WorkflowStep, workspace: Workspace): string {
  if (step.kind.kind === 'methodCall') {
    const { classId, methodId } = step.kind;
    const cls = workspace.namespaces.flatMap(n => n.classes).find(c => c.id === classId);
    const method = cls?.methods.find(m => m.id === methodId);
    return cls && method ? `${cls.name}.${method.name}()` : '(unknown)';
  }
  if (step.kind.kind === 'classMutation') {
    const { classId, action } = step.kind;
    const cls = workspace.namespaces.flatMap(n => n.classes).find(c => c.id === classId);
    const label = action === 'create' ? 'new' : 'update';
    return cls ? `${label} ${cls.name}` : `${label} (unknown)`;
  }
  return '(unknown)';
}

function hasOutgoing(stepId: string, workflow: Workflow): boolean {
  return workflow.edges.some(e => e.fromStepId === stepId);
}

export default function WorkflowPanel({ workflow, workspace }: Props) {
  const { setWorkspace, setActiveWorkflowId } = useStore();
  const steps = sortedSteps(workflow);
  const allClasses = workspace.namespaces.flatMap(n => n.classes);

  // ── Add mutation step form ────────────────────────────────────────────────
  const [showMutationForm, setShowMutationForm] = useState(false);
  const [mutClassId, setMutClassId] = useState(allClasses[0]?.id ?? '');
  const [mutAction, setMutAction] = useState<MutationAction>('create');

  async function handleAddMutationStep() {
    if (!mutClassId) return;
    try {
      const ws = await api.addStep(workflow.id, {
        kind: 'classMutation',
        classId: mutClassId,
        action: mutAction,
      });
      setWorkspace(ws);
      setShowMutationForm(false);
    } catch (e) {
      console.error('add step failed:', e);
    }
  }

  async function handleRemoveStep(stepId: string) {
    try { setWorkspace(await api.removeStep(workflow.id, stepId)); } catch { /* swallow */ }
  }

  async function handleRemoveWorkflow() {
    try {
      setWorkspace(await api.removeWorkflow(workflow.id));
      setActiveWorkflowId(null);
    } catch { /* swallow */ }
  }

  return (
    <aside className="workflow-panel">
      <div className="wp-header">
        <span className="wp-title">{workflow.name}</span>
        <button className="ghost" title="Close workflow" onClick={() => setActiveWorkflowId(null)}>✕</button>
      </div>

      <div className="wp-hint">
        Drag from a method's <span className="wp-handle-sample" /> to another to connect steps.
      </div>

      <div className="wp-steps">
        {steps.length === 0 && (
          <div className="wp-empty">No steps yet.<br />Connect method handles on the canvas.</div>
        )}
        {steps.map((step, i) => (
          <div key={step.id} className="wp-step">
            <div className="wp-step-row">
              <span className="wp-step-num">{i + 1}</span>
              <span className="wp-step-label">{stepLabel(step, workspace)}</span>
              <button className="ghost" title="Remove step" onClick={() => handleRemoveStep(step.id)}>✕</button>
            </div>
            {hasOutgoing(step.id, workflow) && <div className="wp-step-arrow">↓</div>}
          </div>
        ))}
      </div>

      {/* ── Add class mutation step ── */}
      <div className="wp-add-step">
        {!showMutationForm ? (
          <button className="ghost wp-add-btn" onClick={() => setShowMutationForm(true)}>
            + Class mutation step
          </button>
        ) : (
          <div className="wp-mutation-form">
            <select value={mutAction} onChange={e => setMutAction(e.target.value as MutationAction)}>
              <option value="create">create</option>
              <option value="update">update</option>
            </select>
            <select value={mutClassId} onChange={e => setMutClassId(e.target.value)}>
              {allClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div className="wp-mutation-actions">
              <button onClick={() => setShowMutationForm(false)}>Cancel</button>
              <button className="primary" onClick={handleAddMutationStep}>Add</button>
            </div>
          </div>
        )}
      </div>

      <div className="wp-footer">
        <button className="danger" onClick={handleRemoveWorkflow}>Delete Workflow</button>
      </div>
    </aside>
  );
}
