import { useState, useEffect } from 'react';
import { useI18n } from '../i18n/I18nContext';

const PODIUM_COLORS = {
  0: { bg: 'linear-gradient(135deg, #FFD700, #FFA500)', border: '#FFD700', shadow: 'rgba(255,215,0,0.4)', emoji: '🥇', label: '1' },
  1: { bg: 'linear-gradient(135deg, #C0C0C0, #A8A8A8)', border: '#C0C0C0', shadow: 'rgba(192,192,192,0.4)', emoji: '🥈', label: '2' },
  2: { bg: 'linear-gradient(135deg, #CD7F32, #B8860B)', border: '#CD7F32', shadow: 'rgba(205,127,50,0.4)', emoji: '🥉', label: '3' },
};

const CELEBRATION_EMOJIS = ['🎉', '🎊', '🌟', '⭐', '🎈', '🎀', '🦄', '🌈', '🎯', '🏅', '👑', '💫'];

function CelebrationBurst({ active }) {
  const [emojis, setEmojis] = useState([]);

  useEffect(() => {
    if (!active) { setEmojis([]); return; }
    const items = Array.from({ length: 24 }, (_, i) => ({
      id: i,
      emoji: CELEBRATION_EMOJIS[Math.floor(Math.random() * CELEBRATION_EMOJIS.length)],
      x: Math.random() * 100,
      delay: Math.random() * 0.8,
      duration: 2 + Math.random() * 2,
      size: 20 + Math.random() * 24,
      wobble: Math.random() > 0.5 ? 1 : -1,
    }));
    setEmojis(items);
    const t = setTimeout(() => setEmojis([]), 5000);
    return () => clearTimeout(t);
  }, [active]);

  if (!emojis.length) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 9999, overflow: 'hidden' }}>
      <style>{`
        @keyframes celebrationFall {
          0% { transform: translateY(-10vh) scale(0) rotate(0deg); opacity: 0; }
          15% { opacity: 1; transform: translateY(5vh) scale(1.2) rotate(90deg); }
          100% { transform: translateY(110vh) scale(0.8) rotate(720deg); opacity: 0; }
        }
        @keyframes starPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.3); }
        }
      `}</style>
      {emojis.map(p => (
        <div key={p.id} style={{
          position: 'absolute',
          left: `${p.x}%`,
          top: '-40px',
          fontSize: `${p.size}px`,
          animation: `celebrationFall ${p.duration}s ease-in ${p.delay}s forwards`,
        }}>
          {p.emoji}
        </div>
      ))}
    </div>
  );
}

export default function LeaderboardReveal({ scores, onClose }) {
  const { t } = useI18n();
  // revealStep: 0 = show 4th+, 1 = show 3rd, 2 = show 2nd, 3 = show 1st
  const [revealStep, setRevealStep] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);

  const handleNext = () => {
    if (revealStep < 3) {
      setRevealStep(revealStep + 1);
      if (revealStep + 1 === 3) {
        setShowCelebration(true);
      }
    }
  };

  if (!scores || scores.length === 0) return null;

  // Split scores: top 3 and rest
  const top3 = scores.slice(0, 3);
  const rest = scores.slice(3);

  // Which positions are visible based on revealStep
  // Step 0: 4th+ only
  // Step 1: 4th+ and 3rd
  // Step 2: 4th+ and 3rd and 2nd
  // Step 3: all (1st revealed with big celebration)
  const visibleTop3 = revealStep >= 3 ? 3 : revealStep; // number of top3 visible (from bottom)

  const btnStyle = {
    padding: '18px 48px', fontSize: '22px', fontWeight: 800, borderRadius: '16px',
    background: 'linear-gradient(135deg, #F97316, #FFE66D)', color: '#1a1a2e',
    minHeight: '60px', boxShadow: '0 4px 20px rgba(249,115,22,0.3)',
    cursor: 'pointer', border: 'none',
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
      zIndex: 10000, display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '24px', overflow: 'auto',
    }}>
      <CelebrationBurst active={showCelebration} />

      <style>{`
        @keyframes revealSlide {
          0% { transform: translateY(40px) scale(0.8); opacity: 0; }
          50% { transform: translateY(-10px) scale(1.05); }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes winnerGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(255,215,0,0.3); }
          50% { box-shadow: 0 0 60px rgba(255,215,0,0.8), 0 0 100px rgba(255,165,0,0.4); }
        }
        @keyframes crownBounce {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-12px) rotate(-5deg); }
          75% { transform: translateY(-12px) rotate(5deg); }
        }
      `}</style>

      {/* Title */}
      <h1 style={{
        fontSize: '42px', fontWeight: 900, textAlign: 'center', marginBottom: '32px',
        background: 'linear-gradient(135deg, #F97316, #FFE66D)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
      }}>
        🏆 {t('leaderboard.title')} 🏆
      </h1>

      <div style={{ maxWidth: '700px', width: '100%' }}>
        {/* Rest of teams (4th and below) — always visible */}
        {rest.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            {rest.map((sc, i) => (
              <div key={sc.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 20px', background: 'rgba(255,255,255,0.06)',
                borderRadius: '12px', marginBottom: '8px', border: '1px solid rgba(255,255,255,0.08)',
                animation: 'revealSlide 0.5s ease forwards',
                animationDelay: `${i * 0.1}s`,
              }}>
                <span style={{ fontSize: '20px', fontWeight: 700 }}>
                  {i + 4}. {sc.name}
                </span>
                <span style={{ fontSize: '22px', fontWeight: 800, color: '#FFE66D' }}>{sc.total_points} {t('app.pt')}</span>
              </div>
            ))}
          </div>
        )}

        {/* Top 3 — revealed one by one from 3rd to 1st */}
        {top3.slice(0, visibleTop3).reverse().map((sc, reverseIdx) => {
          const actualIdx = visibleTop3 - 1 - reverseIdx; // 0=1st, 1=2nd, 2=3rd
          const podium = PODIUM_COLORS[actualIdx];
          const isWinner = actualIdx === 0;

          return (
            <div key={sc.id} style={{
              padding: isWinner ? '28px 24px' : '20px 24px',
              borderRadius: '20px', marginBottom: '16px',
              background: isWinner ? 'rgba(255,215,0,0.08)' : 'rgba(255,255,255,0.06)',
              border: `3px solid ${podium.border}`,
              animation: `revealSlide 0.7s ease forwards${isWinner ? ', winnerGlow 2s ease infinite' : ''}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  fontSize: isWinner ? '56px' : '44px',
                  animation: isWinner ? 'crownBounce 2s ease infinite' : undefined,
                }}>
                  {podium.emoji}
                </div>
                <div>
                  <div style={{ fontSize: isWinner ? '32px' : '24px', fontWeight: 900, color: '#fff' }}>
                    {sc.name}
                  </div>
                  {isWinner && (
                    <div style={{ fontSize: '16px', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>
                      👑 {t('leaderboard.champion')}
                    </div>
                  )}
                </div>
              </div>
              <div style={{
                fontSize: isWinner ? '40px' : '28px', fontWeight: 900, color: '#FFE66D',
                animation: isWinner ? 'starPulse 1.5s ease infinite' : undefined,
              }}>
                {sc.total_points} {t('app.pt')}
              </div>
            </div>
          );
        })}
      </div>

      {/* Action button */}
      <div style={{ marginTop: '32px', textAlign: 'center' }}>
        {revealStep < 3 ? (
          <button onClick={handleNext} style={btnStyle}>
            {revealStep === 0 && top3.length >= 3 ? `🥉 ${t('leaderboard.reveal3rd')}` :
              revealStep === 0 && top3.length >= 2 ? `🥈 ${t('leaderboard.reveal2nd')}` :
              revealStep === 0 ? `🥇 ${t('leaderboard.reveal1st')}` :
              revealStep === 1 ? `🥈 ${t('leaderboard.reveal2nd')}` :
              `🥇 ${t('leaderboard.reveal1st')}`}
          </button>
        ) : (
          <button onClick={onClose} style={btnStyle}>
            ✅ {t('leaderboard.close')}
          </button>
        )}
      </div>
    </div>
  );
}
