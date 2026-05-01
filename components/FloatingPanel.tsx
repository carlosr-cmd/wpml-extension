import { useState } from 'react';
import { browser } from 'wxt/browser';
import { AccordionSection } from './AccordionSection';
import { FrustrationSection } from './sections/FrustrationSection';
import { ErrataSection } from './sections/ErrataSection';
import { SimilarTicketsSection } from './sections/SimilarTicketsSection';
import { SuggestedReplySection } from './sections/SuggestedReplySection';
import { MissingInfoSection } from './sections/MissingInfoSection';
import { NextBestActionSection } from './sections/NextBestActionSection';
import { frustrationColor } from '@/lib/colors';
import { useTicketAnalysis } from '@/lib/useTicketAnalysis';

export function FloatingPanel() {
  const [expanded, setExpanded] = useState(false);
  const state = useTicketAnalysis();
  const score = state.result?.frustration.score ?? null;

  if (!expanded) {
    return <CollapsedIcon score={score} onClick={() => setExpanded(true)} />;
  }

  return (
    <div
      className="wpml-panel fixed bottom-5 right-5 z-[2147483647] flex flex-col rounded-xl border bg-white"
      style={{
        width: 400,
        height: 600,
        resize: 'both',
        overflow: 'hidden',
        minWidth: 340,
        minHeight: 420,
        borderColor: 'var(--wpml-border)',
        boxShadow: 'var(--wpml-shadow)',
      }}
      role="dialog"
      aria-label="WPML Support Assistant"
    >
      <Header
        onCollapse={() => setExpanded(false)}
        onAnalyze={() => void state.analyze(true)}
        busy={state.phase === 'scraping' || state.phase === 'analyzing'}
      />
      <StatusLine state={state} />
      <div className="wpml-scroll flex-1 overflow-y-auto">
        <>
          {state.phase === 'error' && state.error && (
            <ErrorBanner message={state.error} />
          )}

          {!state.result && state.phase !== 'error' && (
            <EmptyState title={state.ticket?.title} phase={state.phase} />
          )}

          {state.settings?.sections.nextBestAction !== false && (
            <AccordionSection title="Next best action" defaultOpen>
              {state.result ? (
                <NextBestActionSection data={state.result.nextBestAction} />
              ) : (
                <SectionPlaceholder />
              )}
            </AccordionSection>
          )}

          {state.settings?.sections.missingInfo !== false && (
            <AccordionSection title="Missing information" rightSlot={<Count n={state.result?.missingInfo.length ?? 0} />}>
              {state.result ? (
                <MissingInfoSection items={state.result.missingInfo} />
              ) : (
                <SectionPlaceholder />
              )}
            </AccordionSection>
          )}

          {state.settings?.sections.frustration !== false && (
            <AccordionSection title="Frustration" defaultOpen>
              {state.result ? (
                <FrustrationSection data={state.result.frustration} />
              ) : (
                <SectionPlaceholder />
              )}
            </AccordionSection>
          )}

          {state.settings?.sections.errata !== false && (
            <AccordionSection title="Errata" rightSlot={<Count n={state.result?.errata.length ?? 0} />}>
              {state.result ? (
                <ErrataSection items={state.result.errata} />
              ) : (
                <SectionPlaceholder />
              )}
            </AccordionSection>
          )}

          {state.settings?.sections.similarTickets !== false && (
            <AccordionSection
              title="Similar tickets"
              rightSlot={<Count n={state.result?.similarTickets.length ?? 0} />}
            >
              {state.result ? (
                <SimilarTicketsSection items={state.result.similarTickets} />
              ) : (
                <SectionPlaceholder />
              )}
            </AccordionSection>
          )}

          {state.settings?.sections.suggestedReply !== false && (
            <AccordionSection title="Suggested reply" defaultOpen>
              {state.result ? (
                <SuggestedReplySection data={state.result.suggestedReply} />
              ) : (
                <SectionPlaceholder />
              )}
            </AccordionSection>
          )}
        </>
      </div>
      <Footer cacheStatus={state.cacheStatus} />
    </div>
  );
}

function SectionPlaceholder() {
  return (
    <p className="text-xs italic" style={{ color: 'var(--wpml-text-subtle)' }}>
      Empty until analysis runs.
    </p>
  );
}

function CollapsedIcon({ score, onClick }: { score: number | null; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-5 right-5 z-[2147483647] flex h-12 w-12 items-center justify-center rounded-full border bg-white text-sm font-semibold tabular-nums transition-transform hover:scale-105"
      style={{
        borderColor: 'var(--wpml-border-strong)',
        boxShadow: 'var(--wpml-shadow)',
      }}
      aria-label="Open WPML Support Assistant"
    >
      <span
        className="flex h-8 w-8 items-center justify-center rounded-full text-white"
        style={{ backgroundColor: score ? frustrationColor(score) : 'var(--wpml-accent)' }}
      >
        {score ?? 'AI'}
      </span>
    </button>
  );
}

function Header({
  onCollapse,
  onAnalyze,
  busy,
}: {
  onCollapse: () => void;
  onAnalyze: () => void;
  busy: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between border-b px-4 py-2.5"
      style={{ borderColor: 'var(--wpml-border)' }}
    >
      <div className="flex min-w-0 items-center gap-2">
        <Logo />
        <span className="truncate text-[13px] font-semibold tracking-tight">
          Support Assistant
        </span>
      </div>
      <div className="flex items-center gap-1">
        <IconButton label={busy ? 'Analyzing' : 'Refresh'} onClick={onAnalyze} disabled={busy}>
          <ReanalyzeIcon />
        </IconButton>
        <IconButton label="Settings" onClick={() => browser.runtime.openOptionsPage?.()}>
          <SettingsIcon />
        </IconButton>
        <IconButton label="Collapse" onClick={onCollapse}>
          <CollapseIcon />
        </IconButton>
      </div>
    </div>
  );
}

function StatusLine({ state }: { state: ReturnType<typeof useTicketAnalysis> }) {
  const labels: Record<string, string> = {
    idle: 'Ready',
    scraping: 'Reading ticket...',
    analyzing: 'Analyzing with AI...',
    ready: 'Updated',
    cached: 'Sin cambios',
    empty: 'No automatic analysis',
    error: 'Error',
  };
  const isLoading = state.phase === 'scraping' || state.phase === 'analyzing';
  const isError = state.phase === 'error';
  return (
    <div
      className="flex items-center justify-between gap-2 border-b px-4 py-2 text-[11px]"
      style={{
        borderColor: 'var(--wpml-border)',
        color: isError ? '#b91c1c' : isLoading ? 'var(--wpml-accent)' : 'var(--wpml-text-muted)',
        backgroundColor: isLoading ? 'var(--wpml-accent-soft)' : isError ? '#fef2f2' : undefined,
      }}
    >
      <span className="flex items-center gap-1.5 truncate font-medium">
        {isLoading && (
          <svg className="animate-spin h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        )}
        {labels[state.phase]}
      </span>
      {state.ticket?.status && <span className="shrink-0">{state.ticket.status}</span>}
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="mx-4 my-3 rounded-md border border-red-200 bg-red-50 px-3 py-2.5">
      <p className="text-xs font-medium text-red-700">Analysis failed</p>
      <p className="mt-0.5 break-all text-[11px] text-red-600">{message}</p>
    </div>
  );
}

function EmptyState({ title, phase }: { title?: string; phase: string }) {
  const message =
    phase === 'scraping' || phase === 'analyzing'
      ? 'Working on the ticket...'
      : 'This ticket was not auto-analyzed because the title does not start with [Assigned]. Use Refresh to analyze manually.';

  return (
    <div className="px-4 py-5">
      {title && (
        <div className="mb-2 line-clamp-2 text-sm font-medium" style={{ color: 'var(--wpml-text)' }}>
          {title}
        </div>
      )}
      <p className="text-xs leading-relaxed" style={{ color: 'var(--wpml-text-muted)' }}>
        {message}
      </p>
    </div>
  );
}

function Footer({ cacheStatus }: { cacheStatus: string | null }) {
  return (
    <div
      className="flex items-center justify-between border-t px-4 py-2 text-[10px]"
      style={{
        borderColor: 'var(--wpml-border)',
        color: 'var(--wpml-text-subtle)',
      }}
    >
      <span>{cacheStatus === 'sin-cambios' ? 'Sin cambios' : 'Real data'}</span>
      <span className="tabular-nums">v0.2.0</span>
    </div>
  );
}

function Count({ n }: { n: number }) {
  if (n === 0) return null;
  return (
    <span
      className="rounded-full px-1.5 text-[10px] font-medium tabular-nums"
      style={{
        backgroundColor: 'var(--wpml-accent-soft)',
        color: 'var(--wpml-accent)',
      }}
    >
      {n}
    </span>
  );
}

function IconButton({
  children,
  label,
  onClick,
  disabled = false,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      disabled={disabled}
      className="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-stone-100 disabled:opacity-50"
      style={{ color: 'var(--wpml-text-muted)' }}
    >
      {children}
    </button>
  );
}

function Logo() {
  return (
    <div
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white"
      style={{ backgroundColor: 'var(--wpml-accent)' }}
    >
      AI
    </div>
  );
}

function ReanalyzeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M11.5 7A4.5 4.5 0 1 1 10.2 4M11.5 2v3h-3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M7 1.5v1.6M7 10.9v1.6M2.6 2.6l1.1 1.1M10.3 10.3l1.1 1.1M1.5 7h1.6M10.9 7h1.6M2.6 11.4l1.1-1.1M10.3 3.7l1.1-1.1"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CollapseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M3 7h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
