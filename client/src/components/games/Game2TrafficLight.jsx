import { useState } from 'react';
import Confetti from '../Confetti';
import { useI18n } from '../../i18n/I18nContext';

const btnBase = {
  width: '100%', padding: '20px 24px', fontSize: '20px', fontWeight: 800,
  borderRadius: '16px', minHeight: '64px', transition: 'transform 0.2s',
  textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
};

export default function Game2TrafficLight({ question, onAnswer, showResult, result }) {
  const [selected, setSelected] = useState(null);
  const { t } = useI18n();

  const colors = {
    verde: { bg: 'rgba(78,205,196,0.15)', border: '#4ECDC4', label: `🟢 ${t('game2.green')}` },
    giallo: { bg: 'rgba(255,230,109,0.15)', border: '#FFE66D', label: `🟡 ${t('game2.yellow')}` },
    rosso: { bg: 'rgba(255,107,107,0.15)', border: '#FF6B6B', label: `🔴 ${t('game2.red')}` },
  };

  const handleSelect = (answer) => {
    if (showResult) return;
    setSelected(answer);
    onAnswer(answer);
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <Confetti active={showResult && result?.correct} />
      <div style={{
        background: showResult ? (result?.correct ? 'rgba(78,205,196,0.15)' : 'rgba(255,107,107,0.15)') : 'rgba(255,255,255,0.06)',
        border: `2px solid ${showResult ? (result?.correct ? '#4ECDC4' : '#FF6B6B') : 'rgba(255,255,255,0.1)'}`,
        borderRadius: '20px', padding: '28px 24px', marginBottom: '24px',
        animation: showResult && !result?.correct ? 'shake 0.5s ease' : undefined,
      }}>
        <p style={{ fontSize: '22px', fontWeight: 700, lineHeight: 1.5 }}>
          🚦 {question.scenario}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {Object.entries(colors).map(([key, c]) => {
          const isSelected = selected === key;
          const isCorrect = showResult && key === question.answer;
          let bg = 'rgba(255,255,255,0.08)';
          let border = '2px solid rgba(255,255,255,0.15)';
          if (showResult) {
            if (isCorrect) { bg = c.bg; border = `2px solid ${c.border}`; }
            else if (isSelected && !result?.correct) { bg = 'rgba(255,107,107,0.2)'; border = '2px solid #FF6B6B'; }
          } else if (isSelected) {
            bg = c.bg; border = `2px solid ${c.border}`;
          }
          return (
            <button key={key} onClick={() => handleSelect(key)} disabled={showResult}
              style={{ ...btnBase, background: bg, border, color: '#fff', opacity: showResult && !isCorrect && !isSelected ? 0.5 : 1 }}>
              {c.label}
            </button>
          );
        })}
      </div>

      {showResult && (
        <div style={{
          marginTop: '20px', padding: '20px', borderRadius: '16px',
          background: result?.correct ? 'rgba(78,205,196,0.1)' : 'rgba(255,107,107,0.1)',
          animation: 'fadeIn 0.3s ease',
        }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>{result?.correct ? '✅' : '❌'}</div>
          <p style={{ fontSize: '18px', lineHeight: 1.5 }}>{result?.explanation}</p>
          {result?.points > 0 && <p style={{ fontSize: '20px', fontWeight: 800, color: '#FFE66D', marginTop: '8px' }}>+{result.points} {t('app.points')}{result.timeBonus > 0 ? ` (⚡+${result.timeBonus} ${t('finale.speedBonus')})` : ''} 🎉</p>}
        </div>
      )}
    </div>
  );
}
