import { save as dialogSave, open as dialogOpen } from '@tauri-apps/plugin-dialog';
import { api } from '../api';
import { useStore } from '../store';
import './Toolbar.css';

interface Props {
  onNewWorkspace: () => void;
}

export default function Toolbar({ onNewWorkspace }: Props) {
  const { workspace, setWorkspace } = useStore();

  async function handleSave() {
    if (!workspace) return;
    try {
      // Try auto-save first (uses last-used path if set)
      await api.saveWorkspace();
    } catch {
      // No path set yet — open a save dialog
      const path = await dialogSave({
        defaultPath: `${workspace.name.replace(/\s+/g, '-').toLowerCase()}.json`,
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });
      if (path) await api.saveWorkspace(path);
    }
  }

  async function handleLoad() {
    const result = await dialogOpen({
      multiple: false,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    const path = Array.isArray(result) ? result[0] : result;
    if (!path) return;
    try {
      const ws = await api.loadWorkspace(typeof path === 'string' ? path : path.path);
      setWorkspace(ws);
    } catch (e) {
      console.error('load failed:', e);
    }
  }

  async function handleSaveAs() {
    if (!workspace) return;
    const path = await dialogSave({
      defaultPath: `${workspace.name.replace(/\s+/g, '-').toLowerCase()}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (path) await api.saveWorkspace(path);
  }

  return (
    <header className="toolbar">
      <span className="toolbar-logo">class-flow</span>
      {workspace && (
        <span className="toolbar-workspace-name">{workspace.name}</span>
      )}
      <div className="toolbar-spacer" />
      <div className="toolbar-actions">
        <button onClick={handleLoad} title="Open workspace from file">Load</button>
        {workspace && (
          <>
            <button onClick={handleSave} className="primary" title="Save workspace">Save</button>
            <button onClick={handleSaveAs} title="Save to a new file">Save As…</button>
          </>
        )}
        <button onClick={onNewWorkspace} title="Create a new workspace">New…</button>
      </div>
    </header>
  );
}
