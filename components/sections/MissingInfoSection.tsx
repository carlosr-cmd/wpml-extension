import { useState } from 'react';
import type { MissingInfoItem } from '@/lib/types';

const PRIORITY_META: Record<MissingInfoItem['priority'], { label: string; bg: string; fg: string }> = {
  high: { label: 'High', bg: '#fee2e2', fg: '#b91c1c' },
  medium: { label: 'Medium', bg: '#fef3c7', fg: '#a16207' },
  low: { label: 'Low', bg: '#e7e5e4', fg: '#57534e' },
};

export function MissingInfoSection({ items }: { items: MissingInfoItem[] }) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <p className="text-xs italic" style={{ color: 'var(--wpml-text-subtle)' }}>
        No critical missing information detected.
      </p>
    );
  }

  async function copyAsk(item: MissingInfoItem) {
    await navigator.clipboard.writeText(item.suggestedAsk);
    setCopiedKey(item.item);
    window.setTimeout(() => setCopiedKey(null), 1500);
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const priority = PRIORITY_META[item.priority];
        return (
          <li key={`${item.priority}-${item.item}`} className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium leading-snug" style={{ color: 'var(--wpml-text)' }}>
                  {item.item}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed" style={{ color: 'var(--wpml-text-muted)' }}>
                  {item.reason}
                </p>
              </div>
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
                style={{ backgroundColor: priority.bg, color: priority.fg }}
              >
                {priority.label}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <p
                className="min-w-0 flex-1 rounded-md border px-2.5 py-2 text-xs leading-relaxed"
                style={{
                  backgroundColor: 'var(--wpml-bg-subtle)',
                  borderColor: 'var(--wpml-border)',
                  color: 'var(--wpml-text)',
                }}
              >
                {item.suggestedAsk}
              </p>
              <button
                type="button"
                onClick={() => void copyAsk(item)}
                className="shrink-0 rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors"
                style={{
                  borderColor: 'var(--wpml-border-strong)',
                  color: 'var(--wpml-text)',
                  backgroundColor: 'var(--wpml-bg)',
                }}
              >
                {copiedKey === item.item ? 'Copied' : 'Copy'}
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
