'use client';
import { useCallback, useEffect, useState } from 'react';
import { Pin, PinOff, Trash2, Plus, Search, BellRing } from 'lucide-react';
import { rpc, searchRead } from '@/lib/odoo';
import { Spinner, useToast } from '@/components/ui';

type Note = { id: number; name: string; content: string | false; color: string; pinned: boolean; reminder_date: string | false; write_date: string };
const COLORS: Record<string, string> = { yellow: '#fef3c7', blue: '#dbeafe', green: '#dcfce7', pink: '#fce7f3', purple: '#ede9fe', grey: '#e5e7eb' };
const FIELDS = ['name', 'content', 'color', 'pinned', 'reminder_date', 'write_date'];

export default function Notes() {
  const { push } = useToast();
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [q, setQ] = useState('');
  const [draft, setDraft] = useState({ name: '', content: '', color: 'yellow', reminder_date: '' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setNotes(await searchRead('otm.note', [], FIELDS, { order: 'pinned desc, write_date desc, id desc', limit: 500 })); }
    catch (e: any) { push(e.message, 'err'); setNotes([]); }
  }, [push]);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!draft.name.trim() && !draft.content.trim()) return;
    setBusy(true);
    try {
      await rpc('otm.note', 'create', [{ name: draft.name.trim() || draft.content.trim().slice(0, 40), content: draft.content, color: draft.color, reminder_date: draft.reminder_date || false }]);
      setDraft({ name: '', content: '', color: draft.color, reminder_date: '' });
      await load();
    } catch (e: any) { push(e.message, 'err'); } finally { setBusy(false); }
  };
  const save = async (id: number, vals: Record<string, any>, reload = false) => {
    setNotes((l) => l && l.map((n) => (n.id === id ? { ...n, ...vals } : n)));
    try { await rpc('otm.note', 'write', [[id], vals]); if (reload) await load(); } catch (e: any) { push(e.message, 'err'); load(); }
  };
  const del = async (id: number) => {
    if (!confirm('Delete this note?')) return;
    try { await rpc('otm.note', 'unlink', [[id]]); setNotes((l) => l && l.filter((n) => n.id !== id)); } catch (e: any) { push(e.message, 'err'); }
  };

  if (!notes) return <Spinner />;
  const term = q.trim().toLowerCase();
  const shown = notes.filter((n) => !term || `${n.name} ${n.content || ''}`.toLowerCase().includes(term));
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <div className="page-head"><h1>My Notes</h1><span className="muted">Private – only you can see these notes</span></div>
      <div className="card notes-new" style={{ background: COLORS[draft.color], marginBottom: '1rem' }}>
        <input placeholder="Title" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="note-title" />
        <textarea placeholder="Write your note…" rows={3} value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} className="note-body" />
        <div className="note-tools">
          {Object.keys(COLORS).map((c) => (
            <button key={c} type="button" aria-label={c} className={`dot ${draft.color === c ? 'on' : ''}`} style={{ background: COLORS[c] }} onClick={() => setDraft({ ...draft, color: c })} />
          ))}
          <label className="muted" style={{ marginLeft: 'auto' }}>Remind me <input type="date" value={draft.reminder_date} onChange={(e) => setDraft({ ...draft, reminder_date: e.target.value })} /></label>
          <button className="btn primary" disabled={busy} onClick={add}><Plus size={16} />Add note</button>
        </div>
      </div>
      <div className="search-row" style={{ marginBottom: '.8rem' }}>
        <Search size={16} /><input placeholder="Search my notes" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {!shown.length && <p className="muted">{notes.length ? 'No notes match your search.' : 'No notes yet. Write your first note above.'}</p>}
      <div className="notes-grid">
        {shown.map((n) => (
          <div key={n.id} className="note-card" style={{ background: COLORS[n.color] || COLORS.yellow }}>
            <div className="note-top">
              <input className="note-title" defaultValue={n.name} onBlur={(e) => e.target.value !== n.name && e.target.value.trim() && save(n.id, { name: e.target.value.trim() })} />
              <button className="icon-btn" title={n.pinned ? 'Unpin' : 'Pin'} onClick={() => save(n.id, { pinned: !n.pinned }, true)}>{n.pinned ? <PinOff size={16} /> : <Pin size={16} />}</button>
              <button className="icon-btn" title="Delete" onClick={() => del(n.id)}><Trash2 size={16} /></button>
            </div>
            <textarea className="note-body" rows={5} defaultValue={n.content || ''} onBlur={(e) => e.target.value !== (n.content || '') && save(n.id, { content: e.target.value })} />
            <div className="note-tools">
              {Object.keys(COLORS).map((c) => (
                <button key={c} type="button" aria-label={c} className={`dot ${n.color === c ? 'on' : ''}`} style={{ background: COLORS[c] }} onClick={() => save(n.id, { color: c })} />
              ))}
              <input type="date" value={n.reminder_date || ''} onChange={(e) => save(n.id, { reminder_date: e.target.value || false })} title="Reminder date" style={{ marginLeft: 'auto' }} />
              {n.reminder_date && n.reminder_date <= today && <BellRing size={16} color="#dc2626" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
