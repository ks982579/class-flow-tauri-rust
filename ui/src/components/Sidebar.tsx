import { useState } from 'react';
import type { Class, Namespace, Workflow } from '../types';
import { useStore } from '../store';
import './Sidebar.css';

interface Props {
  workspaceName: string;
  namespaces: Namespace[];
  workflows: Workflow[];
  onNewNamespace: () => void;
  onNewClass: () => void;
  onNewWorkflow: () => void;
  onEditClass: (cls: Class) => void;
  onRemoveClass: (classId: string) => void;
  onRemoveNamespace: (id: string) => void;
}

export default function Sidebar({
  workspaceName,
  namespaces,
  workflows,
  onNewNamespace,
  onNewClass,
  onNewWorkflow,
  onEditClass,
  onRemoveClass,
  onRemoveNamespace,
}: Props) {
  const { activeWorkflowId, setActiveWorkflowId } = useStore();
  const [expandedNs, setExpandedNs] = useState<Set<string>>(new Set());

  function toggleNs(id: string) {
    setExpandedNs(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-workspace">{workspaceName}</div>

      {/* Namespaces */}
      <div className="sidebar-section-header">
        <span>Namespaces</span>
        <button className="ghost" title="New namespace" onClick={onNewNamespace}>+</button>
      </div>

      <div className="sidebar-tree">
        {namespaces.length === 0 && (
          <div className="sidebar-empty">No namespaces yet</div>
        )}
        {namespaces.map(ns => (
          <div key={ns.id} className="ns-group">
            <div className="ns-row" onClick={() => toggleNs(ns.id)}>
              <span className="ns-arrow">{expandedNs.has(ns.id) ? '▾' : '▸'}</span>
              <span className="ns-name">{ns.name}</span>
              <button
                className="ghost ns-delete"
                title="Remove namespace"
                onClick={e => { e.stopPropagation(); onRemoveNamespace(ns.id); }}
              >✕</button>
            </div>
            {expandedNs.has(ns.id) && (
              <div className="ns-classes">
                {ns.classes.length === 0 && (
                  <div className="sidebar-empty" style={{ paddingLeft: 28 }}>Empty</div>
                )}
                {ns.classes.map(cls => (
                  <div key={cls.id} className="class-row">
                    {cls.isGlobal && <span className="class-global-dot" title="Global" />}
                    <span className="class-row-name" onClick={() => onEditClass(cls)}>{cls.name}</span>
                    <button
                      className="ghost class-delete"
                      onClick={() => onRemoveClass(cls.id)}
                      title="Remove class"
                    >✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Workflows */}
      <div className="sidebar-section-header" style={{ marginTop: 8 }}>
        <span>Workflows</span>
        <button className="ghost" title="New workflow" onClick={onNewWorkflow}>+</button>
      </div>

      <div className="sidebar-tree">
        {workflows.length === 0 && (
          <div className="sidebar-empty">No workflows yet</div>
        )}
        {workflows.map(wf => (
          <div
            key={wf.id}
            className={`wf-row ${activeWorkflowId === wf.id ? 'active' : ''}`}
            onClick={() => setActiveWorkflowId(activeWorkflowId === wf.id ? null : wf.id)}
          >
            <span className="wf-icon">⇢</span>
            <span className="wf-name">{wf.name}</span>
            <span className="wf-steps">{wf.steps.length} steps</span>
          </div>
        ))}
      </div>

      {/* Bottom actions */}
      <div className="sidebar-actions">
        <button onClick={onNewNamespace}>+ Namespace</button>
        <button onClick={onNewClass}>+ Class</button>
        <button onClick={onNewWorkflow}>+ Workflow</button>
      </div>
    </aside>
  );
}
