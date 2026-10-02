'use client';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';

export default function Login() {
  const router = useRouter();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (new URLSearchParams(location.search).get('idle')) setErr('You were signed out after a period of inactivity. Please sign in again.'); }, []);

  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setErr('');
    const r = await fetch('/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ login, password }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setErr(j.error || 'Login failed');
    router.replace('/');
  }
  return (
    <main className="login">
      <section className="login-hero">
        <div className="brand-lg"><Logo height={50} badge name={process.env.NEXT_PUBLIC_APP_NAME || 'otomater'} /></div>
        <h2>From first lead to final delivery — in one place.</h2>
        <ul>
          <li>Leads, demos, estimates and deals</li>
          <li>Agreements, payments and commissions</li>
          <li>Projects, QC, deployment and training</li>
          <li>Renewals, servers and integrations</li>
        </ul>
        <small>© Otomater · Sales &amp; Project Lifecycle</small>
      </section>
      <section className="login-panel">
        <form onSubmit={submit} className="login-card">
          <div className="login-logo-mobile"><Logo height={44} /></div>
          <h1>Welcome back</h1>
          <p className="muted">Sign in with your Odoo account</p>
          <label className="field"><span>Login</span><input autoFocus autoComplete="username" value={login} onChange={(e) => setLogin(e.target.value)} /></label>
          <label className="field"><span>Password</span><input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          {err && <div className="alert">{err}</div>}
          <button className="btn primary full" disabled={busy || !login || !password}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
      </section>
    </main>
  );
}
