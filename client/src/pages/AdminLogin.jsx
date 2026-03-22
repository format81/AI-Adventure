import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import { useI18n } from '../i18n/I18nContext';

const s = {
  container: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', animation: 'fadeIn 0.5s ease' },
  card: { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '48px 32px', maxWidth: '480px', width: '100%', textAlign: 'center' },
  title: { fontSize: '32px', fontWeight: 900, marginBottom: '8px' },
  subtitle: { fontSize: '18px', color: 'rgba(255,255,255,0.6)', marginBottom: '32px' },
  input: { width: '100%', padding: '16px 20px', fontSize: '18px', fontWeight: 600, borderRadius: '12px', border: '2px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)', color: '#fff', outline: 'none', marginBottom: '16px' },
  btn: { width: '100%', padding: '18px', fontSize: '20px', fontWeight: 800, borderRadius: '16px', background: 'linear-gradient(135deg, #F97316, #FFE66D)', color: '#1a1a2e', minHeight: '56px', boxShadow: '0 4px 20px rgba(249,115,22,0.3)' },
  error: { color: '#FF6B6B', fontSize: '16px', marginBottom: '16px', padding: '12px', background: 'rgba(255,107,107,0.1)', borderRadius: '12px' },
  back: { display: 'inline-block', marginTop: '24px', color: 'rgba(255,255,255,0.5)', fontSize: '16px' },
};

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { auth, login } = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();

  if (auth?.role === 'admin') {
    navigate('/admin/console', { replace: true });
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiFetch('/auth/admin-login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      login(data);
      navigate('/admin/console', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.container}>
      <div style={s.card}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>👩‍🏫</div>
        <h1 style={s.title}>{t('admin.title')}</h1>
        <p style={s.subtitle}>{t('admin.subtitle')}</p>

        <form onSubmit={handleSubmit}>
          <input style={s.input} type="text" placeholder={t('admin.username')} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
          <input style={s.input} type="password" placeholder={t('admin.password')} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          {error && <div style={s.error}>❌ {error}</div>}
          <button style={{ ...s.btn, opacity: loading ? 0.6 : 1 }} type="submit" disabled={loading}>
            {loading ? `⏳ ${t('admin.loggingIn')}` : `🔐 ${t('admin.login')}`}
          </button>
        </form>
        <a href="/" style={s.back}>← {t('app.backHome')}</a>
      </div>
    </div>
  );
}
