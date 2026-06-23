import React, { useState } from 'react';

export default function AccountManager({ accounts = [], onSave, onClose }) {
  const [list, setList] = useState(accounts || []);
  const [newName, setNewName] = useState('');

  const add = () => {
    if (!newName.trim()) return;
    setList(prev => [...prev, { id: Date.now(), name: newName.trim() }]);
    setNewName('');
  };

  const remove = (id) => {
    setList(prev => prev.filter(a => a.id !== id));
  };

  const save = () => {
    onSave && onSave(list);
    onClose && onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ width: 420, maxWidth: '90%', background: 'white', borderRadius: 12, padding: 18 }}>
        <h3 style={{ margin: 0 }}>Manage Receive Accounts</h3>
        <div style={{ marginTop: 12, marginBottom: 12 }}>
          {list.length === 0 && <div style={{ color: '#6b7280' }}>No accounts yet.</div>}
          {list.map(acc => (
            <div key={acc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #e5e7eb' }}>
              <div>{acc.name}</div>
              <button onClick={() => remove(acc.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>Remove</button>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. +2547... or M-Pesa" style={{ flex: 1, padding: 8, border: '1px solid #d1d5db', borderRadius: 8 }} />
          <button onClick={add} style={{ padding: '8px 12px', borderRadius: 8, background: '#10b981', color: 'white', border: 'none' }}>Add</button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
          <button onClick={onClose} style={{ padding: '8px 12px', borderRadius: 8, background: '#f3f4f6', border: 'none' }}>Cancel</button>
          <button onClick={save} style={{ padding: '8px 12px', borderRadius: 8, background: '#2563eb', color: 'white', border: 'none' }}>Save</button>
        </div>
      </div>
    </div>
  );
}
