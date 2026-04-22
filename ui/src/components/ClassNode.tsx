import { useState } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import type { Class, Namespace } from '../types';
import { accessSymbol, formatMethodSignature } from '../types';
import { api } from '../api';
import { useStore } from '../store';
import './ClassNode.css';

export interface ClassNodeData extends Record<string, unknown> {
  cls: Class;
  namespace: Namespace;
  onEdit: (cls: Class) => void;
}

export type ClassNodeType = Node<ClassNodeData, 'classNode'>;

export default function ClassNode({ data }: NodeProps<ClassNodeType>) {
  const { cls, namespace, onEdit } = data as ClassNodeData;
  const { workspace, setWorkspace, expandedMethods, toggleMethodExpansion } = useStore();
  const [editingStep, setEditingStep] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [addingStepForMethod, setAddingStepForMethod] = useState<string | null>(null);
  const [newStepText, setNewStepText] = useState('');

  function connectionLabel(classId: string, methodId: string): string {
    if (!workspace) return '→ ?';
    for (const ns of workspace.namespaces) {
      for (const c of ns.classes) {
        if (c.id === classId) {
          const m = c.methods.find(m => m.id === methodId);
          if (m) return `→ ${c.name}.${m.name}()`;
        }
      }
    }
    return '→ ?';
  }

  async function handleAddStep(methodId: string) {
    if (!newStepText.trim()) return;
    const ws = await api.addMethodStep(cls.id, methodId, newStepText.trim());
    setWorkspace(ws);
    setNewStepText('');
    setAddingStepForMethod(null);
  }

  async function handleUpdateStep(methodId: string, stepId: string) {
    if (!editText.trim()) { setEditingStep(null); return; }
    const ws = await api.updateMethodStep(cls.id, methodId, stepId, editText.trim());
    setWorkspace(ws);
    setEditingStep(null);
    setEditText('');
  }

  async function handleRemoveStep(methodId: string, stepId: string) {
    const ws = await api.removeMethodStep(cls.id, methodId, stepId);
    setWorkspace(ws);
  }

  async function handleClearConnection(methodId: string, stepId: string) {
    const ws = await api.clearMethodStepConnection(cls.id, methodId, stepId);
    setWorkspace(ws);
  }

  return (
    <div className={`class-node ${cls.isGlobal ? 'global' : ''}`}>
      <div className="class-node-header">
        <div className="class-node-title">
          <span className="class-name">{cls.name}</span>
          {cls.isGlobal && <span className="badge-global">global</span>}
        </div>
        <div className="class-node-meta">
          <span className="ns-label">{namespace.name}</span>
          <button className="ghost node-edit-btn" onClick={() => onEdit(cls)}>✎</button>
        </div>
      </div>

      {cls.properties.length > 0 && (
        <div className="class-node-section">
          {cls.properties.map(prop => (
            <div key={prop.id} className="member-row">
              <span className={`access-sym access-${prop.access}`}>{accessSymbol(prop.access)}</span>
              <span className="member-name">{prop.name}</span>
              <span className="member-type">{prop.typeAnnotation}</span>
              {prop.isStatic  && <span className="mod-badge static">S</span>}
              {prop.immutable && <span className="mod-badge readonly">R</span>}
            </div>
          ))}
        </div>
      )}

      {cls.properties.length > 0 && cls.methods.length > 0 && (
        <div className="class-node-divider" />
      )}

      {cls.methods.length > 0 && (
        <div className="class-node-section">
          {cls.methods.map(method => {
            const expanded = expandedMethods.has(method.id);
            const isAdding = addingStepForMethod === method.id;
            return (
              <div key={method.id} className="method-group">
                <div
                  className="member-row method-row"
                  onClick={() => toggleMethodExpansion(method.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <Handle
                    type="target"
                    position={Position.Left}
                    id={`target-${method.id}`}
                    className="method-handle"
                  />
                  <span className="method-expand">{expanded ? '▾' : '▸'}</span>
                  <span className={`access-sym access-${method.access}`}>{accessSymbol(method.access)}</span>
                  <span className="member-name">{method.name}</span>
                  <span className="member-type">{formatMethodSignature(method)}</span>
                  {method.isStatic && <span className="mod-badge static">S</span>}
                  <Handle
                    type="source"
                    position={Position.Right}
                    id={`source-${method.id}`}
                    className="method-handle"
                  />
                </div>

                {expanded && (
                  <div className="method-steps">
                    {method.steps.map(step => (
                      <div key={step.id} className="step-row">
                        <Handle
                          type="source"
                          position={Position.Right}
                          id={`step-source|${method.id}|${step.id}`}
                          className="step-handle"
                        />
                        {editingStep === step.id ? (
                          <input
                            className="step-edit-input nodrag"
                            value={editText}
                            autoFocus
                            onChange={e => setEditText(e.target.value)}
                            onBlur={() => handleUpdateStep(method.id, step.id)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleUpdateStep(method.id, step.id);
                              if (e.key === 'Escape') { setEditingStep(null); setEditText(''); }
                            }}
                          />
                        ) : (
                          <span
                            className="step-statement"
                            onClick={e => { e.stopPropagation(); setEditingStep(step.id); setEditText(step.statement); }}
                          >
                            {step.statement}
                          </span>
                        )}
                        {step.connection && (
                          <span
                            className="step-connection"
                            title="click to clear"
                            onClick={e => { e.stopPropagation(); handleClearConnection(method.id, step.id); }}
                          >
                            {connectionLabel(step.connection.classId, step.connection.methodId)}
                          </span>
                        )}
                        <button
                          className="ghost step-delete"
                          onClick={e => { e.stopPropagation(); handleRemoveStep(method.id, step.id); }}
                        >✕</button>
                      </div>
                    ))}

                    {isAdding ? (
                      <div className="step-add-row">
                        <input
                          className="step-edit-input nodrag"
                          placeholder="statement…"
                          value={newStepText}
                          autoFocus
                          onChange={e => setNewStepText(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleAddStep(method.id);
                            if (e.key === 'Escape') { setAddingStepForMethod(null); setNewStepText(''); }
                          }}
                        />
                        <button
                          className="ghost step-add-btn"
                          onClick={e => { e.stopPropagation(); handleAddStep(method.id); }}
                        >+</button>
                      </div>
                    ) : (
                      <button
                        className="ghost step-new-btn"
                        onClick={e => { e.stopPropagation(); setAddingStepForMethod(method.id); setNewStepText(''); }}
                      >+ step</button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {cls.properties.length === 0 && cls.methods.length === 0 && (
        <div className="class-node-empty">empty</div>
      )}
    </div>
  );
}
