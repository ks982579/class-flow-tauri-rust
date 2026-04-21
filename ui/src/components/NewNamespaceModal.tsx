import { useState } from 'react';
import Modal from './Modal';
import { api } from '../api';
import { useStore } from '../store';

interface Props { onClose: () => void }

export default function NewNamespaceModal({ onClose }: Props) {
  const { setWorkspace } = useStore();
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) { setError('Name is required.'); return; }
    try {
      const ws = await api.addNamespace(trimmed);
      setWorkspace(ws);
      onClose();
    } catch (e) {
      setError(String(e));
    }
  }

  return (
    <Modal title="New Namespace" onClose={onClose}>
      <div className="field">
        <label>Namespace name</label>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          placeholder="App.Services"
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
