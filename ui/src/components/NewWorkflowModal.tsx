import { useState } from 'react';
import Modal from './Modal';
import { api } from '../api';
import { useStore } from '../store';

interface Props { onClose: () => void }

export default function NewWorkflowModal({ onClose }: Props) {
  const { setWorkspace, setActiveWorkflowId } = useStore();
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) { setError('Name is required.'); return; }
    try {
      const ws = await api.addWorkflow(trimmed);
      setWorkspace(ws);
      const created = ws.workflows.at(-1);
      if (created) setActiveWorkflowId(created.id);
      onClose();
    } catch (e) {
      setError(String(e));
    }
  }

  return (
    <Modal title="New Workflow" onClose={onClose}>
      <div className="field">
        <label>Workflow name</label>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          placeholder="Sign Up Flow"
        />
      </div>
      {error && <div style={{ color: 'var(--danger)', fontSize: 11, marginBottom: 8 }}>{error}</div>}
      <div className="modal-footer">
        <button onClick={onClose}>Cancel</button>
        <button className="primary" onClick={handleCreate}>Create</button>
      </div>
    </Modal>
  );
}
