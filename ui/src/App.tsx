import { useState, useCallback } from 'react';
import { ReactFlowProvider } from '@xyflow/react';

import { useStore } from './store';
import { api } from './api';
import type { Class } from './types';

import Toolbar from './components/Toolbar';
import Sidebar from './components/Sidebar';
import Canvas from './components/Canvas';
import WorkflowPanel from './components/WorkflowPanel';
import NewWorkspaceModal from './components/NewWorkspaceModal';
import NewNamespaceModal from './components/NewNamespaceModal';
import NewWorkflowModal from './components/NewWorkflowModal';
import ClassEditorModal from './components/ClassEditorModal';

import './App.css';

type Modal = 'workspace' | 'namespace' | 'class' | 'workflow' | null;

export default function App() {
  const { workspace, activeWorkflowId, setWorkspace } = useStore();
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

  const activeWorkflow = workspace?.workflows.find(w => w.id === activeWorkflowId) ?? null;

  return (
    <div className="app">
      <Toolbar onNewWorkspace={() => setModal('workspace')} />

      <div className="app-body">
        {!workspace ? (
          <div className="welcome">
            <div className="welcome-box">
              <div className="welcome-title">class-flow</div>
              <div className="welcome-sub">Design and visualise class workflows</div>
              <div className="welcome-actions">
                <button className="primary" onClick={() => setModal('workspace')}>New Workspace</button>
              </div>
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
              onNewWorkflow={() => setModal('workflow')}
              onEditClass={openEditClass}
              onRemoveClass={handleRemoveClass}
              onRemoveNamespace={handleRemoveNamespace}
            />
            <ReactFlowProvider>
              <Canvas onEditClass={openEditClass} />
            </ReactFlowProvider>
            {activeWorkflow && (
              <WorkflowPanel workflow={activeWorkflow} workspace={workspace} />
            )}
          </>
        )}
      </div>

      {modal === 'workspace' && <NewWorkspaceModal onClose={closeModal} />}
      {modal === 'namespace' && <NewNamespaceModal onClose={closeModal} />}
      {modal === 'workflow'  && <NewWorkflowModal  onClose={closeModal} />}
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
