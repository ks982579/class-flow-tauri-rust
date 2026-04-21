import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type NodeChange,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import ClassNode, { type ClassNodeData, type ClassNodeType } from './ClassNode';
import { useStore } from '../store';
import type { Class } from '../types';
import './Canvas.css';

const NODE_TYPES = { classNode: ClassNode };

interface Props {
  onEditClass: (cls: Class) => void;
}

export default function Canvas({ onEditClass }: Props) {
  const { workspace, positions, setPosition } = useStore();

  const nodes: ClassNodeType[] = useMemo(() => {
    if (!workspace) return [];
    return workspace.namespaces.flatMap(ns =>
      ns.classes.map(cls => ({
        id: cls.id,
        type: 'classNode' as const,
        position: positions[cls.id] ?? { x: 0, y: 0 },
        data: { cls, namespace: ns, onEdit: onEditClass } as ClassNodeData,
        dragHandle: '.class-node-header',
      }))
    );
  }, [workspace, positions, onEditClass]);

  const onNodesChange = useCallback((changes: NodeChange<ClassNodeType>[]) => {
    for (const change of changes) {
      if (change.type === 'position' && change.position) {
        setPosition(change.id, change.position);
      }
    }
  }, [setPosition]);

  return (
    <div className="canvas-wrapper">
      <ReactFlow
        nodes={nodes}
        edges={[]}
        nodeTypes={NODE_TYPES}
        onNodesChange={onNodesChange}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="var(--border)"
        />
        <Controls
          showInteractive={false}
          className="rf-controls"
        />
        <MiniMap
          nodeColor={() => 'var(--bg-elevated)'}
          maskColor="rgba(0,0,0,0.5)"
          className="rf-minimap"
        />
      </ReactFlow>
    </div>
  );
}
