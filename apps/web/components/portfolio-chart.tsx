import type { PortfolioSnapshot } from "@cardboard/contracts";

export function PortfolioChart({
  snapshots,
}: {
  snapshots: PortfolioSnapshot[];
}) {
  if (snapshots.length < 2) {
    return (
      <div className="empty-state">
        Your value history will appear after two daily snapshots.
      </div>
    );
  }

  const width = 800;
  const height = 260;
  const values = snapshots.map((point) => point.marketValueCents);
  const min = Math.min(...values) * 0.96;
  const max = Math.max(...values) * 1.04;
  const range = Math.max(1, max - min);
  const points = snapshots
    .map((point, index) => {
      const x = (index / (snapshots.length - 1)) * width;
      const y = height - ((point.marketValueCents - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");
  const area = `0,${height} ${points} ${width},${height}`;

  return (
    <div
      className="chart"
      role="img"
      aria-label={`Portfolio value changed from ${money(values[0] ?? 0)} to ${money(values.at(-1) ?? 0)} across ${snapshots.length} daily snapshots`}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a7f46b" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#a7f46b" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((ratio) => (
          <line
            key={ratio}
            x1="0"
            x2={width}
            y1={height * ratio}
            y2={height * ratio}
            stroke="#29313a"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <polygon points={area} fill="url(#chart-fill)" />
        <polyline
          points={points}
          fill="none"
          stroke="#a7f46b"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}

function money(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}
