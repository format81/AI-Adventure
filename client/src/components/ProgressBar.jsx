export default function ProgressBar({ current, total, label }) {
  const pct = total > 0 ? (current / total) * 100 : 0;
  return (
    <div style={{ marginBottom: '24px' }}>
      {label && <div style={{ fontSize: '16px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px', textAlign: 'center' }}>{label}</div>}
      <div style={{ width: '100%', height: '12px', background: 'rgba(255,255,255,0.1)', borderRadius: '6px', overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          background: 'linear-gradient(90deg, #F97316, #FFE66D)',
          borderRadius: '6px',
          transition: 'width 0.4s ease',
        }} />
      </div>
    </div>
  );
}
