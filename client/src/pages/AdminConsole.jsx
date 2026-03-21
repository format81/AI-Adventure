import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import { useSSE } from '../hooks/useSSE';

const card = { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '24px' };
const btnPrimary = { padding: '16px 28px', fontSize: '18px', fontWeight: 800, borderRadius: '16px', background: 'linear-gradient(135deg, #F97316, #FFE66D)', color: '#1a1a2e', minHeight: '56px', boxShadow: '0 4px 20px rgba(249,115,22,0.3)' };
const btnSecondary = { padding: '14px 24px', fontSize: '16px', fontWeight: 700, borderRadius: '12px', background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', minHeight: '48px' };
const btnDanger = { ...btnSecondary, borderColor: '#FF6B6B', color: '#FF6B6B' };
const inputStyle = { width: '100%', padding: '14px 18px', fontSize: '18px', fontWeight: 600, borderRadius: '12px', border: '2px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)', color: '#fff', outline: 'none' };

const statusColors = { lobby: '#A78BFA', active: '#4ECDC4', paused: '#FFE66D', completed: 'rgba(255,255,255,0.4)' };
const statusLabels = { lobby: '🔵 In attesa', active: '🟢 Attiva', paused: '🟡 In pausa', completed: '⚪ Completata' };

const STAGES = ['intro', 'game1', 'game2', 'game3', 'game4', 'finale'];

export default function AdminConsole() {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [content, setContent] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [teams, setTeams] = useState([]);
  const [scores, setScores] = useState([]);
  const [responseCount, setResponseCount] = useState(0);
  const [results, setResults] = useState(null);

  const loadSessions = useCallback(() => {
    apiFetch('/sessions').then(setSessions).catch(() => {});
  }, []);

  const loadSession = useCallback((id) => {
    apiFetch(`/sessions/${id}`).then(data => {
      setSelected(data);
      setTeams(data.teams || []);
      setScores(data.scores || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    loadSessions();
    apiFetch('/game/content').then(setContent).catch(() => {});
  }, []);

  // SSE for live updates
  useSSE(selected?.id, {
    onTeamJoined: (data) => {
      setTeams(prev => {
        if (prev.find(t => t.name === data.teamName)) return prev;
        return [...prev, { name: data.teamName, id: 'new-' + Date.now() }];
      });
    },
    onResponseReceived: (data) => {
      setResponseCount(data.responseCount);
      if (selected?.id) {
        apiFetch(`/game/${selected.id}/scores`).then(setScores).catch(() => {});
      }
    },
  });

  const createSession = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await apiFetch('/sessions', { method: 'POST', body: JSON.stringify({ name: newName.trim() }) });
      setNewName('');
      setShowCreate(false);
      loadSessions();
    } catch { /* ignore */ }
    setCreating(false);
  };

  const startSession = async () => {
    if (!selected) return;
    await apiFetch(`/sessions/${selected.id}/start`, { method: 'POST' });
    loadSession(selected.id);
    loadSessions();
  };

  const advanceSession = async (stage, questionIndex) => {
    if (!selected) return;
    await apiFetch(`/sessions/${selected.id}/advance`, {
      method: 'POST',
      body: JSON.stringify({ stage, questionIndex }),
    });
    loadSession(selected.id);
  };

  const pauseSession = async () => {
    if (!selected) return;
    await apiFetch(`/sessions/${selected.id}/pause`, { method: 'POST' });
    loadSession(selected.id);
    loadSessions();
  };

  const completeSession = async () => {
    if (!selected) return;
    await apiFetch(`/sessions/${selected.id}/complete`, { method: 'POST' });
    loadSession(selected.id);
    loadSessions();
  };

  const deleteSession = async (id) => {
    if (!confirm('Eliminare questa sessione e tutti i dati associati?')) return;
    await apiFetch(`/sessions/${id}`, { method: 'DELETE' });
    if (selected?.id === id) setSelected(null);
    loadSessions();
  };

  const loadResults = async (id) => {
    const data = await apiFetch(`/results/${id}`);
    setResults(data);
  };

  const downloadCSV = async (id) => {
    const token = auth.token;
    const res = await fetch(`/api/results/${id}/csv`, { headers: { Authorization: `Bearer ${token}` } });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `risultati.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLogout = () => { logout(); navigate('/'); };

  // Compute next advance action
  const getNextAction = () => {
    if (!selected || !content) return null;
    const { current_stage, current_question } = selected;
    const stageIdx = STAGES.indexOf(current_stage);

    if (current_stage === 'intro') {
      return { label: '🎮 Avvia Gioco 1', stage: 'game1', questionIndex: 0 };
    }

    if (current_stage.startsWith('game')) {
      const gameData = content[current_stage];
      if (gameData && current_question < gameData.questions.length - 1) {
        return { label: '➡️ Prossima domanda', stage: current_stage, questionIndex: current_question + 1 };
      }
      // Next game or finale
      if (stageIdx < STAGES.length - 1) {
        const nextStage = STAGES[stageIdx + 1];
        const label = nextStage === 'finale' ? '🏆 Vai al Finale' : `🎮 Vai a ${content[nextStage]?.title || nextStage}`;
        return { label, stage: nextStage, questionIndex: 0 };
      }
    }
    return null;
  };

  // Session list view
  if (!selected) {
    return (
      <div style={{ minHeight: '100vh', padding: '24px', maxWidth: '800px', margin: '0 auto', animation: 'fadeIn 0.4s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 900 }}>👩‍🏫 Console Insegnante</h1>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={() => setShowCreate(true)} style={btnPrimary}>➕ Nuova Sessione</button>
            <button onClick={handleLogout} style={btnSecondary}>🚪 Esci</button>
          </div>
        </div>

        {showCreate && (
          <div style={{ ...card, marginBottom: '24px', animation: 'fadeIn 0.3s ease' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '16px' }}>Crea nuova sessione</h3>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <input style={{ ...inputStyle, flex: 1, minWidth: '200px' }} placeholder="Es. Classe 4B - Scuola Verdi" value={newName} onChange={(e) => setNewName(e.target.value)} />
              <button onClick={createSession} disabled={creating || !newName.trim()} style={{ ...btnPrimary, opacity: creating || !newName.trim() ? 0.5 : 1 }}>
                {creating ? '⏳' : '✅ Crea'}
              </button>
              <button onClick={() => setShowCreate(false)} style={btnSecondary}>❌ Annulla</button>
            </div>
          </div>
        )}

        {sessions.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', padding: '60px 24px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
            <p style={{ fontSize: '20px', color: 'rgba(255,255,255,0.6)' }}>Nessuna sessione. Crea la prima!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {sessions.map(s => (
              <div key={s.id} style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', cursor: 'pointer' }}
                onClick={() => { setSelected(s); loadSession(s.id); }}>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: 800, marginBottom: '4px' }}>{s.name}</div>
                  <div style={{ fontSize: '16px', color: 'rgba(255,255,255,0.5)' }}>
                    Codice: <strong style={{ color: '#FFE66D', letterSpacing: '2px' }}>{s.code}</strong> · {s.team_count} squadre · {s.created_at?.slice(0, 10)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '14px', fontWeight: 700, background: `${statusColors[s.status]}22`, color: statusColors[s.status] }}>
                    {statusLabels[s.status]}
                  </span>
                  <button onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }} style={{ ...btnDanger, padding: '8px 14px', minHeight: '40px', fontSize: '14px' }}>
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Session detail view
  const nextAction = getNextAction();
  const gameData = selected.current_stage?.startsWith('game') && content ? content[selected.current_stage] : null;
  const currentQ = gameData?.questions?.[selected.current_question];

  return (
    <div style={{ minHeight: '100vh', padding: '24px', maxWidth: '900px', margin: '0 auto', animation: 'fadeIn 0.4s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <button onClick={() => { setSelected(null); setResults(null); loadSessions(); }} style={btnSecondary}>← Torna alla lista</button>
        <span style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '16px', fontWeight: 700, background: `${statusColors[selected.status]}22`, color: statusColors[selected.status] }}>
          {statusLabels[selected.status]}
        </span>
      </div>

      {/* Session info */}
      <div style={{ ...card, marginBottom: '24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 900, marginBottom: '8px' }}>{selected.name}</h2>
        <div style={{ fontSize: '36px', fontWeight: 900, color: '#FFE66D', letterSpacing: '6px', marginBottom: '8px' }}>{selected.code}</div>
        <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.5)' }}>Condividi questo codice con la classe</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        {/* Control panel */}
        <div style={card}>
          <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '16px' }}>🎮 Controllo</h3>

          {selected.status === 'lobby' && (
            <>
              <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.6)', marginBottom: '16px' }}>
                {teams.length} squadre collegate
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
                {teams.map((t, i) => (
                  <span key={i} style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '14px' }}>👥 {t.name}</span>
                ))}
              </div>
              <button onClick={startSession} style={{ ...btnPrimary, width: '100%' }} disabled={teams.length === 0}>
                🚀 AVVIA SESSIONE
              </button>
            </>
          )}

          {selected.status === 'active' && (
            <>
              <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px' }}>
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Stage corrente</div>
                <div style={{ fontSize: '18px', fontWeight: 800 }}>
                  {selected.current_stage === 'intro' ? '🏁 Introduzione' :
                    selected.current_stage === 'finale' ? '🏆 Finale' :
                      gameData ? `${gameData.emoji} ${gameData.title}` : selected.current_stage}
                </div>
                {gameData && (
                  <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                    Domanda {selected.current_question + 1} di {gameData.questions.length}
                  </div>
                )}
              </div>

              {currentQ && (
                <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(167,139,250,0.08)', borderRadius: '12px', fontSize: '16px' }}>
                  📝 {currentQ.text || currentQ.scenario || currentQ.claim}
                </div>
              )}

              <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginBottom: '16px' }}>
                📊 Risposte ricevute: {responseCount}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {nextAction && (
                  <button onClick={() => advanceSession(nextAction.stage, nextAction.questionIndex)} style={{ ...btnPrimary, width: '100%' }}>
                    {nextAction.label}
                  </button>
                )}
                {selected.current_stage === 'finale' && (
                  <button onClick={completeSession} style={{ ...btnPrimary, width: '100%' }}>
                    ✅ Completa Sessione
                  </button>
                )}
                <button onClick={pauseSession} style={{ ...btnSecondary, width: '100%' }}>⏸️ Metti in pausa</button>
              </div>
            </>
          )}

          {selected.status === 'paused' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button onClick={startSession} style={{ ...btnPrimary, width: '100%' }}>▶️ Riprendi</button>
            </div>
          )}

          {selected.status === 'completed' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🏆</div>
              <p style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Sessione completata!</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button onClick={() => loadResults(selected.id)} style={{ ...btnPrimary, width: '100%' }}>📊 Vedi Risultati</button>
                <button onClick={() => downloadCSV(selected.id)} style={{ ...btnSecondary, width: '100%' }}>📥 Esporta CSV</button>
              </div>
            </div>
          )}
        </div>

        {/* Scoreboard */}
        <div style={card}>
          <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '16px' }}>🏆 Classifica</h3>
          {scores.length === 0 ? (
            <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>Nessun punteggio ancora</p>
          ) : (
            scores.map((sc, i) => (
              <div key={sc.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 16px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', marginBottom: '8px',
              }}>
                <span style={{ fontSize: '16px', fontWeight: 700 }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`} {sc.name}
                </span>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '18px', fontWeight: 800, color: '#FFE66D' }}>{sc.total_points}</span>
                  <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', marginLeft: '4px' }}>pt</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Results panel */}
      {results && (
        <div style={{ ...card, marginTop: '24px', animation: 'fadeIn 0.3s ease' }}>
          <h3 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '20px' }}>📊 Risultati Dettagliati</h3>

          {results.gameStats && results.gameStats.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>Percentuale risposte corrette per gioco</h4>
              {results.gameStats.map(gs => {
                const pct = gs.total > 0 ? Math.round((gs.correct_count / gs.total) * 100) : 0;
                const gameInfo = content?.[gs.game];
                return (
                  <div key={gs.game} style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '16px' }}>
                      <span>{gameInfo?.emoji} {gameInfo?.title || gs.game}</span>
                      <span style={{ fontWeight: 800, color: '#4ECDC4' }}>{pct}%</span>
                    </div>
                    <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.1)', borderRadius: '5px' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: '#4ECDC4', borderRadius: '5px', transition: 'width 0.4s' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <button onClick={() => downloadCSV(selected.id)} style={{ ...btnPrimary, width: '100%' }}>📥 Scarica CSV completo</button>
        </div>
      )}
    </div>
  );
}
