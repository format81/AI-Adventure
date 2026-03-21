import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const s = {
  container: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', animation: 'fadeIn 0.5s ease' },
  card: { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '48px 32px', maxWidth: '520px', width: '100%', textAlign: 'center' },
  title: { fontSize: '42px', fontWeight: 900, marginBottom: '8px', background: 'linear-gradient(135deg, #F97316, #FFE66D)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  subtitle: { fontSize: '20px', color: 'rgba(255,255,255,0.7)', marginBottom: '36px' },
  robot: { fontSize: '72px', display: 'block', marginBottom: '16px' },
  input: { width: '100%', padding: '16px 20px', fontSize: '22px', fontWeight: 700, borderRadius: '16px', border: '2px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)', color: '#fff', textAlign: 'center', letterSpacing: '4px', textTransform: 'uppercase', outline: 'none', marginBottom: '16px' },
  btn: { width: '100%', padding: '18px', fontSize: '20px', fontWeight: 800, borderRadius: '16px', background: 'linear-gradient(135deg, #F97316, #FFE66D)', color: '#1a1a2e', minHeight: '56px', transition: 'transform 0.2s', boxShadow: '0 4px 20px rgba(249,115,22,0.3)' },
  links: { marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '16px' },
  link: { fontSize: '18px', color: 'rgba(255,255,255,0.7)', padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'block', minHeight: '56px', lineHeight: '28px' },
};

export default function Landing() {
  const [code, setCode] = useState('');
  const navigate = useNavigate();

  const handleJoin = (e) => {
    e.preventDefault();
    if (code.trim().length >= 4) {
      navigate(`/play/${code.trim().toUpperCase()}`);
    }
  };

  return (
    <div style={s.container}>
      <div style={s.card}>
        <span style={s.robot}>🤖</span>
        <h1 style={s.title}>AI Avventura</h1>
        <p style={s.subtitle}>Scopri il mondo dell'Intelligenza Artificiale!</p>

        <form onSubmit={handleJoin}>
          <input
            style={s.input}
            type="text"
            placeholder="CODICE"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
            maxLength={6}
            autoComplete="off"
          />
          <button style={{ ...s.btn, opacity: code.trim().length >= 4 ? 1 : 0.5 }} type="submit">
            🚀 Entra nell'avventura!
          </button>
        </form>

        <div style={s.links}>
          <Link to="/admin" style={s.link}>👩‍🏫 Sono un insegnante</Link>
          <Link to="/demo" style={s.link}>🎮 Modalità Demo</Link>
        </div>
      </div>
    </div>
  );
}
