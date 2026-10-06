'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Lock } from 'lucide-react';
import { BY_SLUG } from '@/lib/config';
import { actionsFor, Act } from '@/lib/actions';
import { rpc } from '@/lib/odoo';
import { RecordForm } from './RecordForm';
import { Related } from './Related';
import { runAction } from './ActionBar';
import { Modal, useToast } from './ui';

type TStep = { key: string; label: string; status: 'completed' | 'current' | 'pending' | 'blocked'; detail?: string };
type Group = { id: string; label: string; keys: string[] };
const GROUPS: Group[] = [
  { id: 'lead', label: 'Lead', keys: ['lead'] },
  { id: 'demo', label: 'Demo', keys: ['demo'] },
  { id: 'estimate', label: 'Estimate', keys: ['estimate'] },
  { id: 'deal', label: 'Deal', keys: ['deal_locked', 'agreement'] },
  { id: 'payment', label: 'Payment', keys: ['advance'] },
  { id: 'project', label: 'Project', keys: ['development', 'qc', 'deployment', 'training', 'payment', 'review', 'completed'] },
];
const LEAD_ACTS = ['action_contact', 'action_collect_requirement'];
const LABEL: Record<string, string> = { action_contact: 'Mark contacted', action_collect_requirement: 'Requirement collected', action_estimate: 'Move to estimate', action_negotiate: 'Send to negotiation' };

function groupState(g: Group, steps: TStep[]) {
  const mine = steps.filter((s) => g.keys.includes(s.key));
  if (mine.length && mine.every((s) => s.status === 'completed')) return 'completed';
  if (mine.some((s) => s.status === 'blocked')) return 'blocked';
  return mine.some((s) => s.status === 'current') ? 'current' : 'pending';
}

/** Lead progress as 6 clickable steps; each opens a popup for that step. Odoo still enforces every rule. */
export function StepWizard({ rec, onDone }: { rec: any; onDone: () => void }) {
  const steps: TStep[] = rec.otm_stage_tracker || [];
  const [open, setOpen] = useState<string | null>(null);
  const states = GROUPS.map((g) => groupState(g, steps));
  // the tracker always ticks 'Lead'; the real lead step ends when the requirement is collected
  if (['new', 'contacted'].includes(rec.stage)) states[0] = 'current';
  else if (states[0] === 'current') states[0] = 'completed';
  if (states[0] === 'current') for (let i = 1; i < states.length; i++) if (states[i] === 'current') states[i] = 'pending';
  const cur = states.findIndex((s) => s !== 'completed');
  if (!steps.length) return null;
  const closed = ['won', 'lost'].includes(rec.stage);
  const done = () => { onDone(); };
  return (
    <>
      <ol className="stepbar">
        {GROUPS.map((g, i) => {
          const st = states[i];
          const locked = st === 'pending' && i !== cur;
          return (
            <li key={g.id} className={`${st} ${i === cur ? 'now' : ''}`}>
              <button disabled={locked} onClick={() => setOpen(g.id)} title={locked ? 'Finish the earlier steps first' : `Open ${g.label}`}>
                <span className="dot">{st === 'completed' ? <Check size={14} /> : locked ? <Lock size={12} /> : i + 1}</span>
                <b>{g.label}</b>
                <small>{steps.find((s) => g.keys.includes(s.key) && s.status !== 'completed')?.detail || steps.find((s) => g.keys.includes(s.key))?.detail || ''}</small>
              </button>
            </li>
          );
        })}
      </ol>
      {closed && <p className="muted">This lead is {rec.stage}. Use Reopen in the toolbar if it needs to continue.</p>}
      {open && <StepPopup id={open} rec={rec} onClose={() => setOpen(null)} onDone={done} goto={(id) => setOpen(id)} />}
    </>
  );
}

function StepPopup({ id, rec, onClose, onDone, goto }: { id: string; rec: any; onClose: () => void; onDone: () => void; goto: (id: string) => void }) {
  const router = useRouter();
  const { push } = useToast();
  const [busy, setBusy] = useState(false);
  const title = GROUPS.find((g) => g.id === id)!.label;
  const acts = actionsFor('otm.lead', rec);
  const find = (m: string) => acts.find((a) => a.method === m);
  const tabOf = (model: string) => BY_SLUG.leads.tabs!.find((t) => t.model === model)!;

  async function run(a: Act, next?: string) {
    setBusy(true);
    try { await runAction('otm.lead', rec.id, a, undefined, router, push); onDone(); if (next) goto(next); }
    catch (e: any) { push(e.message, 'err'); } finally { setBusy(false); }
  }

  // what is still missing for this step, in plain words
  const missing: string[] = [];
  if (id === 'lead') {
    if (!rec.customer_id) missing.push('Customer is not linked (optional, but needed for the estimate).');
    if (!rec.service_count) missing.push('Add at least one service.');
  }
  const leadAct = LEAD_ACTS.map(find).find(Boolean);
  const hardMissing = missing.filter((m) => !m.startsWith('Customer'));

  return (
    <Modal title={`Step: ${title}`} onClose={onClose}>
      <div className="wizard">
        {id === 'lead' && (
          <>
            <p className="hint">Capture who the customer is, what they need and which services. Then mark the lead as contacted and requirement collected.</p>
            {missing.length > 0 && <ul className="todo">{missing.map((m) => <li key={m}>{m}</li>)}</ul>}
            <RecordForm model="otm.lead" mode="edit" record={rec} onSaved={onDone}
              sections={[{ title: 'Customer & requirement', fields: ['customer_id', 'contact_number', 'requirement_description', 'followup_date'] }]} />
            <h4>Services</h4>
            <Related tab={tabOf('otm.lead.service.line')} parentId={rec.id} parent={rec} onChange={onDone} />
            <div className="savebar">
              {leadAct && <button className="btn primary" disabled={busy || (leadAct.method === 'action_collect_requirement' && hardMissing.length > 0)} onClick={() => run(leadAct, leadAct.method === 'action_collect_requirement' ? 'demo' : undefined)}>{LABEL[leadAct.method]} →</button>}
              {!leadAct && <button className="btn primary" onClick={() => goto('demo')}>Next: Demo →</button>}
            </div>
          </>
        )}
        {id === 'demo' && <DemoStep rec={rec} onDone={onDone} run={run} find={find} tabOf={tabOf} busy={busy} />}
        {['estimate', 'deal', 'payment', 'project'].includes(id) && (
          <>
            <p className="hint">{({ estimate: 'Prepare the estimate for the customer.', deal: 'Lock the deal and get the agreement signed.', payment: 'Receive the advance payment.', project: 'Project delivery: development, QC, deployment, training, final payment and review.' } as Record<string, string>)[id]}</p>
            {id === 'estimate' && <Related tab={tabOf('otm.estimate')} parentId={rec.id} parent={rec} onChange={onDone} />}
            {id === 'deal' && <Related tab={tabOf('otm.deal')} parentId={rec.id} parent={rec} onChange={onDone} />}
            <div className="savebar">
              {id === 'estimate' && (['action_create_estimate'].map((m) => ({ m })).length > 0) && <CreateEstimate rec={rec} onDone={onDone} />}
              {find('action_negotiate') && id === 'estimate' && <button className="btn" disabled={busy} onClick={() => run(find('action_negotiate')!)}>{LABEL.action_negotiate}</button>}
              <span className="muted">Full guided popups for this step come next; use the record page for now.</span>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

function CreateEstimate({ rec, onDone }: { rec: any; onDone: () => void }) {
  const router = useRouter();
  const { push } = useToast();
  if (!['estimate', 'negotiation'].includes(rec.stage) || rec.estimate_count) return null;
  return <button className="btn primary" onClick={async () => { try { const r: any = await rpc('otm.lead', 'action_create_estimate', [[rec.id]]); push('Estimate created'); onDone(); if (r?.res_id) router.push(`/estimates/${r.res_id}`); } catch (e: any) { push(e.message, 'err'); } }}>Create estimate</button>;
}

function DemoStep({ rec, onDone, run, find, tabOf, busy }: { rec: any; onDone: () => void; run: (a: Act, next?: string) => void; find: (m: string) => Act | undefined; tabOf: (m: string) => any; busy: boolean }) {
  const { push } = useToast();
  const [demos, setDemos] = useState<any[] | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => { rpc<any[]>('otm.demo', 'search_read', [[['lead_id', '=', rec.id]]], { fields: ['status'] }).then(setDemos).catch(() => setDemos([])); }, [rec.id, rec.stage, tick]);
  if (!demos) return <div className="spinner">Loading…</div>;
  const completed = demos.some((d) => d.status === 'completed');
  const active = demos.some((d) => ['scheduled', 'confirmed'].includes(d.status));
  const toEstimate = find('action_estimate');
  const canSchedule = ['requirement', 'demo'].includes(rec.stage);
  return (
    <>
      <p className="hint">Schedule the demo, confirm it with the customer, then complete it with notes. After a completed demo you can move to the estimate.</p>
      {!canSchedule && !demos.length && <p className="todo">Finish the Lead step first (requirement collected).</p>}
      {canSchedule && !active && !completed && (
        <RecordForm model="otm.demo" mode="create" defaults={{ lead_id: rec.id }}
          sections={[{ title: 'Schedule demo', fields: ['demo_date', 'start_time', 'end_time', 'demo_person_id', 'notes'] }]}
          beforeCreate={async () => { const a = find('action_demo'); if (a && rec.stage === 'requirement') await rpc('otm.lead', 'action_demo', [[rec.id]]); }}
          onSaved={() => { push('Demo scheduled'); onDone(); setTick((t) => t + 1); }} />
      )}
      {demos.length > 0 && <Related key={tick} tab={tabOf('otm.demo')} parentId={rec.id} parent={rec} onChange={() => { onDone(); setTick((t) => t + 1); }} />}
      {active && <p className="hint">To complete a demo, record the demo notes first (open the demo, add notes, then Complete).</p>}
      <div className="savebar">
        {toEstimate && completed && <button className="btn primary" disabled={busy} onClick={() => run(toEstimate, 'estimate')}>{LABEL.action_estimate} →</button>}
        {!completed && !toEstimate && demos.length > 0 && <span className="muted">Waiting for a completed demo.</span>}
      </div>
    </>
  );
}
