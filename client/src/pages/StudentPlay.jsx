import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSSE } from '../hooks/useSSE';
import { apiFetch } from '../lib/api';
import { useI18n } from '../i18n/I18nContext';
import ProgressBar from '../components/ProgressBar';
import Finale from '../components/Finale';
import Game1WhoWroteIt from '../components/games/Game1WhoWroteIt';
import Game2TrafficLight from '../components/games/Game2TrafficLight';
import Game3FakeDetective from '../components/games/Game3FakeDetective';
import Game4SuperPower from '../components/games/Game4SuperPower';

const card = { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '32px 24px', maxWidth: '720px', width: '100%', margin: '0 auto' };

const GAME_COMPONENTS = {
  game1: Game1WhoWroteIt,
  game2: Game2TrafficLight,
  game3: Game3FakeDetective,
  game4: Game4SuperPower,
};

export default function StudentPlay() {
  const { sessionCode } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [content, setContent] = useState(null);
  const [stage, setStage] = useState('intro');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [status, setStatus] = useState('active');
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState(null);
  const [totalPoints, setTotalPoints] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [waitingForNext, setWaitingForNext] = useState(false);
  const [scores, setScores] = useState([]);

  const teamInfo = (() => {
    try { return JSON.parse(sessionStorage.getItem('ai-avventura-team')); } catch { return null; }
  })();

  useEffect(() => {
    if (!teamInfo) { navigate(`/play/${sessionCode}`, { replace: true }); return; }
    apiFetch('/game/content').then(setContent).catch(() => {});
    apiFetch(`/game/${teamInfo.sessionId}/state`).then(state => {
      setStage(state.stage);
      setQuestionIndex(state.questionIndex);
      setStatus(state.status);
    }).catch(() => {});
  }, []);

  const refreshScores = useCallback(() => {
    if (!teamInfo) return;
    apiFetch(`/game/${teamInfo.sessionId}/scores`).then(setScores).catch(() => {});
  }, [teamInfo?.sessionId]);

  // SSE handlers
  useSSE(teamInfo?.sessionId, {
    onStageChange: (data) => {
      setStage(data.stage);
      setQuestionIndex(data.questionIndex);
      setShowResult(false);
      setResult(null);
      setWaitingForNext(false);
      refreshScores();
    },
    onSessionPause: () => setStatus('paused'),
    onSessionStart: () => setStatus('active'),
    onSessionComplete: () => {
      setStatus('completed');
      refreshScores();
    },
  });

  if (!teamInfo) return null;
  if (!content) return <div style={{ textAlign: 'center', padding: '60px', fontSize: '24px' }}>⏳ {t('app.loading')}</div>;

  // Paused screen
  if (status === 'paused') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ ...card, textAlign: 'center' }}>
          <div style={{ fontSize: '72px', marginBottom: '16px' }}>⏸️</div>
          <h1 style={{ fontSize: '32px', fontWeight: 900, marginBottom: '12px' }}>{t('student.paused')}</h1>
          <p style={{ fontSize: '20px', color: 'rgba(255,255,255,0.6)' }}>{t('student.pausedMsg')}</p>
        </div>
      </div>
    );
  }

  // Completed / finale
  if (status === 'completed' || stage === 'finale') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={card}>
          <Finale totalPoints={totalPoints} totalCorrect={totalCorrect} totalQuestions={totalQuestions} />
          {scores.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <h3 style={{ fontSize: '22px', fontWeight: 800, textAlign: 'center', marginBottom: '16px' }}>🏆 {t('admin.scoreboard')}</h3>
              {scores.map((sc, i) => (
                <div key={sc.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 16px', background: sc.id === teamInfo.teamId ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.04)',
                  borderRadius: '12px', marginBottom: '8px', border: sc.id === teamInfo.teamId ? '2px solid #F97316' : '1px solid rgba(255,255,255,0.05)',
                }}>
                  <span style={{ fontSize: '18px', fontWeight: 700 }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`} {sc.name}
                  </span>
                  <span style={{ fontSize: '20px', fontWeight: 800, color: '#FFE66D' }}>{sc.total_points} {t('app.pt')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Intro / waiting for game
  if (stage === 'intro' || !stage.startsWith('game')) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ ...card, textAlign: 'center', animation: 'fadeIn 0.5s ease' }}>
          <div style={{ fontSize: '72px', marginBottom: '16px', animation: 'bounce 2s ease infinite' }}>🤖</div>
          <h1 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '12px' }}>{t('student.readyTitle')}</h1>
          <p style={{ fontSize: '20px', color: 'rgba(255,255,255,0.6)' }}>
            {t('app.team')}: <strong style={{ color: '#FFE66D' }}>{teamInfo.teamName}</strong>
          </p>
          <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.5)', marginTop: '16px' }}>
            {t('student.teacherPreparing')}
          </p>
        </div>
      </div>
    );
  }

  // Game screen
  const gameKey = stage;
  const gameData = content[gameKey];
  if (!gameData) return <div style={{ textAlign: 'center', padding: '60px' }}>{t('student.gameNotFound')}</div>;

  const questions = gameData.questions;
  const currentQ = questions[questionIndex];
  if (!currentQ) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ ...card, textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <p style={{ fontSize: '22px', fontWeight: 700 }}>{t('student.waitingNextQ')}</p>
        </div>
      </div>
    );
  }

  const GameComponent = GAME_COMPONENTS[gameKey];

  const handleAnswer = async (answer) => {
    if (showResult) return;
    try {
      const res = await apiFetch('/game/respond', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: teamInfo.sessionId,
          teamId: teamInfo.teamId,
          game: gameKey,
          questionIndex,
          answer,
        }),
      });
      setResult(res);
      setShowResult(true);
      setTotalPoints(prev => prev + (res.points || 0));
      setTotalCorrect(prev => prev + (res.correct ? 1 : 0));
      setTotalQuestions(prev => prev + 1);
      setWaitingForNext(true);
    } catch (err) {
      // Duplicate response — show as already answered
      if (err.message.includes('already') || err.message.includes('già')) {
        setWaitingForNext(true);
      }
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ ...card, animation: 'fadeIn 0.4s ease' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '16px', color: '#A78BFA', fontWeight: 700, marginBottom: '4px' }}>
            {gameData.emoji} {gameData.title}
          </div>
          <ProgressBar current={questionIndex + 1} total={questions.length} label={t('student.questionLabel', { current: questionIndex + 1, total: questions.length })} />
        </div>

        <div style={{ textAlign: 'center', marginBottom: '20px', fontSize: '20px', fontWeight: 800, color: '#FFE66D' }}>
          ⭐ {totalPoints} {t('app.points')} — 👥 {teamInfo.teamName}
        </div>

        <GameComponent question={currentQ} onAnswer={handleAnswer} showResult={showResult} result={result} />

        {waitingForNext && (
          <div style={{ textAlign: 'center', marginTop: '20px', padding: '16px', background: 'rgba(167,139,250,0.1)', borderRadius: '12px', fontSize: '18px', color: '#A78BFA' }}>
            ⏳ {t('student.waitTeacher')}
          </div>
        )}
      </div>
    </div>
  );
}
