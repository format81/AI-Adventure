import { useI18n } from '../i18n/I18nContext';

const LANG_LABELS = {
  it: 'IT',
  en: 'EN',
};

const s = {
  container: {
    position: 'fixed',
    top: '12px',
    right: '12px',
    zIndex: 1000,
    display: 'flex',
    gap: '4px',
    background: 'rgba(255,255,255,0.08)',
    backdropFilter: 'blur(10px)',
    borderRadius: '10px',
    padding: '4px',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  btn: {
    padding: '6px 12px',
    fontSize: '14px',
    fontWeight: 800,
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    transition: 'background 0.2s',
    minWidth: '36px',
  },
};

export default function LanguageSelector() {
  const { lang, setLang, availableLanguages } = useI18n();

  return (
    <div style={s.container}>
      {availableLanguages.map((code) => (
        <button
          key={code}
          onClick={() => setLang(code)}
          style={{
            ...s.btn,
            background: lang === code ? 'linear-gradient(135deg, #F97316, #FFE66D)' : 'transparent',
            color: lang === code ? '#1a1a2e' : 'rgba(255,255,255,0.6)',
          }}
        >
          {LANG_LABELS[code] || code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
