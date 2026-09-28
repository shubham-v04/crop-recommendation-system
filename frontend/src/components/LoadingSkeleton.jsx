export default function LoadingSkeleton() {
  return (
    <div className="result-card skeleton-card" aria-live="polite" aria-busy="true">
      <div className="skeleton-line skeleton-label" />
      <div className="skeleton-line skeleton-title" />
      <div className="skeleton-line skeleton-sub" />
      <div className="skeleton-bars">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton-line skeleton-bar" />
        ))}
      </div>
    </div>
  );
}
