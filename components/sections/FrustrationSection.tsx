import type { FrustrationAnalysis } from '@/lib/types';
import { frustrationColor, frustrationTextColor } from '@/lib/colors';

interface Props {
  data: FrustrationAnalysis;
}

export function FrustrationSection({ data }: Props) {
  const bg = frustrationColor(data.score);
  const fg = frustrationTextColor();

  return (
    <div className="flex items-start gap-3">
      <div
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-xl font-semibold tabular-nums shadow-sm"
        style={{ backgroundColor: bg, color: fg }}
        aria-label={`Frustration score ${data.score} out of 10`}
      >
        {data.score}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium" style={{ color: 'var(--wpml-text)' }}>
          {data.label}
        </div>
        <p
          className="mt-0.5 text-xs leading-relaxed"
          style={{ color: 'var(--wpml-text-muted)' }}
        >
          {data.reasoning}
        </p>
      </div>
    </div>
  );
}
