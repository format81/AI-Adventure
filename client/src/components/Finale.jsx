import Confetti from './Confetti';
import { useI18n } from '../i18n/I18nContext';

export default function Finale({ totalPoints, totalCorrect, totalQuestions }) {
  const { t } = useI18n();
  const pct = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  let emoji, message;
  if (pct >= 80) { emoji = '🏆'; message = t('finale.champion'); }
  else if (pct >= 60) { emoji = '🌟'; message = t('finale.great'); }
  else if (pct >= 40) { emoji = '💪'; message = t('finale.good'); }
  else { emoji = '📚'; message = t('finale.keepGoing'); }

  return (
    <div style={{ textAlign: 'center', animation: 'fadeIn 0.6s ease', padding: '24px' }}>
      <Confetti active={true} />
      <div style={{ fontSize: '96px', marginBottom: '16px' }}>{emoji}</div>
      <h1 style={{ fontSize: '36px', fontWeight: 900, marginBottom: '12px', background: 'linear-gradient(135deg, #F97316, #FFE66D)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        {t('finale.title')}
      </h1>
      <p style={{ fontSize: '24px', fontWeight: 700, marginBottom: '32px' }}>{message}</p>

      <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '32px' }}>
        <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px 32px', minWidth: '140px' }}>
          <div style={{ fontSize: '36px', fontWeight: 900, color: '#FFE66D' }}>{totalPoints}</div>
          <div style={{ fontSize: '16px', color: 'rgba(255,255,255,0.6)' }}>{t('finale.totalPoints')}</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px 32px', minWidth: '140px' }}>
          <div style={{ fontSize: '36px', fontWeight: 900, color: '#4ECDC4' }}>{pct}%</div>
          <div style={{ fontSize: '16px', color: 'rgba(255,255,255,0.6)' }}>{t('finale.correctAnswers')}</div>
        </div>
      </div>

      <div style={{
        margin: '0 auto 24px', padding: '20px 24px', borderRadius: '16px', maxWidth: '500px',
        background: 'linear-gradient(135deg, rgba(249,115,22,0.15), rgba(255,230,109,0.15))',
        border: '2px solid rgba(249,115,22,0.3)',
      }}>
        <p style={{ fontSize: '24px', fontWeight: 900, lineHeight: 1.4, background: 'linear-gradient(135deg, #F97316, #FFE66D)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {t('finale.slogan')}
        </p>
      </div>

      <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.7)', maxWidth: '500px', margin: '0 auto', lineHeight: 1.6 }}>
        {t('finale.closingMessage')} 🧠✨
      </p>
    </div>
  );
}
