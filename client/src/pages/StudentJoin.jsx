import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';

const s = {
  container: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', animation: 'fadeIn 0.5s ease' },
  card: { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '48px 32px', maxWidth: '480px', width: '100%', textAlign: 'center' },
  title: { fontSize: '32px', fontWeight: 900, marginBottom: '8px' },
  subtitle: { fontSize: '18px', color: 'rgba(255,255,255,0.6)', marginBottom: '32px' },
  code: { fontSize: '28px', fontWeight: 900, color: '#FFE66D', letterSpacing: '4px', marginBottom: '24px' },
  input: { width: '100%', padding: '16px 20px', fontSize: '20px', fontWeight: 700, borderRadius: '12px', border: '2px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)', color: '#fff', outline: 'none', marginBottom: '16px', textAlign: 'center' },
  btn: { width: '100%', padding: '18px', fontSize: '20px', fontWeight: 800, borderRadius: '16px', background: 'linear-gradient(135deg, #F97316, #FFE66D)', color: '#1a1a2e', minHeight: '56px', boxShadow: '0 4px 20px rgba(249,115,22,0.3)' },
  error: { color: '#FF6B6B', fontSize: '16px', marginBottom: '16px', padding: '12px', background: 'rgba(255,107,107,0.1)', borderRadius: '12px' },
};

export default function StudentJoin() {
  const { sessionCode } = useParams();
  const [teamName, setTeamName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    setError('');
    setLoading(true);
    try {
      const data = await apiFetch('/game/join', {
        method: 'POST',
        body: JSON.stringify({ sessionCode: sessionCode.toUpperCase(), teamName: teamName.trim() }),
      });
      // Store team info in sessionStorage
      sessionStorage.setItem('ai-avventura-team', JSON.stringify({
        teamId: data.teamId,
        sessionId: data.sessionId,
        teamName: teamName.trim(),
        sessionCode: sessionCode.toUpperCase(),
      }));
      navigate(`/play/${sessionCode}/lobby`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.container}>
      <div style={s.card}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>🤖</div>
        <h1 style={s.title}>Unisciti all'Avventura!</h1>
        <p style={s.subtitle}>Sessione:</p>
        <div style={s.code}>{sessionCode.toUpperCase()}</div>

        <form onSubmit={handleJoin}>
          <input
            style={s.input}
            type="text"
            placeholder="Nome della squadra 🏷️"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            maxLength={30}
            autoComplete="off"
          />
          {error && <div style={s.error}>❌ {error}</div>}
          <button style={{ ...s.btn, opacity: loading || !teamName.trim() ? 0.6 : 1 }} type="submit" disabled={loading || !teamName.trim()}>
            {loading ? '⏳ Collegamento...' : '🚀 Entra!'}
          </button>
        </form>
      </div>
    </div>
  );
}
