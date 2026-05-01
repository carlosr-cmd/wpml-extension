import { useState } from 'react';
import type { SuggestedReply } from '@/lib/types';

const CONFIDENCE_META: Record<SuggestedReply['confidence'], { label: string; bg: string; fg: string }> = {
  high: { label: 'High confidence', bg: '#ccfbf1', fg: '#0f766e' },
  medium: { label: 'Medium confidence', bg: '#fef3c7', fg: '#a16207' },
  low: { label: 'Low confidence', bg: '#fee2e2', fg: '#b91c1c' },
};

export function SuggestedReplySection({ data }: { data: SuggestedReply }) {
  const [copied, setCopied] = useState(false);
  const confidence = CONFIDENCE_META[data.confidence] ?? CONFIDENCE_META.low;

  async function copyReply() {
    await navigator.clipboard.writeText(data.body);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-3">
      <div
        className="whitespace-pre-wrap rounded-md border px-3 py-2.5 text-xs leading-relaxed"
        style={{
          backgroundColor: 'var(--wpml-bg-subtle)',
          borderColor: 'var(--wpml-border)',
          color: 'var(--wpml-text)',
        }}
      >
        {data.body}
      </div>

      <div className="flex items-center justify-between gap-2">
        <span
          className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
          style={{ backgroundColor: confidence.bg, color: confidence.fg }}
          title={data.confidenceReasoning}
        >
          {confidence.label}
        </span>
        <button
          type="button"
          onClick={() => void copyReply()}
          className="rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors"
          style={{
            borderColor: 'var(--wpml-border-strong)',
            color: 'var(--wpml-text)',
            backgroundColor: 'var(--wpml-bg)',
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      {data.sources.length > 0 && (
        <div>
          <div
            className="mb-1 text-[10px] font-medium uppercase tracking-wide"
            style={{ color: 'var(--wpml-text-subtle)' }}
          >
            Sources
          </div>
          <ul className="flex flex-wrap gap-1.5">
            {data.sources.map((source, index) => (
              <li key={`${source.url ?? source.type}-${index}`}>
                {source.url ? (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block max-w-[180px] truncate rounded-md border px-2 py-0.5 text-[10px] hover:underline"
                    style={{ borderColor: 'var(--wpml-border)', color: 'var(--wpml-accent)' }}
                    title={source.title}
                  >
                    {source.title}
                  </a>
                ) : (
                  <span
                    className="inline-block max-w-[180px] truncate rounded-md border px-2 py-0.5 text-[10px]"
                    style={{ borderColor: 'var(--wpml-border)', color: 'var(--wpml-text-subtle)' }}
                    title={source.title}
                  >
                    {source.title}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
