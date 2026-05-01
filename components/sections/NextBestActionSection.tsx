import { useState } from 'react';
import type { NextBestAction } from '@/lib/types';

const URGENCY_META: Record<NextBestAction['urgency'], { label: string; bg: string; fg: string }> = {
  low: { label: 'Low urgency', bg: '#e7e5e4', fg: '#57534e' },
  normal: { label: 'Normal urgency', bg: '#dbeafe', fg: '#1d4ed8' },
  high: { label: 'High urgency', bg: '#fee2e2', fg: '#b91c1c' },
};

export function NextBestActionSection({ data }: { data: NextBestAction }) {
  const [copied, setCopied] = useState(false);
  const urgency = URGENCY_META[data.urgency] ?? URGENCY_META.normal;

  async function copySnippet() {
    await navigator.clipboard.writeText(data.replySnippet);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-snug" style={{ color: 'var(--wpml-text)' }}>
            {data.action}
          </p>
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
            style={{ backgroundColor: urgency.bg, color: urgency.fg }}
          >
            {urgency.label}
          </span>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--wpml-text-muted)' }}>
          {data.reasoning}
        </p>
      </div>

      <div
        className="whitespace-pre-wrap rounded-md border px-3 py-2.5 text-xs leading-relaxed"
        style={{
          backgroundColor: 'var(--wpml-bg-subtle)',
          borderColor: 'var(--wpml-border)',
          color: 'var(--wpml-text)',
        }}
      >
        {data.replySnippet}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void copySnippet()}
          className="rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors"
          style={{
            borderColor: 'var(--wpml-border-strong)',
            color: 'var(--wpml-text)',
            backgroundColor: 'var(--wpml-bg)',
          }}
        >
          {copied ? 'Copied' : 'Copy snippet'}
        </button>
      </div>

      {data.alternatives.length > 0 && (
        <div>
          <div
            className="mb-1 text-[10px] font-medium uppercase tracking-wide"
            style={{ color: 'var(--wpml-text-subtle)' }}
          >
            Alternatives
          </div>
          <ul className="space-y-1.5">
            {data.alternatives.map((alternative) => (
              <li key={`${alternative.action}-${alternative.whenToUse}`} className="text-xs leading-relaxed">
                <span className="font-medium" style={{ color: 'var(--wpml-text)' }}>
                  {alternative.action}
                </span>
                <span style={{ color: 'var(--wpml-text-muted)' }}> - {alternative.whenToUse}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
