import Confetti from './Confetti';

export default function Finale({ totalPoints, totalCorrect, totalQuestions }) {
  const pct = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  let emoji, message;
  if (pct >= 80) { emoji = '🏆'; message = 'Siete dei CAMPIONI dell\'AI!'; }
  else if (pct >= 60) { emoji = '🌟'; message = 'Ottimo lavoro, esperti in formazione!'; }
  else if (pct >= 40) { emoji = '💪'; message = 'Buon inizio! L\'importante è imparare!'; }
  else { emoji = '📚'; message = 'Continuate a esplorare il mondo dell\'AI!'; }

  return (
    <div style={{ textAlign: 'center', animation: 'fadeIn 0.6s ease', padding: '24px' }}>
      <Confetti active={true} />
      <div style={{ fontSize: '96px', marginBottom: '16px' }}>{emoji}</div>
      <h1 style={{ fontSize: '36px', fontWeight: 900, marginBottom: '12px', background: 'linear-gradient(135deg, #F97316, #FFE66D)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        Avventura Completata!
      </h1>
      <p style={{ fontSize: '24px', fontWeight: 700, marginBottom: '32px' }}>{message}</p>

      <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '32px' }}>
        <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px 32px', minWidth: '140px' }}>
          <div style={{ fontSize: '36px', fontWeight: 900, color: '#FFE66D' }}>{totalPoints}</div>
          <div style={{ fontSize: '16px', color: 'rgba(255,255,255,0.6)' }}>Punti totali</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px 32px', minWidth: '140px' }}>
          <div style={{ fontSize: '36px', fontWeight: 900, color: '#4ECDC4' }}>{pct}%</div>
          <div style={{ fontSize: '16px', color: 'rgba(255,255,255,0.6)' }}>Risposte corrette</div>
        </div>
      </div>

      <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.7)', maxWidth: '500px', margin: '0 auto', lineHeight: 1.6 }}>
        Ricordate: l'AI è uno strumento potente. Usatela con intelligenza, verificate sempre le informazioni e non dimenticate di pensare con la vostra testa! 🧠✨
      </p>
    </div>
  );
}
