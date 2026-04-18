import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import API from '../config';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'sw', label: 'Kiswahili' },
  { code: 'ha', label: 'Hausa' },
  { code: 'ar', label: 'العربية' },
  { code: 'pt', label: 'Português' },
  { code: 'ak', label: 'Akan (Twi)' },
];

// ─── Reusable primitives ──────────────────────────────────────────────────────

function Section({ title, description, children }) {
  return (
    <div style={{
      background: 'var(--card-bg)',
      border: '1px solid rgba(168,85,247,0.15)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      marginBottom: 20,
      backdropFilter: 'blur(12px)',
    }}>
      <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--subtle-bg-2)' }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-h)', fontFamily: 'var(--heading)' }}>{title}</div>
        {description && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.5 }}>{description}</div>
        )}
      </div>
      <div style={{ padding: '20px 24px' }}>
        {children}
      </div>
    </div>
  );
}

function DangerSection({ title, description, children }) {
  return (
    <div style={{
      background: 'var(--card-bg)',
      border: '1px solid rgba(248,113,113,0.2)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      marginBottom: 20,
    }}>
      <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(248,113,113,0.1)' }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#f87171', fontFamily: 'var(--heading)' }}>{title}</div>
        {description && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.5 }}>{description}</div>
        )}
      </div>
      <div style={{ padding: '20px 24px' }}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 500 }}>
        {label}
      </label>
      {children}
      {hint && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>{hint}</div>}
    </div>
  );
}

function Input({ value, onChange, type = 'text', placeholder, disabled, style = {} }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: '100%',
        background: 'var(--field-bg)',
        border: `0.5px solid ${focused ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 8,
        padding: '9px 12px',
        fontSize: 13,
        color: disabled ? '#555' : '#e2e0f0',
        outline: 'none',
        transition: 'border-color 0.15s',
        cursor: disabled ? 'not-allowed' : 'text',
        ...style,
      }}
    />
  );
}

function SaveButton({ loading, disabled, label, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: disabled || loading ? 'rgba(139,92,246,0.05)' : hovered ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.1)',
        border: '0.5px solid rgba(139,92,246,0.3)',
        borderRadius: 8,
        padding: '8px 20px',
        fontSize: 13,
        color: disabled || loading ? '#555' : '#a78bfa',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  );
}

function StatusMsg({ status }) {
  if (!status) return null;
  const isError = status.type === 'error';
  return (
    <div style={{
      marginTop: 12,
      padding: '8px 12px',
      borderRadius: 8,
      fontSize: 12,
      background: isError ? 'rgba(248,113,113,0.08)' : 'rgba(45,212,191,0.08)',
      border: `0.5px solid ${isError ? 'rgba(248,113,113,0.25)' : 'rgba(45,212,191,0.25)'}`,
      color: isError ? '#f87171' : '#2dd4bf',
    }}>
      {status.message}
    </div>
  );
}

// ─── Section components ───────────────────────────────────────────────────────

function AccountSection({ user, onUserUpdate }) {
  const { t, i18n } = useTranslation();
  const [username, setUsername]       = useState(user.username);
  const [language, setLanguage]       = useState(user.preferred_language);
  const [loading, setLoading]         = useState(false);
  const [status, setStatus]           = useState(null);

  const hasChanges = username !== user.username || language !== user.preferred_language;

  async function handleSave() {
    setLoading(true);
    setStatus(null);
    try {
      const token = localStorage.getItem('hc_token');
      const res = await fetch(`${API}/auth/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username, preferred_language: language }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus({ type: 'error', message: data.error });
      } else {
        if (language !== user.preferred_language) {
          i18n.changeLanguage(language);
          localStorage.setItem('hc_lang', language);
        }
        onUserUpdate(data.user);
        setStatus({ type: 'success', message: t('settings.profileUpdated') });
      }
    } catch {
      setStatus({ type: 'error', message: t('settings.tryAgain') });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Section title={t('settings.accountTitle')} description={t('settings.accountDesc')}>
      <Field label={t('settings.usernameLabel')} hint={t('settings.usernameHint')}>
        <Input value={username} onChange={e => setUsername(e.target.value)} placeholder="your_username" />
      </Field>

      <Field label={t('settings.emailLabel')} hint={t('settings.emailHint')}>
        <Input value={user.email} disabled />
      </Field>

      <Field label={t('settings.languageLabel')} hint={t('settings.languageHint')}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {LANGUAGES.map(l => (
            <button
              key={l.code}
              onClick={() => setLanguage(l.code)}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all 0.15s',
                background: language === l.code ? 'rgba(139,92,246,0.15)' : 'var(--field-bg)',
                border: `0.5px solid ${language === l.code ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.08)'}`,
                color: language === l.code ? '#a78bfa' : '#666',
                fontWeight: language === l.code ? 500 : 400,
              }}
            >
              {l.label}
            </button>
          ))}
        </div>
      </Field>

      <SaveButton loading={loading} disabled={!hasChanges} label={loading ? t('settings.saving') : t('settings.saveChanges')} onClick={handleSave} />
      <StatusMsg status={status} />
    </Section>
  );
}

function PasswordSection() {
  const { t } = useTranslation();
  const [current,  setCurrent]  = useState('');
  const [next,     setNext]     = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [loading,  setLoading]  = useState(false);
  const [status,   setStatus]   = useState(null);

  const mismatch  = confirm.length > 0 && next !== confirm;
  const tooShort  = next.length > 0 && next.length < 8;
  const canSave   = current && next && confirm && next === confirm && next.length >= 8;

  async function handleSave() {
    setLoading(true);
    setStatus(null);
    try {
      const token = localStorage.getItem('hc_token');
      const res = await fetch(`${API}/auth/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ current_password: current, new_password: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus({ type: 'error', message: data.error });
      } else {
        setCurrent(''); setNext(''); setConfirm('');
        setStatus({ type: 'success', message: t('settings.passwordUpdated') });
      }
    } catch {
      setStatus({ type: 'error', message: t('settings.tryAgain') });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Section title={t('settings.passwordTitle')} description={t('settings.passwordDesc')}>
      <Field label={t('settings.currentPassword')}>
        <Input type="password" value={current} onChange={e => setCurrent(e.target.value)} placeholder="••••••••" />
      </Field>

      <Field label={t('settings.newPassword')} hint={tooShort ? t('settings.minChars') : undefined}>
        <Input
          type="password"
          value={next}
          onChange={e => setNext(e.target.value)}
          placeholder="••••••••"
          style={{ borderColor: tooShort ? 'rgba(248,113,113,0.4)' : undefined }}
        />
      </Field>

      <Field label={t('settings.confirmPassword')} hint={mismatch ? t('settings.passwordMismatch') : undefined}>
        <Input
          type="password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          placeholder="••••••••"
          style={{ borderColor: mismatch ? 'rgba(248,113,113,0.4)' : undefined }}
        />
      </Field>

      <SaveButton loading={loading} disabled={!canSave} label={loading ? t('settings.saving') : t('settings.updatePassword')} onClick={handleSave} />
      <StatusMsg status={status} />
    </Section>
  );
}

function DeleteSection({ username, onDeleted }) {
  const { t } = useTranslation();
  const [expanded,  setExpanded]  = useState(false);
  const [typedName, setTypedName] = useState('');
  const [password,  setPassword]  = useState('');
  const [loading,   setLoading]   = useState(false);
  const [status,    setStatus]    = useState(null);

  const confirmed = typedName === username;
  const canDelete = confirmed && password.length > 0;

  async function handleDelete() {
    if (!canDelete) return;
    setLoading(true);
    setStatus(null);
    try {
      const token = localStorage.getItem('hc_token');
      const res = await fetch(`${API}/auth/me`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus({ type: 'error', message: data.error });
        setLoading(false);
      } else {
        onDeleted();
      }
    } catch {
      setStatus({ type: 'error', message: t('settings.tryAgain') });
      setLoading(false);
    }
  }

  return (
    <DangerSection title={t('settings.deleteTitle')} description={t('settings.deleteDesc')}>
      {!expanded ? (
        <button
          onClick={() => setExpanded(true)}
          style={{
            background: 'transparent',
            border: '0.5px solid rgba(248,113,113,0.3)',
            borderRadius: 8, padding: '8px 20px',
            fontSize: 13, color: '#f87171', cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(248,113,113,0.06)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          {t('settings.deleteButton')}
        </button>
      ) : (
        <div>
          <div style={{
            background: 'rgba(248,113,113,0.06)',
            border: '0.5px solid rgba(248,113,113,0.15)',
            borderRadius: 8, padding: '12px 14px', marginBottom: 18,
            fontSize: 12, color: '#c77', lineHeight: 1.6,
          }}>
            {t('settings.deleteWarning', { username })}
          </div>

          <Field label={t('settings.typeUsername')}>
            <Input
              value={typedName}
              onChange={e => setTypedName(e.target.value)}
              placeholder={username}
              style={{ borderColor: typedName && !confirmed ? 'rgba(248,113,113,0.4)' : undefined }}
            />
          </Field>

          <Field label={t('settings.enterPassword')}>
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </Field>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => { setExpanded(false); setTypedName(''); setPassword(''); setStatus(null); }}
              style={{
                background: 'transparent',
                border: '0.5px solid rgba(255,255,255,0.1)',
                borderRadius: 8, padding: '8px 20px',
                fontSize: 13, color: '#666', cursor: 'pointer',
              }}
            >
              {t('settings.cancel')}
            </button>
            <button
              onClick={handleDelete}
              disabled={!canDelete || loading}
              style={{
                background: canDelete && !loading ? 'rgba(248,113,113,0.12)' : 'rgba(248,113,113,0.04)',
                border: `0.5px solid ${canDelete && !loading ? 'rgba(248,113,113,0.4)' : 'rgba(248,113,113,0.15)'}`,
                borderRadius: 8, padding: '8px 20px',
                fontSize: 13,
                color: canDelete && !loading ? '#f87171' : '#4a2020',
                cursor: canDelete && !loading ? 'pointer' : 'not-allowed',
                transition: 'all 0.15s',
              }}
            >
              {loading ? t('settings.deleting') : t('settings.deleteConfirm')}
            </button>
          </div>

          <StatusMsg status={status} />
        </div>
      )}
    </DangerSection>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user, ready, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    if (ready && !user) navigate('/login');
  }, [ready, user]);

  if (!ready || !user) return null;

  function handleUserUpdate(updatedUser) {
    setUser(updatedUser);
    localStorage.setItem('hc_user', JSON.stringify(updatedUser));
  }

  function handleDeleted() {
    logout();
    navigate('/');
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '40px 24px' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-h)', marginBottom: 4, fontFamily: 'var(--heading)', letterSpacing: '-0.4px', borderLeft: '3px solid var(--accent)', paddingLeft: 12 }}>{t('settings.title')}</h1>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', paddingLeft: 15 }}>{t('settings.subtitle')}</div>
      </div>

      <AccountSection user={user} onUserUpdate={handleUserUpdate} />
      <PasswordSection />

      <Section title={t('settings.notificationsTitle')} description={t('settings.notificationsDesc')}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px',
          background: 'var(--field-bg)',
          border: '0.5px solid var(--subtle-bg-2)',
          borderRadius: 8,
          fontSize: 13, color: '#444',
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="6" stroke="#333" strokeWidth="0.8"/>
            <path d="M7 4v3.5l2 2" stroke="#333" strokeWidth="0.8" strokeLinecap="round"/>
          </svg>
          {t('settings.notificationsComing')}
        </div>
      </Section>

      <DeleteSection username={user.username} onDeleted={handleDeleted} />
    </div>
  );
}
