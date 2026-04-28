import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Save, X, Search, Download, Sparkles } from 'lucide-react';
import { IS_DEMO_MODE, adminCrudConfig, adminMockData, createAdminRecord, deleteAdminRecord, fetchAdminCollection, formatPeso, updateAdminRecord, updateAdminSubresource } from '../services/api.js';

function displayValue(value) {
  if (typeof value === 'number' && value > 999) return formatPeso(value);
  return value ?? '—';
}

function emptyRecord(fields) {
  return fields.reduce((acc, field) => ({ ...acc, [field]: '' }), { id: `NEW-${Date.now()}` });
}

export default function AdminCrud({ route }) {
  const config = adminCrudConfig[route];
  const [records, setRecords] = useState(() => adminMockData[config.key] || []);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState(null);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(!IS_DEMO_MODE);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setEditing(null);
    setDraft(null);
    setError('');
    if (IS_DEMO_MODE) {
      setRecords(adminMockData[config.key] || []);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    fetchAdminCollection(config.endpoint)
      .then((data) => {
        if (!active) return;
        setRecords(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || 'Failed to load records.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [config.endpoint, config.key]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return records;
    return records.filter((record) => JSON.stringify(record).toLowerCase().includes(q));
  }, [records, query]);

  const startCreate = () => {
    const record = emptyRecord(config.fields);
    setEditing(record.id);
    setDraft(record);
  };
  const startEdit = (record) => {
    setEditing(record.id);
    setDraft({ ...record });
  };
  const cancel = () => {
    setEditing(null);
    setDraft(null);
  };
  const save = async () => {
    try {
      if (IS_DEMO_MODE) {
        setRecords((current) => {
          const exists = current.some((item) => item.id === draft.id);
          return exists ? current.map((item) => item.id === draft.id ? draft : item) : [draft, ...current];
        });
        setToast('Saved in development demo mode.');
      } else {
        const exists = records.some((item) => item.id === draft.id);
        let saved;
        if (exists) {
          if (config.updateMode === 'status') saved = await updateAdminSubresource(config.endpoint, draft.id, 'status', { status: draft.status });
          else if (config.updateMethod === 'PUT') saved = await updateAdminRecord(config.endpoint, draft.key, { value: draft.value, group: draft.group }, 'PUT');
          else saved = await updateAdminRecord(config.endpoint, draft.id, draft, config.updateMethod || 'PATCH');
        } else {
          saved = await createAdminRecord(config.endpoint, draft);
        }
        setRecords((current) => {
          const nextRecord = saved?.id || saved?.key ? { ...draft, ...saved } : draft;
          const hasExisting = current.some((item) => item.id === draft.id || (item.key && item.key === draft.key));
          return hasExisting ? current.map((item) => (item.id === draft.id || (item.key && item.key === draft.key)) ? nextRecord : item) : [nextRecord, ...current];
        });
        setToast('Saved to backend.');
      }
      cancel();
      setTimeout(() => setToast(''), 2500);
    } catch (err) {
      setToast(err.message || 'Unable to save changes.');
      setTimeout(() => setToast(''), 3000);
    }
  };
  const remove = async (id) => {
    try {
      if (!IS_DEMO_MODE) await deleteAdminRecord(config.endpoint, id);
      setRecords((current) => current.filter((item) => item.id !== id));
      setToast(IS_DEMO_MODE ? 'Deleted in development demo mode.' : 'Deleted from backend.');
      setTimeout(() => setToast(''), 2500);
    } catch (err) {
      setToast(err.message || 'Unable to delete record.');
      setTimeout(() => setToast(''), 3000);
    }
  };

  return (
    <div className="crud-page admin-enter">
      <div className="crud-hero glass">
        <div>
          <span className="eyebrow"><Sparkles size={15} /> Admin CRUD</span>
          <h2>{config.title}</h2>
          <p>Create, read, update, and delete UI with production API route mapping: <code>{config.endpoint}</code></p>
        </div>
        <div className="crud-actions">
          <button className="pill outline"><Download size={16}/> Export</button>
          {!config.readOnly && !config.createDisabled && <button className="pill dark" onClick={startCreate}><Plus size={16}/> Add New</button>}
        </div>
      </div>

      <div className="crud-toolbar">
        <div className="crud-search"><Search size={17}/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search records..." /></div>
        <span>{filtered.length} records</span>
      </div>

      {toast && <div className="crud-toast">{toast}</div>}
      {error && <div className="crud-toast">{error}</div>}

      <div className="crud-table-card table-card">
        <div className="table-wrap">
          <table>
            <thead><tr>{config.fields.map((field)=><th key={field}>{field}</th>)}<th>Actions</th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan={config.fields.length + 1}>Loading records…</td></tr>}
              {!loading && !filtered.length && <tr><td colSpan={config.fields.length + 1}>No records found.</td></tr>}
              {filtered.map((record) => (
                <tr key={record.id} className={editing === record.id ? 'editing-row' : ''}>
                  {config.fields.map((field) => (
                    <td key={field}>
                      {editing === record.id ? (
                        <input className="inline-input" value={draft?.[field] ?? ''} onChange={(e)=>setDraft({ ...draft, [field]: e.target.value })} />
                      ) : displayValue(record[field])}
                    </td>
                  ))}
                  <td>
                    {editing === record.id ? (
                      <div className="row-actions"><button onClick={save} className="mini-action save"><Save size={15}/></button><button onClick={cancel} className="mini-action"><X size={15}/></button></div>
                    ) : (
                      <div className="row-actions"><button onClick={()=>startEdit(record)} className="mini-action"><Pencil size={15}/></button>{!config.readOnly && !config.deleteDisabled && <button onClick={()=>remove(record.id)} className="mini-action danger"><Trash2 size={15}/></button>}</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
