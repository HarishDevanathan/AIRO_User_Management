'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, apiGet, apiPatch } from '@/lib/api';
import { Navbar } from '@/app/home/page';

interface DsaStats {
  platform: string;
  username: string;
  easy_solved: number;
  medium_solved: number;
  hard_solved: number;
  total_solved: number;
  rating?: number;
  rank?: string;
  streak?: number;
  contests_attended?: number;
  badges?: string[];
}

const PLATFORMS = [
  { key: 'leetcode',      label: 'LeetCode',     color: '#f89f1b', bg: '#fff8ee', icon: '⚡' },
  { key: 'codechef',      label: 'CodeChef',      color: '#5b4638', bg: '#f5ede8', icon: '👨‍🍳' },
  { key: 'codeforces',    label: 'Codeforces',    color: '#1a8cff', bg: '#e8f4ff', icon: '🔵' },
  { key: 'hackerrank',    label: 'HackerRank',    color: '#2ec866', bg: '#eafaf1', icon: '🟢' },
  { key: 'geeksforgeeks', label: 'GeeksforGeeks', color: '#2f8d46', bg: '#edf7ee', icon: '🧠' },
];

const EMPTY: DsaStats = { platform: '', username: '', easy_solved: 0, medium_solved: 0, hard_solved: 0, total_solved: 0 };

function serverToForm(d: Record<string, unknown>): DsaStats {
  return {
    platform:          String(d.platform          ?? ''),
    username:          String(d.username          ?? ''),
    easy_solved:       Number(d.easy_solved)       || 0,
    medium_solved:     Number(d.medium_solved)     || 0,
    hard_solved:       Number(d.hard_solved)       || 0,
    total_solved:      Number(d.total_solved)      || 0,
    rating:            d.rating            !== undefined ? Number(d.rating)            : undefined,
    rank:              d.rank              !== undefined ? String(d.rank)              : undefined,
    streak:            d.streak            !== undefined ? Number(d.streak)            : undefined,
    contests_attended: d.contests_attended !== undefined ? Number(d.contests_attended) : undefined,
    badges:            Array.isArray(d.badges) ? d.badges.map(String) : [],
  };
}

function formToServer(e: DsaStats) {
  return {
    platform:          e.platform          || null,
    username:          e.username          || null,
    easy_solved:       e.easy_solved       || 0,
    medium_solved:     e.medium_solved     || 0,
    hard_solved:       e.hard_solved       || 0,
    total_solved:      (e.easy_solved || 0) + (e.medium_solved || 0) + (e.hard_solved || 0),
    rating:            e.rating            ?? null,
    rank:              e.rank              ?? null,
    streak:            e.streak            ?? null,
    contests_attended: e.contests_attended ?? null,
    badges:            e.badges?.length    ? e.badges : [],
  };
}

function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 999, background: type === 'success' ? '#22c55e' : '#ef4444', color: 'white', borderRadius: 10, padding: '12px 20px', fontFamily: 'Montserrat,sans-serif', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 8px 24px rgba(0,0,0,.15)' }}>
      {type === 'success' ? '✓' : '✕'} {msg}
    </div>
  );
}

function DonutChart({ easy, medium, hard, total }: { easy: number; medium: number; hard: number; total: number }) {
  const SIZE = 140, SW = 18, r = (SIZE - SW) / 2;
  const circ = 2 * Math.PI * r;
  const cx = SIZE / 2, cy = SIZE / 2;
  const safe = total || 1;
  let offset = 0;
  const segs = [
    { val: easy,   color: '#22c55e' },
    { val: medium, color: '#f97316' },
    { val: hard,   color: '#ef4444' },
  ].map(s => {
    const dash = circ * (s.val / safe);
    const arc = { dash, offset: -offset, color: s.color, val: s.val };
    offset += dash;
    return arc;
  });

  return (
    <div style={{ position: 'relative', width: SIZE, height: SIZE, flexShrink: 0 }}>
      <svg width={SIZE} height={SIZE} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={SW} />
        {segs.map((a, i) => a.val > 0 && (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={a.color} strokeWidth={SW}
            strokeDasharray={`${a.dash} ${circ - a.dash}`} strokeDashoffset={a.offset} strokeLinecap="round" />
        ))}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 800, fontSize: 26, color: '#1a1a2e', lineHeight: 1 }}>{total}</span>
        <span style={{ fontFamily: 'Montserrat,sans-serif', fontSize: 10, color: '#9ca3af', marginTop: 2 }}>Solved</span>
      </div>
    </div>
  );
}

function HBar({ value, max, color, label, count }: { value: number; max: number; color: string; label: string; count: number }) {
  const pct = max ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <span style={{ width: 54, fontFamily: 'Montserrat,sans-serif', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>{label}</span>
      <div style={{ flex: 1, height: 8, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 99, transition: 'width .6s ease' }} />
      </div>
      <span style={{ width: 30, fontFamily: 'Montserrat,sans-serif', fontSize: 12, fontWeight: 700, color: '#1a1a2e', textAlign: 'right' }}>{count}</span>
    </div>
  );
}

function StatPill({ icon, label, value }: { icon: string; label: string; value: string | number | undefined }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div style={{ background: '#f8fafc', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 100px' }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <div>
        <p style={{ fontFamily: 'Montserrat,sans-serif', fontSize: 10, color: '#9ca3af', margin: 0, fontWeight: 600, textTransform: 'uppercase' }}>{label}</p>
        <p style={{ fontFamily: 'Montserrat,sans-serif', fontSize: 14, fontWeight: 700, color: '#1a1a2e', margin: 0 }}>{value}</p>
      </div>
    </div>
  );
}

function PlatformCard({ stats, platformInfo, onEdit, onDelete, loading }: {
  stats: DsaStats; platformInfo: typeof PLATFORMS[0]; onEdit: () => void; onDelete: () => void; loading: boolean;
}) {
  const total = stats.total_solved || (stats.easy_solved + stats.medium_solved + stats.hard_solved);
  return (
    <div style={{ background: 'white', borderRadius: 16, border: '1.5px solid #e5e7eb', padding: '22px 24px', marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: platformInfo.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, border: `1.5px solid ${platformInfo.color}33` }}>
            {platformInfo.icon}
          </div>
          <div>
            <h3 style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 800, fontSize: 16, color: '#1a1a2e', margin: 0 }}>{platformInfo.label}</h3>
            <p style={{ fontFamily: 'Montserrat,sans-serif', fontSize: 12, color: platformInfo.color, fontWeight: 700, margin: 0 }}>@{stats.username}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onEdit} style={{ background: 'none', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '6px 14px', fontSize: 12, color: '#6b7280', cursor: 'pointer', fontFamily: 'Montserrat,sans-serif', fontWeight: 600 }}>✏️ Edit</button>
          <button onClick={onDelete} disabled={loading} style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '6px 14px', fontSize: 12, color: '#ef4444', cursor: 'pointer', fontFamily: 'Montserrat,sans-serif', fontWeight: 600 }}>🗑</button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
        <DonutChart easy={stats.easy_solved} medium={stats.medium_solved} hard={stats.hard_solved} total={total} />
        <div style={{ flex: 1, minWidth: 180 }}>
          <HBar value={stats.easy_solved}   max={total} color="#22c55e" label="Easy"   count={stats.easy_solved} />
          <HBar value={stats.medium_solved} max={total} color="#f97316" label="Medium" count={stats.medium_solved} />
          <HBar value={stats.hard_solved}   max={total} color="#ef4444" label="Hard"   count={stats.hard_solved} />
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <StatPill icon="⭐" label="Rating"   value={stats.rating} />
            <StatPill icon="🎖️" label="Rank"     value={stats.rank} />
            <StatPill icon="🔥" label="Streak"   value={stats.streak ? `${stats.streak}d` : undefined} />
            <StatPill icon="🏟️" label="Contests" value={stats.contests_attended} />
          </div>
        </div>
      </div>
      {stats.badges && stats.badges.length > 0 && (
        <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {stats.badges.map((b, i) => (
            <span key={i} style={{ background: '#fef9ec', border: '1px solid #fde68a', color: '#92400e', borderRadius: 20, padding: '3px 10px', fontSize: 11.5, fontFamily: 'Montserrat,sans-serif', fontWeight: 600 }}>🏅 {b}</span>
          ))}
        </div>
      )}
    </div>
  );
}

const inp: React.CSSProperties = { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontFamily: 'Montserrat,sans-serif', fontSize: 14, outline: 'none', background: 'white', color: '#1a1a2e', boxSizing: 'border-box' };
const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 5, fontFamily: 'Montserrat,sans-serif', textTransform: 'uppercase', letterSpacing: '0.5px' };

export default function DsaPage() {
  const router = useRouter();
  const [allStats, setAllStats] = useState<DsaStats[]>([]);
  const [form,     setForm]     = useState<DsaStats>({ ...EMPTY });
  const [editIdx,  setEditIdx]  = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [errors,   setErrors]   = useState<Partial<Record<keyof DsaStats, string>>>({});
  const [loading,  setLoading]  = useState(false);
  const [fetching, setFetching] = useState(true);
  const [toast,    setToast]    = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const auth = getAuth();
    if (!auth) { router.replace('/login'); return; }
    apiGet(`/form/get-profile/${encodeURIComponent(auth.email ?? '')}`)
      .then(d => {
        const profiles = d.dsa_profiles ?? (d.dsa_stats ? [d.dsa_stats] : []);
        if (profiles.length) setAllStats(profiles.map(serverToForm));
      })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [router]);

  function change(field: keyof DsaStats, val: unknown) {
    setForm(prev => ({ ...prev, [field]: val }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  }

  function validate() {
    const e: Partial<Record<keyof DsaStats, string>> = {};
    if (!form.platform)        e.platform = 'Select a platform';
    if (!form.username.trim()) e.username  = 'Required';
    setErrors(e);
    return !Object.keys(e).length;
  }

  function startAdd()        { setForm({ ...EMPTY }); setEditIdx(null); setErrors({}); setShowForm(true); }
  function startEdit(i: number) { setForm({ ...allStats[i] }); setEditIdx(i); setErrors({}); setShowForm(true); }

  async function handleDelete(idx: number) {
    setLoading(true);
    try {
      const updated = allStats.filter((_, i) => i !== idx).map(formToServer);
      await apiPatch('/form/update-profile', { dsa_profiles: updated });
      setAllStats(prev => prev.filter((_, i) => i !== idx));
      setToast({ msg: 'Profile deleted!', type: 'success' });
    } catch { setToast({ msg: 'Failed to delete', type: 'error' }); }
    finally { setLoading(false); }
  }

  async function handleSave(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const merged = editIdx !== null
        ? allStats.map((s, i) => i === editIdx ? form : s)
        : [...allStats, form];
      await apiPatch('/form/update-profile', { dsa_profiles: merged.map(formToServer) });
      setAllStats(merged);
      setToast({ msg: editIdx !== null ? 'Profile updated!' : 'Profile added!', type: 'success' });
      setShowForm(false);
    } catch (err: unknown) {
      setToast({ msg: err instanceof Error ? err.message : 'Failed to save', type: 'error' });
    } finally { setLoading(false); }
  }

  const totalSolved = allStats.reduce((s, p) => s + (p.total_solved || p.easy_solved + p.medium_solved + p.hard_solved), 0);

  if (fetching) return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <Navbar active="DSA" />
      <div style={{ textAlign: 'center', paddingTop: 100 }}>
        <div style={{ width: 36, height: 36, border: '4px solid #e5e7eb', borderTopColor: '#1a1a2e', borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto 16px' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{ fontFamily: 'Montserrat,sans-serif', color: '#9ca3af', fontSize: 14 }}>Loading your DSA profiles…</p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <Navbar active="DSA" />
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeUp { from { opacity:0;transform:translateY(16px) } to { opacity:1;transform:none } }
        .fade-up { animation: fadeUp .35s ease forwards; }
      `}</style>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px 80px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 800, fontSize: 28, color: '#1a1a2e', margin: 0 }}>⚔️ DSA Tracker</h1>
            <p style={{ color: '#9ca3af', fontSize: 13.5, fontFamily: 'Montserrat,sans-serif', marginTop: 4 }}>Track your competitive programming journey across platforms</p>
          </div>
          {!showForm && (
            <button onClick={startAdd} style={{ background: '#1a1a2e', color: 'white', border: 'none', borderRadius: 10, padding: '11px 22px', fontFamily: 'Montserrat,sans-serif', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}>
              + Add Platform
            </button>
          )}
        </div>

        {/* Summary cards */}
        {allStats.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 12, marginBottom: 28 }} className="fade-up">
            {[
              { label: 'Total Solved', value: totalSolved,                                        color: '#1a1a2e', icon: '🎯' },
              { label: 'Easy',         value: allStats.reduce((s,p) => s+p.easy_solved,   0),     color: '#22c55e', icon: '🟢' },
              { label: 'Medium',       value: allStats.reduce((s,p) => s+p.medium_solved, 0),     color: '#f97316', icon: '🟠' },
              { label: 'Hard',         value: allStats.reduce((s,p) => s+p.hard_solved,   0),     color: '#ef4444', icon: '🔴' },
              { label: 'Platforms',    value: allStats.length,                                     color: '#6c47ff', icon: '🏆' },
            ].map(s => (
              <div key={s.label} style={{ background: 'white', borderRadius: 14, border: '1.5px solid #e5e7eb', padding: '16px 18px', boxShadow: '0 1px 4px rgba(0,0,0,.05)' }}>
                <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
                <div style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 800, fontSize: 26, color: s.color }}>{s.value}</div>
                <div style={{ fontFamily: 'Montserrat,sans-serif', fontSize: 11, color: '#9ca3af', marginTop: 2, fontWeight: 600 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {allStats.length === 0 && !showForm && (
          <div style={{ textAlign: 'center', paddingTop: 60, paddingBottom: 40 }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>⚔️</div>
            <h2 style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 800, fontSize: 20, color: '#1a1a2e', marginBottom: 8 }}>No platforms added yet</h2>
            <p style={{ fontFamily: 'Montserrat,sans-serif', color: '#9ca3af', fontSize: 14, marginBottom: 24 }}>Track your LeetCode, CodeChef and other profiles here</p>
            <button onClick={startAdd} style={{ background: '#1a1a2e', color: 'white', border: 'none', borderRadius: 10, padding: '12px 28px', fontFamily: 'Montserrat,sans-serif', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              + Add Your First Platform
            </button>
          </div>
        )}

        {/* Platform cards */}
        {allStats.map((s, i) => {
          const pInfo = PLATFORMS.find(p => p.key === s.platform) ?? { key: s.platform, label: s.platform, color: '#6c47ff', bg: '#f3f0ff', icon: '🔷' };
          return <div key={i} className="fade-up"><PlatformCard stats={s} platformInfo={pInfo} onEdit={() => startEdit(i)} onDelete={() => handleDelete(i)} loading={loading} /></div>;
        })}

        {/* Add/Edit Form */}
        {showForm && (
          <div className="fade-up" style={{ background: 'white', borderRadius: 20, border: '1.5px solid #e5e7eb', padding: '28px 32px', boxShadow: '0 4px 20px rgba(0,0,0,.07)', marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 800, fontSize: 18, color: '#1a1a2e', margin: 0 }}>
                {editIdx !== null ? '✏️ Edit Platform' : '➕ Add Platform'}
              </h2>
              <button type="button" onClick={() => setShowForm(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '6px 14px', color: '#6b7280', cursor: 'pointer', fontFamily: 'Montserrat,sans-serif', fontWeight: 600, fontSize: 13 }}>✕ Cancel</button>
            </div>

            <form onSubmit={handleSave}>
              {/* Platform selector */}
              <div style={{ marginBottom: 20 }}>
                <label style={lbl}>Platform *</label>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {PLATFORMS.map(p => (
                    <button key={p.key} type="button" onClick={() => change('platform', p.key)}
                      style={{ padding: '8px 16px', borderRadius: 10, border: `2px solid ${form.platform === p.key ? p.color : '#e5e7eb'}`, background: form.platform === p.key ? p.bg : 'white', cursor: 'pointer', fontFamily: 'Montserrat,sans-serif', fontWeight: 700, fontSize: 13, color: form.platform === p.key ? p.color : '#6b7280', display: 'flex', alignItems: 'center', gap: 6, transition: 'all .15s' }}>
                      {p.icon} {p.label}
                    </button>
                  ))}
                </div>
                {errors.platform && <span style={{ fontSize: 12, color: '#ef4444', fontFamily: 'Montserrat,sans-serif', marginTop: 4, display: 'block' }}>{errors.platform}</span>}
              </div>

              {/* Username */}
              <div style={{ marginBottom: 20 }}>
                <label style={lbl}>Username *</label>
                <input style={{ ...inp, border: `1.5px solid ${errors.username ? '#ef4444' : '#e5e7eb'}` }}
                  placeholder="Your profile username" value={form.username} onChange={e => change('username', e.target.value)} />
                {errors.username && <span style={{ fontSize: 12, color: '#ef4444', fontFamily: 'Montserrat,sans-serif', marginTop: 3, display: 'block' }}>{errors.username}</span>}
              </div>

              {/* Problems Solved */}
              <div style={{ marginBottom: 20 }}>
                <label style={lbl}>Problems Solved</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                  {([
                    { field: 'easy_solved'   as const, label: 'Easy 🟢',   bg: '#dcfce7', border: '#bbf7d0' },
                    { field: 'medium_solved' as const, label: 'Medium 🟠', bg: '#ffedd5', border: '#fed7aa' },
                    { field: 'hard_solved'   as const, label: 'Hard 🔴',   bg: '#fee2e2', border: '#fecaca' },
                  ]).map(({ field, label, bg, border }) => (
                    <div key={field}>
                      <label style={{ ...lbl, marginBottom: 4 }}>{label}</label>
                      <input type="number" min={0} style={{ ...inp, background: bg, border: `1.5px solid ${border}` }}
                        value={form[field] || ''} onChange={e => change(field, parseInt(e.target.value) || 0)} placeholder="0" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Rating / Rank / Streak / Contests */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                {([
                  { field: 'rating'            as const, label: 'Rating',           type: 'number', ph: 'e.g. 1800' },
                  { field: 'rank'              as const, label: 'Rank / Badge',      type: 'text',   ph: 'e.g. Knight, 3★' },
                  { field: 'streak'            as const, label: 'Streak (days)',     type: 'number', ph: 'e.g. 30' },
                  { field: 'contests_attended' as const, label: 'Contests Attended', type: 'number', ph: 'e.g. 12' },
                ]).map(({ field, label, type, ph }) => (
                  <div key={field}>
                    <label style={lbl}>{label}</label>
                    <input type={type} min={type === 'number' ? 0 : undefined} style={inp} placeholder={ph}
                      value={form[field] ?? ''} onChange={e => change(field, type === 'number' ? (parseInt(e.target.value) || 0) : e.target.value)} />
                  </div>
                ))}
              </div>

              {/* Badges */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ ...lbl }}>Badges <span style={{ color: '#9ca3af', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(comma separated)</span></label>
                <input style={inp} placeholder="e.g. 100 Days Badge, Top 5%"
                  value={(form.badges ?? []).join(', ')}
                  onChange={e => change('badges', e.target.value.split(',').map(b => b.trim()).filter(Boolean))} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ padding: '11px 24px', border: '1.5px solid #e5e7eb', borderRadius: 10, background: 'none', cursor: 'pointer', color: '#6b7280', fontFamily: 'Montserrat,sans-serif', fontSize: 14, fontWeight: 600 }}>Cancel</button>
                <button type="submit" disabled={loading} style={{ padding: '11px 32px', background: '#1a1a2e', border: 'none', borderRadius: 10, color: 'white', fontFamily: 'Montserrat,sans-serif', fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                  {loading ? 'Saving…' : editIdx !== null ? '✓ Update Profile' : '✓ Save Profile'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}