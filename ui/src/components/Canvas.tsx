import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type NodeChange,
  type Connection,
  type Edge,
  BackgroundVariant,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import ClassNode, { type ClassNodeData, type ClassNodeType } from './ClassNode';
import { useStore } from '../store';
import { api } from '../api';
import type { Class } from '../types';
import './Canvas.css';

const NODE_TYPES = { classNode: ClassNode };

interface Props {
  onEditClass: (cls: Class) => void;
}

export default function Canvas({ onEditClass }: Props) {
  const { workspace, positions, activeWorkflowId, setWorkspace, setPosition } = useStore();

  // ── Nodes ──────────────────────────────────────────────────────────────────

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

  // ── Edges — built from the active workflow's steps + edges ─────────────────

  const edges: Edge[] = useMemo(() => {
    if (!workspace || !activeWorkflowId) return [];
    const wf = workspace.workflows.find(w => w.id === activeWorkflowId);
    if (!wf) return [];

    const stepMap = new Map(wf.steps.map(s => [s.id, s]));

    return wf.edges.flatMap(e => {
      const from = stepMap.get(e.fromStepId);
      const to   = stepMap.get(e.toStepId);
      if (!from || !to) return [];
      if (from.kind.kind !== 'methodCall' || to.kind.kind !== 'methodCall') return [];

      return [{
        id: `${e.fromStepId}-${e.toStepId}`,
        source:       from.kind.classId,
        sourceHandle: `source-${from.kind.methodId}`,
        target:       to.kind.classId,
        targetHandle: `target-${to.kind.methodId}`,
        style: { stroke: 'var(--accent)', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--accent)' },
        animated: true,
      }];
    });
  }, [workspace, activeWorkflowId]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const onNodesChange = useCallback((changes: NodeChange<ClassNodeType>[]) => {
    for (const change of changes) {
      if (change.type === 'position' && change.position) {
        setPosition(change.id, change.position);
      }
    }
  }, [setPosition]);

  const onConnect = useCallback(async (connection: Connection) => {
    if (!activeWorkflowId) return;

    // Handle IDs are formatted as "source-{methodId}" / "target-{methodId}"
    const fromMethodId = connection.sourceHandle?.replace('source-', '');
    const toMethodId   = connection.targetHandle?.replace('target-', '');
    if (!connection.source || !connection.target || !fromMethodId || !toMethodId) return;

    try {
      const ws = await api.connectMethods(
        activeWorkflowId,
        connection.source,  fromMethodId,
        connection.target,  toMethodId,
      );
      setWorkspace(ws);
    } catch (e) {
      console.error('connect_methods failed:', e);
    }
  }, [activeWorkflowId, setWorkspace]);

  // ── Mode overlay ───────────────────────────────────────────────────────────

  const activeWorkflow = workspace?.workflows.find(w => w.id === activeWorkflowId);

  return (
    <div className="canvas-wrapper">
      {activeWorkflow && (
        <div className="canvas-mode-bar">
          <span className="canvas-mode-dot" />
          Editing workflow: <strong>{activeWorkflow.name}</strong>
          <span className="canvas-mode-hint">drag between method handles to connect steps</span>
        </div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        onNodesChange={onNodesChange}
        onConnect={onConnect}
        connectOnClick={false}
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
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={() => 'var(--bg-elevated)'}
          maskColor="rgba(0,0,0,0.5)"
        />
      </ReactFlow>
    </div>
  );
}
