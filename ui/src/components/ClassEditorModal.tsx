import { useState } from 'react';
import Modal from './Modal';
import { api } from '../api';
import { useStore } from '../store';
import type { AccessModifier, Class, Method, Namespace, Parameter, Property } from '../types';

interface Props {
  onClose: () => void;
  namespaces: Namespace[];
  editing?: Class;
}

function newProp(): Property {
  return { id: crypto.randomUUID(), name: '', typeAnnotation: '', access: 'public', immutable: false, isStatic: false };
}
function newMethod(): Method {
  return { id: crypto.randomUUID(), name: '', parameters: [], returnType: null, access: 'public', isStatic: false };
}
function newParam(): Parameter {
  return { name: '', typeAnnotation: '' };
}

const ACCESS_OPTIONS: AccessModifier[] = ['public', 'private', 'protected'];

export default function ClassEditorModal({ onClose, namespaces, editing }: Props) {
  const { setWorkspace } = useStore();

  const [name, setName] = useState(editing?.name ?? '');
  const [nsId, setNsId] = useState(editing?.namespaceId ?? namespaces[0]?.id ?? '');
  const [isGlobal, setIsGlobal] = useState(editing?.isGlobal ?? false);
  const [properties, setProperties] = useState<Property[]>(editing?.properties ?? []);
  const [methods, setMethods] = useState<Method[]>(editing?.methods ?? []);
  const [error, setError] = useState('');

  // ── property helpers ──────────────────────────────────────────────────────

  function setProp<K extends keyof Property>(idx: number, key: K, val: Property[K]) {
    setProperties(prev => prev.map((p, i) => i === idx ? { ...p, [key]: val } : p));
  }

  // ── method helpers ────────────────────────────────────────────────────────

  function setMethodField<K extends keyof Method>(idx: number, key: K, val: Method[K]) {
    setMethods(prev => prev.map((m, i) => i === idx ? { ...m, [key]: val } : m));
  }

  function addParam(mIdx: number) {
    setMethods(prev => prev.map((m, i) =>
      i === mIdx ? { ...m, parameters: [...m.parameters, newParam()] } : m));
  }
  function setParam(mIdx: number, pIdx: number, key: keyof Parameter, val: string) {
    setMethods(prev => prev.map((m, i) =>
      i === mIdx
        ? { ...m, parameters: m.parameters.map((p, pi) => pi === pIdx ? { ...p, [key]: val } : p) }
        : m));
  }
  function removeParam(mIdx: number, pIdx: number) {
    setMethods(prev => prev.map((m, i) =>
      i === mIdx ? { ...m, parameters: m.parameters.filter((_, pi) => pi !== pIdx) } : m));
  }

  // ── submit ────────────────────────────────────────────────────────────────

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) { setError('Class name is required.'); return; }
    if (!nsId) { setError('Select a namespace.'); return; }
    try {
      let ws;
      if (editing) {
        ws = await api.replaceClass({ ...editing, name: trimmed, namespaceId: nsId, isGlobal, properties, methods });
      } else {
        // Create the class skeleton first, then patch with members via replaceClass
        const intermediate = await api.addClass(nsId, trimmed, isGlobal);
        const created = intermediate.namespaces
          .flatMap(n => n.classes)
          .find(c => c.name === trimmed && c.namespaceId === nsId)!;
        ws = await api.replaceClass({ ...created, properties, methods });
      }
      setWorkspace(ws);
      onClose();
    } catch (e) {
      setError(String(e));
    }
  }

  return (
    <Modal title={editing ? `Edit: ${editing.name}` : 'New Class'} onClose={onClose} width={680}>
      {/* ── Class info ── */}
      <div className="field-row">
        <div className="field">
          <label>Class name</label>
          <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="UserService" />
        </div>
        <div className="field">
          <label>Namespace</label>
          <select value={nsId} onChange={e => setNsId(e.target.value)}>
            {namespaces.map(ns => <option key={ns.id} value={ns.id}>{ns.name}</option>)}
          </select>
        </div>
      </div>
      <label className="checkbox-row" style={{ marginBottom: 12 }}>
        <input type="checkbox" checked={isGlobal} onChange={e => setIsGlobal(e.target.checked)} />
        Mark as Global (free functions container)
      </label>

      {/* ── Properties ── */}
      <div className="section-header">
        <span>Properties</span>
        <button className="ghost" onClick={() => setProperties(p => [...p, newProp()])}>+ Add</button>
      </div>
      {properties.map((prop, i) => (
        <div key={prop.id} className="field-row" style={{ alignItems: 'center' }}>
          <input value={prop.name} onChange={e => setProp(i, 'name', e.target.value)} placeholder="name" />
          <input value={prop.typeAnnotation} onChange={e => setProp(i, 'typeAnnotation', e.target.value)} placeholder="type" />
          <select value={prop.access} onChange={e => setProp(i, 'access', e.target.value as AccessModifier)}>
            {ACCESS_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <label className="checkbox-row" style={{ flex: '0 0 auto', whiteSpace: 'nowrap' }}>
            <input type="checkbox" checked={prop.immutable} onChange={e => setProp(i, 'immutable', e.target.checked)} />
            readonly
          </label>
          <label className="checkbox-row" style={{ flex: '0 0 auto', whiteSpace: 'nowrap' }}>
            <input type="checkbox" checked={prop.isStatic} onChange={e => setProp(i, 'isStatic', e.target.checked)} />
            static
          </label>
          <button className="ghost danger" onClick={() => setProperties(p => p.filter((_, pi) => pi !== i))}>✕</button>
        </div>
      ))}

      {/* ── Methods ── */}
      <div className="section-header">
        <span>Methods</span>
        <button className="ghost" onClick={() => setMethods(m => [...m, newMethod()])}>+ Add</button>
      </div>
      {methods.map((method, mi) => (
        <div key={method.id} style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius)', padding: '8px', marginBottom: 6 }}>
          <div className="field-row" style={{ alignItems: 'center', marginBottom: 4 }}>
            <input value={method.name} onChange={e => setMethodField(mi, 'name', e.target.value)} placeholder="methodName" />
            <input
              value={method.returnType ?? ''}
              onChange={e => setMethodField(mi, 'returnType', e.target.value || null)}
              placeholder="return type"
            />
            <select value={method.access} onChange={e => setMethodField(mi, 'access', e.target.value as AccessModifier)}>
              {ACCESS_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <label className="checkbox-row" style={{ flex: '0 0 auto', whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={method.isStatic} onChange={e => setMethodField(mi, 'isStatic', e.target.checked)} />
              static
            </label>
            <button className="ghost danger" onClick={() => setMethods(m => m.filter((_, i) => i !== mi))}>✕</button>
          </div>
          {/* Parameters */}
          {method.parameters.map((p, pi) => (
            <div key={pi} className="field-row" style={{ paddingLeft: 12, marginBottom: 2 }}>
              <input value={p.name} onChange={e => setParam(mi, pi, 'name', e.target.value)} placeholder="param name" />
              <input value={p.typeAnnotation} onChange={e => setParam(mi, pi, 'typeAnnotation', e.target.value)} placeholder="param type" />
              <button className="ghost danger" onClick={() => removeParam(mi, pi)}>✕</button>
            </div>
          ))}
          <button className="ghost" style={{ fontSize: 11, marginTop: 2, paddingLeft: 12 }} onClick={() => addParam(mi)}>
            + param
          </button>
        </div>
      ))}

      {error && <div style={{ color: 'var(--danger)', fontSize: 11, marginTop: 8 }}>{error}</div>}
      <div className="modal-footer">
        <button onClick={onClose}>Cancel</button>
        <button className="primary" onClick={handleSave}>{editing ? 'Save' : 'Create'}</button>
      </div>
    </Modal>
  );
}
