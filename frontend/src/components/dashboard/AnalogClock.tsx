import { tokens } from "@fluentui/react-components";

interface AnalogClockProps {
  date: Date;
  size?: number;
}

/** Minimal SVG analog clock that reads current theme colors via tokens. */
export function AnalogClock({ date, size = 140 }: AnalogClockProps) {
  const seconds = date.getSeconds();
  const minutes = date.getMinutes() + seconds / 60;
  const hours = (date.getHours() % 12) + minutes / 60;

  const center = size / 2;
  const hourAngle = hours * 30;
  const minuteAngle = minutes * 6;
  const secondAngle = seconds * 6;

  const hand = (angleDeg: number, length: number) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return {
      x2: center + Math.cos(rad) * length,
      y2: center + Math.sin(rad) * length,
    };
  };

  const h = hand(hourAngle, size * 0.24);
  const m = hand(minuteAngle, size * 0.34);
  const s = hand(secondAngle, size * 0.38);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Analog clock">
      <circle
        cx={center}
        cy={center}
        r={center - 4}
        fill={tokens.colorNeutralBackground1}
        stroke={tokens.colorNeutralStroke2}
        strokeWidth={2}
      />
      {Array.from({ length: 12 }).map((_, i) => {
        const rad = ((i * 30 - 90) * Math.PI) / 180;
        const outer = center - 8;
        const inner = center - 14;
        return (
          <line
            key={i}
            x1={center + Math.cos(rad) * inner}
            y1={center + Math.sin(rad) * inner}
            x2={center + Math.cos(rad) * outer}
            y2={center + Math.sin(rad) * outer}
            stroke={tokens.colorNeutralForeground3}
            strokeWidth={i % 3 === 0 ? 2.5 : 1}
          />
        );
      })}
      <line
        x1={center}
        y1={center}
        x2={h.x2}
        y2={h.y2}
        stroke={tokens.colorNeutralForeground1}
        strokeWidth={4}
        strokeLinecap="round"
      />
      <line
        x1={center}
        y1={center}
        x2={m.x2}
        y2={m.y2}
        stroke={tokens.colorNeutralForeground1}
        strokeWidth={3}
        strokeLinecap="round"
      />
      <line
        x1={center}
        y1={center}
        x2={s.x2}
        y2={s.y2}
        stroke={tokens.colorBrandForeground1}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <circle cx={center} cy={center} r={4} fill={tokens.colorBrandForeground1} />
    </svg>
  );
}
