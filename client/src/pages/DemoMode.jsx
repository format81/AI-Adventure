import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useI18n } from '../i18n/I18nContext';
import ProgressBar from '../components/ProgressBar';
import Finale from '../components/Finale';
import Game1WhoWroteIt from '../components/games/Game1WhoWroteIt';
import Game2TrafficLight from '../components/games/Game2TrafficLight';
import Game3FakeDetective from '../components/games/Game3FakeDetective';
import Game4SuperPower from '../components/games/Game4SuperPower';

const card = { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '32px 24px', maxWidth: '720px', width: '100%', margin: '0 auto' };
const btnPrimary = { padding: '18px 36px', fontSize: '20px', fontWeight: 800, borderRadius: '16px', background: 'linear-gradient(135deg, #F97316, #FFE66D)', color: '#1a1a2e', minHeight: '56px', boxShadow: '0 4px 20px rgba(249,115,22,0.3)' };

const STAGES = ['intro', 'game1', 'game2', 'game3', 'game4', 'finale'];

export default function DemoMode() {
  const [content, setContent] = useState(null);
  const [stageIdx, setStageIdx] = useState(0);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState(null);
  const [totalPoints, setTotalPoints] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const navigate = useNavigate();
  const { t } = useI18n();

  useEffect(() => {
    apiFetch('/game/content').then(setContent).catch(() => {});
  }, []);

  if (!content) return <div style={{ textAlign: 'center', padding: '60px', fontSize: '24px' }}>⏳ {t('app.loading')}</div>;

  const stage = STAGES[stageIdx];
  const gameKey = stage.startsWith('game') ? stage : null;
  const gameData = gameKey ? content[gameKey] : null;
  const questions = gameData?.questions || [];
  const currentQ = questions[questionIdx];

  const handleAnswer = (answer) => {
    if (showResult) return;
    // Client-side validation for demo
    let correct = false;
    let explanation = '';
    let points = 0;

    if (gameKey === 'game1') {
      correct = answer === currentQ.answer;
      explanation = currentQ.explanation;
      points = correct ? gameData.pointsPerCorrect : 0;
    } else if (gameKey === 'game2') {
      correct = answer === currentQ.answer;
      explanation = currentQ.explanation;
      points = correct ? gameData.pointsPerCorrect : 0;
    } else if (gameKey === 'game3') {
      const fakeIds = currentQ.options.filter(o => o.isFake).map(o => o.id).sort();
      const answerIds = Array.isArray(answer) ? [...answer].sort() : [];
      correct = JSON.stringify(answerIds) === JSON.stringify(fakeIds);
      explanation = currentQ.explanation;
      points = correct ? gameData.pointsPerCorrect : 0;
    } else if (gameKey === 'game4') {
      correct = answer === currentQ.type;
      explanation = `${currentQ.emoji} ${currentQ.text}`;
      points = correct ? gameData.pointsPerCorrect : 0;
    }

    setResult({ correct, explanation, points });
    setShowResult(true);
    setTotalPoints(prev => prev + points);
    setTotalCorrect(prev => prev + (correct ? 1 : 0));
    setTotalQuestions(prev => prev + 1);
  };

  const handleNext = () => {
    if (showResult && questionIdx < questions.length - 1) {
      setQuestionIdx(questionIdx + 1);
      setShowResult(false);
      setResult(null);
    } else {
      setStageIdx(stageIdx + 1);
      setQuestionIdx(0);
      setShowResult(false);
      setResult(null);
    }
  };

  const canAdvance = showResult || stage === 'intro';

  // Intro screen
  if (stage === 'intro') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ ...card, textAlign: 'center', animation: 'fadeIn 0.5s ease' }}>
          <div style={{ fontSize: '72px', marginBottom: '16px' }}>🤖</div>
          <h1 style={{ fontSize: '36px', fontWeight: 900, marginBottom: '12px', background: 'linear-gradient(135deg, #F97316, #FFE66D)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {t('demo.introTitle')}
          </h1>
          <p style={{ fontSize: '20px', color: 'rgba(255,255,255,0.7)', marginBottom: '12px', lineHeight: 1.6 }}>
            {t('demo.introDesc')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px', textAlign: 'left', maxWidth: '400px', margin: '0 auto 32px' }}>
            {[content.game1, content.game2, content.game3, content.game4].map((g, i) => (
              <div key={i} style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', fontSize: '18px' }}>
                {g.emoji} {g.title}
              </div>
            ))}
          </div>
          <button onClick={handleNext} style={btnPrimary}>🚀 {t('demo.startAdventure')}</button>
        </div>
      </div>
    );
  }

  // Finale
  if (stage === 'finale') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={card}>
          <Finale totalPoints={totalPoints} totalCorrect={totalCorrect} totalQuestions={totalQuestions} />
          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <button onClick={() => navigate('/')} style={btnPrimary}>🏠 {t('demo.backHome')}</button>
          </div>
        </div>
      </div>
    );
  }

  // Game screen
  const GameComponent = { game1: Game1WhoWroteIt, game2: Game2TrafficLight, game3: Game3FakeDetective, game4: Game4SuperPower }[gameKey];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ ...card, animation: 'fadeIn 0.4s ease' }}>
        {/* Game header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '16px', color: '#A78BFA', fontWeight: 700, marginBottom: '4px' }}>
            {gameData.emoji} {gameData.title}
          </div>
          <ProgressBar current={questionIdx + 1} total={questions.length} label={t('student.questionLabel', { current: questionIdx + 1, total: questions.length })} />
          <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>{gameData.rules}</div>
        </div>

        {/* Score */}
        <div style={{ textAlign: 'center', marginBottom: '20px', fontSize: '20px', fontWeight: 800, color: '#FFE66D' }}>
          ⭐ {totalPoints} {t('app.points')}
        </div>

        {/* Game component */}
        <GameComponent question={currentQ} onAnswer={handleAnswer} showResult={showResult} result={result} />

        {/* Next button */}
        {canAdvance && stage !== 'intro' && (
          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <button onClick={handleNext} style={btnPrimary}>
              {showResult && questionIdx < questions.length - 1
                ? `➡️ ${t('demo.nextQuestion')}`
                : stageIdx < STAGES.length - 2
                  ? `🎮 ${t('demo.nextGame')}`
                  : `🏆 ${t('demo.seeResults')}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
