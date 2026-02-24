'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, clearAuth, apiGet, apiPatch } from '@/lib/api';

interface Auth { token: string; email: string | null; name: string | null; }
interface Education { degree: string; branch: string; institution: string; cgpa?: number; start_year?: number; end_year?: number; }
interface Project { title: string; description: string; tech_stack?: string[]; github_link?: string; live_link?: string; }
interface Skill { name: string; category?: string; level?: number; }
interface Experience { role?: string; company?: string; start_date?: string; end_date?: string; description?: string; }
interface Achievement { title: string; description?: string; date?: string; }
interface Profile {
  full_name?: string; email?: string; phone?: string; location?: string;
  education?: Education[]; projects?: Project[]; skills?: Skill[];
  experience?: Experience[]; achievements?: Achievement[];
}

// ── Login page color palette ─────────────────────────────────────────────────
const C = {
  ink:        '#0d0d14',
  paper:      '#f7f6f2',
  accent:     '#6c47ff',
  accentHov:  '#5835e8',
  accent2:    '#ff6b6b',
  muted:      '#9896a4',
  border:     '#e5e4ef',
  white:      '#ffffff',
};

const inp: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  border: `1.5px solid ${C.border}`, fontFamily: 'Montserrat, sans-serif', fontSize: 14,
  outline: 'none', background: C.white, color: C.ink, boxSizing: 'border-box',
};
const mlbl: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: C.muted, display: 'block',
  marginBottom: 5, fontFamily: 'Montserrat, sans-serif', textTransform: 'uppercase', letterSpacing: '0.6px',
};
const fg: React.CSSProperties = { display: 'flex', flexDirection: 'column', marginBottom: 14 };

// ── Scroll-reveal hook ───────────────────────────────────────────────────────
function useFadeIn(delay = 0) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return {
    ref,
    style: {
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(24px)',
      transition: `opacity 0.5s ease ${delay}ms, transform 0.5s ease ${delay}ms`,
    } as React.CSSProperties,
  };
}

// NAVBAR — UNCHANGED STRUCTURE
export function Navbar({ active }: { active?: string }) {
  const router = useRouter();
  const NAV = ['Dashboard', 'Development', 'Machine Learning', 'DSA'];
  return (
    <nav style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      height: 56, gap: 36, background: C.white,
      borderBottom: `1px solid ${C.border}`,
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
    }}>
      {NAV.map(label => (
        <button key={label} onClick={() => {
          if (label === 'Dashboard') router.push('/home');
          if (label === 'Development') router.push('/development');
        }} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: 'Montserrat, sans-serif', fontSize: 14,
          color: active === label ? C.ink : C.muted,
          fontWeight: active === label ? 700 : 500,
          padding: '2px 0',
          borderBottom: active === label ? `2px solid ${C.accent}` : '2px solid transparent',
          transition: 'color 0.15s',
        }}>{label}</button>
      ))}
    </nav>
  );
}

function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: type === 'success' ? '#22c55e' : C.accent2,
      color: C.white, borderRadius: 12, padding: '12px 18px',
      fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: 14,
      display: 'flex', alignItems: 'center', gap: 8,
      boxShadow: '0 4px 20px rgba(108,71,255,0.25)',
    }}>
      {type === 'success' ? '✓' : '✕'} {msg}
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(13,13,20,0.4)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: C.white, borderRadius: 20, padding: '28px 32px',
        width: '100%', maxWidth: 560, maxHeight: '88vh', overflowY: 'auto',
        boxShadow: '0 24px 60px rgba(108,71,255,0.18)',
        border: `1px solid ${C.border}`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 19, color: C.ink, margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: C.paper, border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ContactModal({ phone, location, onSave, onClose }: {
  phone: string; location: string; onSave: (p: string, l: string) => Promise<void>; onClose: () => void;
}) {
  const [p, setP] = useState(phone); const [l, setL] = useState(location); const [saving, setSaving] = useState(false);
  return (
    <Modal title="Edit Contact Info" onClose={onClose}>
      <div style={fg}><label style={mlbl}>Phone Number</label><input style={inp} placeholder="+91 9876543210" value={p} onChange={e => setP(e.target.value)} /></div>
      <div style={fg}><label style={mlbl}>Location</label><input style={inp} placeholder="Chennai, Tamil Nadu" value={l} onChange={e => setL(e.target.value)} /></div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
        <button onClick={onClose} style={{ padding: '10px 22px', border: `1.5px solid ${C.border}`, borderRadius: 10, background: 'none', cursor: 'pointer', color: C.muted, fontFamily: 'Montserrat, sans-serif', fontSize: 14 }}>Cancel</button>
        <button onClick={async () => { setSaving(true); await onSave(p, l); setSaving(false); }} disabled={saving}
          style={{ padding: '10px 26px', background: C.accent, border: 'none', borderRadius: 10, color: C.white, fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 14px rgba(108,71,255,0.35)' }}>
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </Modal>
  );
}

function SkillsModal({ existing, onSave, onClose }: {
  existing: Skill[]; onSave: (skills: Skill[]) => Promise<void>; onClose: () => void;
}) {
  const [skills, setSkills] = useState<Skill[]>(existing.length ? existing.map(s => ({ ...s })) : [{ name: '', category: '', level: undefined }]);
  const [saving, setSaving] = useState(false);
  function add() { setSkills(s => [...s, { name: '', category: '', level: undefined }]); }
  function remove(i: number) { setSkills(s => s.filter((_, idx) => idx !== i)); }
  function change(i: number, field: keyof Skill, val: string) {
    setSkills(s => { const n = [...s]; n[i] = { ...n[i], [field]: field === 'level' ? (val ? parseInt(val) : undefined) : val } as Skill; return n; });
  }
  async function save() {
    const valid = skills.filter(s => s.name.trim());
    if (!valid.length) return;
    setSaving(true); await onSave(valid); setSaving(false);
  }
  return (
    <Modal title="⚡ Manage Skills" onClose={onClose}>
      {skills.map((s, i) => (
        <div key={i} style={{ border: `1.5px solid ${C.border}`, borderRadius: 12, padding: '14px 16px', marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 13, color: C.ink }}>{s.name || `Skill #${i + 1}`}</span>
            <button onClick={() => remove(i)} style={{ background: '#fff0f0', border: `1px solid ${C.accent2}50`, borderRadius: 6, padding: '3px 10px', fontSize: 12, color: C.accent2, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>Remove</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 0.8fr', gap: 10 }}>
            <div style={fg}><label style={mlbl}>Name *</label><input style={inp} placeholder="e.g. React" value={s.name} onChange={e => change(i, 'name', e.target.value)} /></div>
            <div style={fg}><label style={mlbl}>Category</label><input style={inp} placeholder="Frontend" value={s.category || ''} onChange={e => change(i, 'category', e.target.value)} /></div>
            <div style={fg}><label style={mlbl}>Level 1–10</label><input style={inp} type="number" min="1" max="10" placeholder="8" value={s.level ?? ''} onChange={e => change(i, 'level', e.target.value)} /></div>
          </div>
        </div>
      ))}
      <button onClick={add} style={{ width: '100%', padding: 12, border: `2px dashed ${C.border}`, borderRadius: 10, background: 'transparent', cursor: 'pointer', color: C.accent, fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 13.5, marginBottom: 18 }}>+ Add Skill</button>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={{ padding: '10px 22px', border: `1.5px solid ${C.border}`, borderRadius: 10, background: 'none', cursor: 'pointer', color: C.muted, fontFamily: 'Montserrat, sans-serif', fontSize: 14 }}>Cancel</button>
        <button onClick={save} disabled={saving} style={{ padding: '10px 26px', background: C.accent, border: 'none', borderRadius: 10, color: C.white, fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 14px rgba(108,71,255,0.35)' }}>
          {saving ? 'Saving...' : 'Save Skills'}
        </button>
      </div>
    </Modal>
  );
}

function SectionHead({ title, count, subtitle, onAdd, addLabel = '+ Add' }: {
  title: string; count: number; subtitle: string; onAdd: () => void; addLabel?: string;
}) {
  const fade = useFadeIn(0);
  return (
    <div ref={fade.ref} style={{ ...fade.style, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
          <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 26, color: C.ink, margin: 0 }}>{title}</h2>
          <span style={{
            minWidth: 26, height: 26, borderRadius: 13,
            background: C.accent, color: C.white,
            fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 12,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 7px',
          }}>{count}</span>
        </div>
        <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 14, color: C.muted, margin: 0 }}>{subtitle}</p>
      </div>
      <button onClick={onAdd}
        onMouseEnter={e => { e.currentTarget.style.background = C.accentHov; e.currentTarget.style.transform = 'translateY(-1px)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = C.accent; e.currentTarget.style.transform = 'none'; }}
        style={{
          background: C.accent, color: C.white, border: 'none',
          borderRadius: 12, padding: '11px 22px',
          fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 13.5,
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
          transition: 'background 0.2s, transform 0.15s',
          boxShadow: '0 4px 14px rgba(108,71,255,0.3)',
          whiteSpace: 'nowrap',
        }}>{addLabel}</button>
    </div>
  );
}

function HScroll({ children }: { children: React.ReactNode }) {
  const fade = useFadeIn(80);
  return (
    <div ref={fade.ref} style={{ ...fade.style, display: 'flex', gap: 20, overflowX: 'auto', paddingBottom: 10, scrollbarWidth: 'none' }}>
      {children}
    </div>
  );
}

// ── InfoCard — wide card, stats each on own row ──────────────────────────────
function InfoCard({
  accentColor, typeBadge, yearBadge, title, subtitle,
  stats, footer, onEdit, onDelete,
}: {
  accentColor: string; typeBadge?: string; yearBadge?: string;
  title: string; subtitle?: string;
  stats?: { icon?: string; label: string; value: string }[];
  footer?: React.ReactNode; onEdit: () => void; onDelete: () => void;
}) {
  const [hov, setHov] = useState(false);
  // Fixed width: wide enough so institution names never overflow
  const W = 400;

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        minWidth: W, maxWidth: W, flexShrink: 0,
        borderRadius: 20, border: `1.5px solid ${hov ? accentColor + '60' : C.border}`,
        background: C.white,
        boxShadow: hov ? `0 12px 36px rgba(108,71,255,0.14)` : '0 2px 10px rgba(13,13,20,0.06)',
        transition: 'box-shadow 0.22s, transform 0.22s, border-color 0.22s',
        transform: hov ? 'translateY(-5px)' : 'none',
      }}
    >
      {/* Top badge row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '20px 22px 0', flexWrap: 'wrap' }}>
        {typeBadge && (
          <span style={{
            background: `${accentColor}15`, border: `1.5px solid ${accentColor}50`,
            borderRadius: 20, padding: '5px 16px',
            fontSize: 13, fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
            color: accentColor, whiteSpace: 'nowrap',
          }}>{typeBadge}</span>
        )}
        {yearBadge && (
          <span style={{
            background: C.paper, border: `1px solid ${C.border}`,
            borderRadius: 20, padding: '5px 13px',
            fontSize: 12.5, fontFamily: 'Montserrat, sans-serif', fontWeight: 600, color: C.muted,
            display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            {yearBadge}
          </span>
        )}
        {/* Edit / Delete — appear on hover */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, opacity: hov ? 1 : 0, transition: 'opacity 0.18s' }}>
          <button onClick={onEdit} style={{
            background: `${C.accent}10`, border: `1px solid ${C.accent}30`, borderRadius: 8,
            padding: '5px 13px', fontSize: 12.5, color: C.accent,
            cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
          }}>✏️ Edit</button>
          <button onClick={onDelete} style={{
            background: '#fff0f0', border: `1px solid ${C.accent2}50`, borderRadius: 8,
            padding: '5px 13px', fontSize: 12.5, color: C.accent2,
            cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
          }}>🗑</button>
        </div>
      </div>

      {/* Card body */}
      <div style={{ padding: '14px 22px 22px' }}>
        {/* Title */}
        <p style={{
          fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 20, color: C.ink,
          lineHeight: 1.3, margin: '0 0 6px',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>{title}</p>

        {/* Subtitle — wraps naturally, no truncation */}
        {subtitle && (
          <p style={{
            fontFamily: 'Montserrat, sans-serif', fontSize: 14, color: C.muted,
            margin: '0 0 16px', lineHeight: 1.6, wordBreak: 'break-word',
          }}>{subtitle}</p>
        )}

        {/* Stats — each field on its OWN ROW */}
        {stats && stats.length > 0 && (
          <div style={{
            border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden',
            marginTop: subtitle ? 0 : 12,
            background: C.paper,
          }}>
            {stats.map((s, i) => (
              <div key={i} style={{
                padding: '12px 16px',
                borderBottom: i < stats.length - 1 ? `1px solid ${C.border}` : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
              }}>
                {/* Left: icon + label */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
                  {s.icon && <span style={{ fontSize: 14 }}>{s.icon}</span>}
                  <span style={{
                    fontFamily: 'Montserrat, sans-serif', fontSize: 11, color: C.muted,
                    fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
                  }}>{s.label}</span>
                </div>
                {/* Right: value — wraps if long */}
                <p style={{
                  fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 14,
                  color: C.ink, margin: 0, textAlign: 'right', wordBreak: 'break-word',
                  maxWidth: '60%',
                }}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {footer && <div style={{ marginTop: 14 }}>{footer}</div>}
      </div>
    </div>
  );
}

function Empty({ emoji, text, onAdd, label }: { emoji: string; text: string; onAdd: () => void; label: string }) {
  const fade = useFadeIn(60);
  return (
    <div ref={fade.ref} style={{
      ...fade.style,
      border: `2px dashed ${C.border}`, borderRadius: 16,
      padding: '40px 24px', textAlign: 'center', background: C.paper,
    }}>
      <span style={{ fontSize: 36 }}>{emoji}</span>
      <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 14.5, color: C.muted, margin: '14px 0 20px' }}>{text}</p>
      <button onClick={onAdd} style={{
        background: C.accent, color: C.white, border: 'none', borderRadius: 12,
        padding: '11px 24px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 14,
        cursor: 'pointer', boxShadow: '0 4px 14px rgba(108,71,255,0.3)',
      }}>{label}</button>
    </div>
  );
}

function SkillsReveal({ children }: { children: React.ReactNode }) {
  const fade = useFadeIn(80);
  return (
    <div ref={fade.ref} style={{ ...fade.style, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
      {children}
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [auth, setAuth] = useState<Auth | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [modal, setModal] = useState<'skills' | 'contact' | null>(null);

  const fetchProfile = useCallback(async (email: string) => {
    const data = await apiGet(`/form/get-profile/${encodeURIComponent(email)}`);
    setProfile(data);
  }, []);

  useEffect(() => {
    const a = getAuth();
    if (!a) { router.replace('/login'); return; }
    setAuth(a);
    if (a.email) fetchProfile(a.email).catch(() => setProfile({})).finally(() => setLoading(false));
  }, [router, fetchProfile]);

  function logout() { clearAuth(); router.push('/login'); }

  async function patch(payload: Partial<Profile>, msg: string) {
    try {
      await apiPatch('/form/update-profile', payload);
      setProfile(p => ({ ...p, ...payload }));
      setModal(null);
      setToast({ msg, type: 'success' });
    } catch {
      setToast({ msg: 'Failed to save', type: 'error' });
    }
  }

  const del = {
    edu:   (i: number) => patch({ education:    (profile?.education    ?? []).filter((_, idx) => idx !== i) }, 'Education removed'),
    proj:  (i: number) => patch({ projects:     (profile?.projects     ?? []).filter((_, idx) => idx !== i) }, 'Project removed'),
    exp:   (i: number) => patch({ experience:   (profile?.experience   ?? []).filter((_, idx) => idx !== i) }, 'Experience removed'),
    ach:   (i: number) => patch({ achievements: (profile?.achievements ?? []).filter((_, idx) => idx !== i) }, 'Achievement removed'),
    skill: (i: number) => patch({ skills:       (profile?.skills       ?? []).filter((_, idx) => idx !== i) }, 'Skill removed'),
  };

  if (!auth) return null;

  const displayName = profile?.full_name || auth.name || auth.email?.split('@')[0] || 'User';
  const initials = displayName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
  const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Present';

  const SIDEBAR_W = 270;
  const NAV_H = 56;

  return (
    <div style={{ minHeight: '100vh', background: C.paper, fontFamily: 'Montserrat, sans-serif' }}>
      <Navbar active="Dashboard" />

      {/* ── SIDEBAR ── */}
      <aside style={{
        position: 'fixed', top: NAV_H, left: 0, width: SIDEBAR_W,
        height: `calc(100vh - ${NAV_H}px)`, overflowY: 'auto',
        borderRight: `1px solid ${C.border}`, background: C.white,
        padding: '36px 26px 36px 32px',
        display: 'flex', flexDirection: 'column', zIndex: 100,
      }}>
        {/* Avatar */}
        <div style={{
          width: 68, height: 68, borderRadius: '50%',
          background: `linear-gradient(135deg, ${C.accent}, #9b72ff)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: C.white, fontWeight: 800, fontSize: 22, marginBottom: 14, flexShrink: 0,
          fontFamily: 'Montserrat, sans-serif',
          boxShadow: '0 6px 20px rgba(108,71,255,0.35)',
        }}>{initials}</div>

        <p style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 17, color: C.ink, margin: '0 0 3px' }}>{displayName}</p>
        <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, color: C.muted, margin: '0 0 22px', wordBreak: 'break-all', lineHeight: 1.5 }}>{auth.email}</p>

        {/* Location */}
        <button onClick={() => setModal('contact')} style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
          background: 'none', border: `1.5px solid ${C.border}`, borderRadius: 10,
          padding: '9px 12px', fontSize: 13.5,
          color: profile?.location ? C.ink : C.muted,
          cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', textAlign: 'left', marginBottom: 8,
          transition: 'border-color 0.2s',
        }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = C.accent)}
          onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}
        >
          <span style={{ fontSize: 16 }}>📍</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {profile?.location || 'Add location'}
          </span>
        </button>

        {/* Phone */}
        <button onClick={() => setModal('contact')} style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
          background: 'none', border: `1.5px solid ${C.border}`, borderRadius: 10,
          padding: '9px 12px', fontSize: 13.5,
          color: profile?.phone ? C.ink : C.muted,
          cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', textAlign: 'left', marginBottom: 28,
          transition: 'border-color 0.2s',
        }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = C.accent)}
          onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}
        >
          <span style={{ fontSize: 16 }}>📞</span>
          <span>{profile?.phone || 'Add phone'}</span>
        </button>

        <button onClick={logout}
          onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent2; e.currentTarget.style.color = C.accent2; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted; }}
          style={{
            width: '100%', background: 'none', border: `1.5px solid ${C.border}`,
            borderRadius: 10, padding: '9px 14px',
            fontFamily: 'Montserrat, sans-serif', fontSize: 13.5, fontWeight: 600,
            cursor: 'pointer', color: C.muted, transition: 'border-color 0.2s, color 0.2s',
          }}>Logout</button>
      </aside>

      {/* ── MAIN ── */}
      <main style={{ marginLeft: SIDEBAR_W, paddingTop: NAV_H, minHeight: '100vh' }}>
        <div style={{ padding: '52px 60px 100px' }}>

          {/* Page heading */}
          <h1 style={{
            fontFamily: 'Montserrat, sans-serif', fontWeight: 900, fontSize: 44,
            color: C.ink, margin: '0 0 8px', letterSpacing: '-1.5px',
          }}>
            My <span style={{ color: C.accent }}>Profile</span>
          </h1>
          <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 15, color: C.muted, margin: '0 0 52px', fontWeight: 400 }}>
            Manage, update, and track all your profile information
          </p>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 80 }}>
              <span className="spinner" style={{ borderColor: `${C.accent}30`, borderTopColor: C.accent, width: 36, height: 36 }} />
            </div>
          ) : (<>

            {/* ── EDUCATION ── */}
            <div style={{ marginBottom: 60 }}>
              <SectionHead title="Education" count={profile?.education?.length ?? 0}
                subtitle="Your academic background and qualifications"
                onAdd={() => router.push('/profile/education')} addLabel="+ Add Education" />
              {profile?.education?.length ? (
                <HScroll>
                  {profile.education.map((e, i) => (
                    <InfoCard key={i} accentColor="#7c3aed"
                      typeBadge={e.degree}
                      yearBadge={`${e.start_year ?? '?'}–${e.end_year ?? 'Now'}`}
                      title={e.branch || e.degree}
                      subtitle={e.institution}
                      stats={[
                        { icon: '🏫', label: 'Institution', value: e.institution || '—' },
                        { icon: '⭐', label: 'CGPA',        value: e.cgpa ? String(e.cgpa) : '—' },
                        { icon: '📅', label: 'Start Year',  value: e.start_year ? String(e.start_year) : '—' },
                        { icon: '🏁', label: 'End Year',    value: e.end_year ? String(e.end_year) : 'Present' },
                      ]}
                      onEdit={() => router.push(`/profile/education?edit=${i}`)}
                      onDelete={() => del.edu(i)} />
                  ))}
                </HScroll>
              ) : <Empty emoji="🎓" text="Add your degrees, diplomas, and certifications" onAdd={() => router.push('/profile/education')} label="Add Education" />}
            </div>

            {/* ── PROJECTS ── */}
            <div style={{ marginBottom: 60 }}>
              <SectionHead title="Projects" count={profile?.projects?.length ?? 0}
                subtitle="Showcase your work, side projects, and contributions"
                onAdd={() => router.push('/profile/projects')} addLabel="+ Add Project" />
              {profile?.projects?.length ? (
                <HScroll>
                  {profile.projects.map((p, i) => (
                    <InfoCard key={i} accentColor="#f97316"
                      typeBadge="Project"
                      yearBadge={p.tech_stack?.slice(0, 2).join(' · ') || undefined}
                      title={p.title} subtitle={p.description}
                      stats={[
                        { icon: '🔧', label: 'Stack',     value: p.tech_stack?.slice(0, 2).join(', ') || '—' },
                        { icon: '📦', label: 'More Tech', value: p.tech_stack && p.tech_stack.length > 2 ? `+${p.tech_stack.length - 2} more` : '—' },
                      ]}
                      footer={
                        (p.github_link || p.live_link) ? (
                          <div style={{ display: 'flex', gap: 14 }}>
                            {p.github_link && <a href={p.github_link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: C.accent, fontFamily: 'Montserrat, sans-serif', fontWeight: 700, textDecoration: 'none' }}>⌥ GitHub →</a>}
                            {p.live_link   && <a href={p.live_link}   target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#16a34a', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, textDecoration: 'none' }}>🌐 Live →</a>}
                          </div>
                        ) : undefined
                      }
                      onEdit={() => router.push(`/profile/projects?edit=${i}`)}
                      onDelete={() => del.proj(i)} />
                  ))}
                </HScroll>
              ) : <Empty emoji="💻" text="Add projects to showcase your technical skills" onAdd={() => router.push('/profile/projects')} label="Add Project" />}
            </div>

            {/* ── SKILLS ── */}
            <div style={{ marginBottom: 60 }}>
              <SectionHead title="Skills" count={profile?.skills?.length ?? 0}
                subtitle="Technologies, tools, and expertise you've mastered"
                onAdd={() => setModal('skills')} addLabel="+ Manage Skills" />
              {profile?.skills?.length ? (
                <SkillsReveal>
                  {profile.skills.map((s, i) => (
                    <div key={i} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      background: C.white, border: `1.5px solid ${C.border}`,
                      borderRadius: 10, padding: '9px 14px',
                      boxShadow: '0 1px 4px rgba(13,13,20,0.05)',
                    }}>
                      <span style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 14, color: C.ink }}>{s.name}</span>
                      {s.category && <span style={{ fontSize: 11.5, color: C.accent, background: `${C.accent}12`, borderRadius: 5, padding: '2px 8px', fontWeight: 600 }}>{s.category}</span>}
                      {s.level !== undefined && <span style={{ fontSize: 11.5, color: C.muted, fontWeight: 600 }}>Lv{s.level}</span>}
                      <button onClick={() => del.skill(i)} style={{ background: 'none', border: 'none', color: C.border, cursor: 'pointer', fontSize: 13, padding: 0, lineHeight: 1 }}>✕</button>
                    </div>
                  ))}
                  <button onClick={() => setModal('skills')} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: C.white, border: `2px dashed ${C.border}`,
                    borderRadius: 10, padding: '9px 16px',
                    color: C.accent, fontSize: 13.5, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
                  }}>✏️ Edit all</button>
                </SkillsReveal>
              ) : <Empty emoji="⚡" text="Add your technical skills, frameworks, and tools" onAdd={() => setModal('skills')} label="Add Skills" />}
            </div>

            {/* ── EXPERIENCE ── */}
            <div style={{ marginBottom: 60 }}>
              <SectionHead title="Experience" count={profile?.experience?.length ?? 0}
                subtitle="Work history, internships, and professional roles"
                onAdd={() => router.push('/profile/experience')} addLabel="+ Add Experience" />
              {profile?.experience?.length ? (
                <HScroll>
                  {profile.experience.map((e, i) => (
                    <InfoCard key={i} accentColor="#16a34a"
                      typeBadge={e.company}
                      yearBadge={!e.end_date ? 'Current' : undefined}
                      title={e.role || 'Role'} subtitle={e.company}
                      stats={[
                        { icon: '🏢', label: 'Company', value: e.company || '—' },
                        { icon: '🗓', label: 'Period',  value: `${fmtDate(e.start_date)} – ${fmtDate(e.end_date)}` },
                      ]}
                      footer={e.description ? (
                        <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13, color: C.muted, lineHeight: 1.6, margin: 0, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{e.description}</p>
                      ) : undefined}
                      onEdit={() => router.push(`/profile/experience?edit=${i}`)}
                      onDelete={() => del.exp(i)} />
                  ))}
                </HScroll>
              ) : <Empty emoji="💼" text="Add internships, jobs, and freelance work to your profile" onAdd={() => router.push('/profile/experience')} label="Add Experience" />}
            </div>

            {/* ── ACHIEVEMENTS ── */}
            <div style={{ marginBottom: 60 }}>
              <SectionHead title="Achievements" count={profile?.achievements?.length ?? 0}
                subtitle="Awards, certifications, hackathons, and milestones"
                onAdd={() => router.push('/profile/achievements')} addLabel="+ Add Achievement" />
              {profile?.achievements?.length ? (
                <HScroll>
                  {profile.achievements.map((a, i) => (
                    <InfoCard key={i} accentColor="#d97706"
                      typeBadge="Achievement"
                      yearBadge={a.date ? new Date(a.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : undefined}
                      title={a.title} subtitle={a.description}
                      stats={a.date ? [
                        { icon: '📅', label: 'Date', value: new Date(a.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) },
                      ] : undefined}
                      onEdit={() => router.push(`/profile/achievements?edit=${i}`)}
                      onDelete={() => del.ach(i)} />
                  ))}
                </HScroll>
              ) : <Empty emoji="🏆" text="Add hackathon wins, certifications, and recognitions" onAdd={() => router.push('/profile/achievements')} label="Add Achievement" />}
            </div>

          </>)}
        </div>
      </main>

      {modal === 'contact' && (
        <ContactModal phone={profile?.phone || ''} location={profile?.location || ''}
          onSave={async (p, l) => { await patch({ phone: p, location: l }, 'Contact updated!'); }}
          onClose={() => setModal(null)} />
      )}
      {modal === 'skills' && (
        <SkillsModal existing={profile?.skills ?? []}
          onSave={async skills => { await patch({ skills }, 'Skills updated!'); }}
          onClose={() => setModal(null)} />
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}