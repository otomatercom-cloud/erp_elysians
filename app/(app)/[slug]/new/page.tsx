'use client';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { BY_SLUG } from '@/lib/config';
import { useEffect, useState } from 'react';
import { RecordForm } from '@/components/RecordForm';
import { searchRead } from '@/lib/odoo';
import { Plus, Trash2 } from 'lucide-react';

type Line = { service_id: number; quantity: number; requirement_description: string };
type Svc = { id: number; name: string; base_amount: number };

/** Services the customer needs, captured in the very first lead step. */
function ServiceLines({ lines, setLines }: { lines: Line[]; setLines: (l: Line[]) => void }) {
  const [svcs, setSvcs] = useState<Svc[]>([]);
  useEffect(() => { searchRead('otm.service', [], ['name', 'base_amount'], { order: 'name', limit: 200 }).then(setSvcs).catch(() => setSvcs([])); }, []);
  const upd = (i: number, v: Partial<Line>) => setLines(lines.map((l, k) => (k === i ? { ...l, ...v } : l)));
  const total = lines.reduce((t, l) => t + (svcs.find((x) => x.id === l.service_id)?.base_amount || 0), 0);
  return (
    <fieldset className="section">
      <legend>Services required *</legend>
      {lines.map((l, i) => (
        <div key={i} className="svc-row">
          <select value={l.service_id || ''} onChange={(e) => upd(i, { service_id: Number(e.target.value) })}>
            <option value="">Select service…</option>
            {svcs.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
          <input placeholder="Customization needed for this service (optional)" value={l.requirement_description} onChange={(e) => upd(i, { requirement_description: e.target.value })} />
          <button type="button" className="icon-btn" title="Remove" onClick={() => setLines(lines.filter((_, k) => k !== i))}><Trash2 size={16} /></button>
        </div>
      ))}
      <button type="button" className="btn ghost sm" onClick={() => setLines([...lines, { service_id: 0, quantity: 1, requirement_description: '' }])}><Plus size={14} />Add service</button>
      {total > 0 && <span className="muted" style={{ marginLeft: '1rem' }}>Base total: ₹{total.toLocaleString('en-IN')}</span>}
    </fieldset>
  );
}

export default function NewPage() {
  const { slug } = useParams<{ slug: string }>();
  const cfg = BY_SLUG[slug];
  const router = useRouter();
  const sp = useSearchParams();
  const [lines, setLines] = useState<Line[]>([{ service_id: 0, quantity: 1, requirement_description: '' }]);
  const isLead = cfg?.slug === 'leads';
  if (!cfg?.create) return <p>This record is created by the workflow, not by hand.</p>;
  const defaults: Record<string, any> = {};
  sp.forEach((v, k) => { if (/^\d+$/.test(v)) defaults[k] = Number(v); });
  return (
    <div>
      <div className="page-head"><h1>New {cfg.singular.toLowerCase()}</h1></div>
      <RecordForm model={cfg.model} mode="create" sections={[{ title: 'Details', fields: cfg.create }]} defaults={defaults}
        fillIfEmpty={isLead ? { requirement_description: 'No customization required' } : undefined}
        extraPayload={isLead ? { service_line_ids: lines.filter((l) => l.service_id).map((l) => [0, 0, { service_id: l.service_id, quantity: 1, requirement_description: l.requirement_description || false }]) } : undefined}
        beforeSave={isLead ? () => (!lines.some((l) => l.service_id) ? 'Please add at least one service.' : null) : undefined}
        belowFields={isLead ? <ServiceLines lines={lines} setLines={setLines} /> : undefined}
        onSaved={(id) => router.replace(`/${cfg.slug}/${id}`)} />
    </div>
  );
}
