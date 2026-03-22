import { useState } from 'react';
import Confetti from '../Confetti';
import { useI18n } from '../../i18n/I18nContext';

const btnBase = {
  width: '100%', padding: '18px 20px', fontSize: '18px', fontWeight: 700,
  borderRadius: '16px', minHeight: '56px', transition: 'transform 0.2s',
  textAlign: 'left', color: '#fff',
};

export default function Game3FakeDetective({ question, onAnswer, showResult, result }) {
  const [selected, setSelected] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const { t } = useI18n();

  const toggleOption = (id) => {
    if (showResult || submitted) return;
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 2 ? [...prev, id] : prev
    );
  };

  const handleSubmit = () => {
    if (selected.length !== 2 || submitted) return;
    setSubmitted(true);
    onAnswer(selected.sort());
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <Confetti active={showResult && result?.correct} />
      <div style={{
        background: showResult ? (result?.correct ? 'rgba(78,205,196,0.15)' : 'rgba(255,107,107,0.15)') : 'rgba(255,255,255,0.06)',
        border: `2px solid ${showResult ? (result?.correct ? '#4ECDC4' : '#FF6B6B') : 'rgba(255,255,255,0.1)'}`,
        borderRadius: '20px', padding: '28px 24px', marginBottom: '16px',
        animation: showResult && !result?.correct ? 'shake 0.5s ease' : undefined,
      }}>
        <div style={{ fontSize: '16px', color: '#FFE66D', fontWeight: 700, marginBottom: '8px' }}>📰 {t('game3.newsLabel')}</div>
        <p style={{ fontSize: '22px', fontWeight: 700, lineHeight: 1.5 }}>
          "{question.claim}"
        </p>
      </div>

      <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.6)', marginBottom: '16px', textAlign: 'center' }}>
        🔎 {t('game3.selectClues', { count: selected.length })}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
        {question.options.map(opt => {
          const isSelected = selected.includes(opt.id);
          const isFake = opt.isFake;
          let bg = 'rgba(255,255,255,0.08)';
          let border = '2px solid rgba(255,255,255,0.15)';
          if (showResult) {
            if (isFake) { bg = 'rgba(78,205,196,0.2)'; border = '2px solid #4ECDC4'; }
            else if (isSelected && !isFake) { bg = 'rgba(255,107,107,0.2)'; border = '2px solid #FF6B6B'; }
          } else if (isSelected) {
            bg = 'rgba(167,139,250,0.2)'; border = '2px solid #A78BFA';
          }
          return (
            <button key={opt.id} onClick={() => toggleOption(opt.id)} disabled={showResult}
              style={{ ...btnBase, background: bg, border, opacity: showResult && !isFake && !isSelected ? 0.5 : 1 }}>
              {showResult && isFake && '✅ '}{showResult && isSelected && !isFake && '❌ '}{opt.text}
            </button>
          );
        })}
      </div>

      {!showResult && !submitted && (
        <button onClick={handleSubmit} disabled={selected.length !== 2}
          style={{
            width: '100%', padding: '18px', fontSize: '20px', fontWeight: 800, borderRadius: '16px',
            background: selected.length === 2 ? 'linear-gradient(135deg, #F97316, #FFE66D)' : 'rgba(255,255,255,0.1)',
            color: selected.length === 2 ? '#1a1a2e' : 'rgba(255,255,255,0.3)',
            minHeight: '56px', boxShadow: selected.length === 2 ? '0 4px 20px rgba(249,115,22,0.3)' : 'none',
          }}>
          🔍 {t('game3.confirmClues')}
        </button>
      )}

      {showResult && (
        <div style={{
          marginTop: '8px', padding: '20px', borderRadius: '16px',
          background: result?.correct ? 'rgba(78,205,196,0.1)' : 'rgba(255,107,107,0.1)',
          animation: 'fadeIn 0.3s ease',
        }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>{result?.correct ? '✅' : '❌'}</div>
          <p style={{ fontSize: '18px', lineHeight: 1.5 }}>{result?.explanation}</p>
          {result?.points > 0 && <p style={{ fontSize: '20px', fontWeight: 800, color: '#FFE66D', marginTop: '8px' }}>+{result.points} {t('app.points')}! 🎉</p>}
        </div>
      )}
    </div>
  );
}
