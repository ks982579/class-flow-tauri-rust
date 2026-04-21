import { useState, useCallback } from 'react';
import { ReactFlowProvider } from '@xyflow/react';

import { useStore } from './store';
import { api } from './api';
import type { Class } from './types';

import Sidebar from './components/Sidebar';
import Canvas from './components/Canvas';
import NewWorkspaceModal from './components/NewWorkspaceModal';
import NewNamespaceModal from './components/NewNamespaceModal';
import ClassEditorModal from './components/ClassEditorModal';

import './App.css';

type Modal = 'workspace' | 'namespace' | 'class' | null;

export default function App() {
  const { workspace, setWorkspace } = useStore();
  const [modal, setModal] = useState<Modal>(null);
  const [editingClass, setEditingClass] = useState<Class | undefined>();

  const closeModal = useCallback(() => {
    setModal(null);
    setEditingClass(undefined);
  }, []);

  const openEditClass = useCallback((cls: Class) => {
    setEditingClass(cls);
    setModal('class');
  }, []);

  async function handleRemoveClass(classId: string) {
    try { setWorkspace(await api.removeClass(classId)); } catch { /* swallow */ }
  }

  async function handleRemoveNamespace(id: string) {
    try { setWorkspace(await api.removeNamespace(id)); } catch { /* swallow */ }
  }

  async function handleNewWorkflow() {
    const name = prompt('Workflow name:')?.trim();
    if (!name) return;
    try { setWorkspace(await api.addWorkflow(name)); } catch { /* swallow */ }
  }

  return (
    <div className="app">
      {!workspace ? (
        <div className="welcome">
          <div className="welcome-box">
            <div className="welcome-title">class-flow</div>
            <div className="welcome-sub">Design and visualise class workflows</div>
            <button className="primary" onClick={() => setModal('workspace')}>
              New Workspace
            </button>
          </div>
        </div>
      ) : (
        <>
          <Sidebar
            workspaceName={workspace.name}
            namespaces={workspace.namespaces}
            workflows={workspace.workflows}
            onNewNamespace={() => setModal('namespace')}
            onNewClass={() => { setEditingClass(undefined); setModal('class'); }}
            onNewWorkflow={handleNewWorkflow}
            onEditClass={openEditClass}
            onRemoveClass={handleRemoveClass}
            onRemoveNamespace={handleRemoveNamespace}
          />
          <ReactFlowProvider>
            <Canvas onEditClass={openEditClass} />
          </ReactFlowProvider>
        </>
      )}

      {modal === 'workspace' && <NewWorkspaceModal onClose={closeModal} />}
      {modal === 'namespace' && <NewNamespaceModal onClose={closeModal} />}
      {modal === 'class' && workspace && (
        <ClassEditorModal
          onClose={closeModal}
          namespaces={workspace.namespaces}
          editing={editingClass}
        />
      )}
    </div>
  );
}
