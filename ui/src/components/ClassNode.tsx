import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import type { Class, Namespace } from '../types';
import { accessSymbol, formatMethodSignature } from '../types';
import './ClassNode.css';

export interface ClassNodeData extends Record<string, unknown> {
  cls: Class;
  namespace: Namespace;
  onEdit: (cls: Class) => void;
}

export type ClassNodeType = Node<ClassNodeData, 'classNode'>;

export default function ClassNode({ data }: NodeProps<ClassNodeType>) {
  const { cls, namespace, onEdit } = data as ClassNodeData;

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
          {cls.methods.map(method => (
            <div key={method.id} className="member-row method-row">
              {/* Left handle — incoming workflow edge */}
              <Handle
                type="target"
                position={Position.Left}
                id={`target-${method.id}`}
                className="method-handle"
              />
              <span className={`access-sym access-${method.access}`}>{accessSymbol(method.access)}</span>
              <span className="member-name">{method.name}</span>
              <span className="member-type">{formatMethodSignature(method)}</span>
              {method.isStatic && <span className="mod-badge static">S</span>}
              {/* Right handle — outgoing workflow edge */}
              <Handle
                type="source"
                position={Position.Right}
                id={`source-${method.id}`}
                className="method-handle"
              />
            </div>
          ))}
        </div>
      )}

      {cls.properties.length === 0 && cls.methods.length === 0 && (
        <div className="class-node-empty">empty</div>
      )}
    </div>
  );
}
