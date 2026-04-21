import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Workspace } from './types';

interface NodePosition { x: number; y: number }

interface StoreValue {
  workspace: Workspace | null;
  positions: Record<string, NodePosition>;
  activeWorkflowId: string | null;
  setWorkspace: (ws: Workspace) => void;
  setPosition: (classId: string, pos: NodePosition) => void;
  setActiveWorkflowId: (id: string | null) => void;
}

const Store = createContext<StoreValue | null>(null);

function autoPosition(index: number): NodePosition {
  const col = index % 3;
  const row = Math.floor(index / 3);
  return { x: 60 + col * 320, y: 60 + row * 280 };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [workspace, setWorkspaceRaw] = useState<Workspace | null>(null);
  const [positions, setPositions] = useState<Record<string, NodePosition>>({});
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(null);

  const setWorkspace = useCallback((ws: Workspace) => {
    setWorkspaceRaw(_prev => {
      const allClasses = ws.namespaces.flatMap(n => n.classes);
      setPositions(prevPos => {
        const next = { ...prevPos };
        let newCount = Object.keys(next).length;
        for (const cls of allClasses) {
          if (!next[cls.id]) next[cls.id] = autoPosition(newCount++);
        }
        const ids = new Set(allClasses.map(c => c.id));
        for (const id of Object.keys(next)) {
          if (!ids.has(id)) delete next[id];
        }
        return next;
      });
      // Clear active workflow if it was deleted
      setActiveWorkflowId(prev =>
        prev && !ws.workflows.find(w => w.id === prev) ? null : prev
      );
      return ws;
    });
  }, []);

  const setPosition = useCallback((classId: string, pos: NodePosition) => {
    setPositions(prev => ({ ...prev, [classId]: pos }));
  }, []);

  return (
    <Store.Provider value={{ workspace, positions, activeWorkflowId, setWorkspace, setPosition, setActiveWorkflowId }}>
      {children}
    </Store.Provider>
  );
}

export function useStore(): StoreValue {
  const ctx = useContext(Store);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
