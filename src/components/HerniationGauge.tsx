import { useEffect, useState } from "react";

interface HerniationGaugeProps {
  risk: number; // 0-100
}

export default function HerniationGauge({ risk }: HerniationGaugeProps) {
  const [animatedRisk, setAnimatedRisk] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => setAnimatedRisk(risk), 50);
    return () => clearTimeout(timeout);
  }, [risk]);

  const radius = 70;
  const strokeWidth = 10;
  const cx = 90;
  const cy = 90;
  // Arc from 180° to 0° (bottom half = gauge)
  const startAngle = 180;
  const endAngle = 0;
  const sweepRange = 180;

  const polarToCartesian = (angle: number) => {
    const rad = (angle * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(rad),
      y: cy - radius * Math.sin(rad),
    };
  };

  const describeArc = (start: number, end: number) => {
    const s = polarToCartesian(start);
    const e = polarToCartesian(end);
    const largeArc = start - end > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${largeArc} 0 ${e.x} ${e.y}`;
  };

  const valueAngle = startAngle - (animatedRisk / 100) * sweepRange;
  const needleEnd = polarToCartesian(valueAngle);

  const color =
    risk < 30
      ? "hsl(var(--risk-low))"
      : risk < 65
      ? "hsl(var(--risk-medium))"
      : "hsl(var(--risk-high))";

  const label = risk < 30 ? "Low" : risk < 65 ? "Moderate" : "High";

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 180 110" className="w-full max-w-[220px]">
        {/* Background arc */}
        <path
          d={describeArc(startAngle, endAngle)}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Value arc */}
        {animatedRisk > 0 && (
          <path
            d={describeArc(startAngle, valueAngle)}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
            style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          />
        )}
        {/* Needle */}
        <line
          x1={cx}
          y1={cy}
          x2={needleEnd.x}
          y2={needleEnd.y}
          stroke="hsl(var(--foreground))"
          strokeWidth={2}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
        <circle cx={cx} cy={cy} r={4} fill={color} className="transition-colors duration-700" />
        {/* Labels */}
        <text x={cx} y={cy - 16} textAnchor="middle" className="fill-foreground text-lg font-mono font-bold" fontSize="22">
          {risk}%
        </text>
        <text x={cx} y={cy + 2} textAnchor="middle" fontSize="9" className="fill-muted-foreground font-mono uppercase tracking-widest">
          {label} Risk
        </text>
      </svg>
    </div>
  );
}
