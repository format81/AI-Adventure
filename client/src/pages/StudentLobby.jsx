import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSSE } from '../hooks/useSSE';
import { apiFetch } from '../lib/api';

const s = {
  container: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', animation: 'fadeIn 0.5s ease' },
  card: { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '48px 32px', maxWidth: '520px', width: '100%', textAlign: 'center' },
  title: { fontSize: '28px', fontWeight: 900, marginBottom: '16px' },
  robot: { fontSize: '80px', display: 'block', marginBottom: '16px', animation: 'bounce 2s ease infinite' },
  teamBadge: { display: 'inline-block', padding: '8px 16px', background: 'rgba(255,255,255,0.08)', borderRadius: '12px', fontSize: '16px', margin: '4px' },
};

export default function StudentLobby() {
  const { sessionCode } = useParams();
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [dots, setDots] = useState('.');

  const teamInfo = (() => {
    try { return JSON.parse(sessionStorage.getItem('ai-avventura-team')); } catch { return null; }
  })();

  if (!teamInfo) {
    navigate(`/play/${sessionCode}`, { replace: true });
    return null;
  }

  // Dots animation
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '.' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Check initial state
  useEffect(() => {
    apiFetch(`/game/${teamInfo.sessionId}/state`).then(state => {
      if (state.status === 'active') {
        navigate(`/play/${sessionCode}/game`, { replace: true });
      }
    }).catch(() => {});
  }, []);

  // SSE for real-time updates
  useSSE(teamInfo.sessionId, {
    onSessionStart: () => {
      navigate(`/play/${sessionCode}/game`, { replace: true });
    },
    onTeamJoined: (data) => {
      setTeams(prev => {
        if (prev.includes(data.teamName)) return prev;
        return [...prev, data.teamName];
      });
    },
  });

  return (
    <div style={s.container}>
      <div style={s.card}>
        <span style={s.robot}>🤖</span>
        <h1 style={s.title}>La maestra sta per iniziare{dots}</h1>
        <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.6)', marginBottom: '24px' }}>
          Squadra: <strong style={{ color: '#FFE66D' }}>{teamInfo.teamName}</strong>
        </p>

        {teams.length > 0 && (
          <div>
            <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.5)', marginBottom: '12px' }}>
              Squadre collegate:
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
              {teams.map((t, i) => (
                <span key={i} style={s.teamBadge}>👥 {t}</span>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: '32px', padding: '16px', background: 'rgba(167,139,250,0.1)', borderRadius: '12px', fontSize: '16px', color: '#A78BFA' }}>
          💡 Preparatevi! Tra poco inizia l'avventura nel mondo dell'AI!
        </div>
      </div>
    </div>
  );
}
