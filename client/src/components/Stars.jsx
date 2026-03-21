export default function Stars({ count = 0, max = 5 }) {
  return (
    <div style={{ fontSize: '28px', display: 'flex', gap: '4px', justifyContent: 'center' }}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} style={{ opacity: i < count ? 1 : 0.2 }}>⭐</span>
      ))}
    </div>
  );
}
