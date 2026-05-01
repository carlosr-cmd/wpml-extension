import { useCallback, useEffect, useMemo, useState } from 'react';
import { browser } from 'wxt/browser';
import { collectTicketContext } from './context';
import { PROMPT_VERSION } from './prompt';
import { getPublicSettings, type PublicSettings } from './publicSettings';
import { getCachedTicket, hasNewRelevantPosts, isCurrentCache } from './storage';
import { scrapeTicket, titleStartsAssigned } from './scraper';
import type {
  AnalysisPhase,
  AnalysisResult,
  AnalyzeTicketResponse,
  BackgroundResponse,
  ScrapedTicket,
} from './types';

export interface TicketAnalysisState {
  phase: AnalysisPhase;
  ticket: ScrapedTicket | null;
  result: AnalysisResult | null;
  cacheStatus: 'sin-cambios' | 'updated' | null;
  error: string | null;
  settings: PublicSettings | null;
  analyze: (force?: boolean) => Promise<void>;
}

export function useTicketAnalysis(): TicketAnalysisState {
  const [phase, setPhase] = useState<AnalysisPhase>('idle');
  const [ticket, setTicket] = useState<ScrapedTicket | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [cacheStatus, setCacheStatus] = useState<'sin-cambios' | 'updated' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<PublicSettings | null>(null);

  const runAnalysis = useCallback(async (force: boolean) => {
    setError(null);
    setPhase('scraping');
    try {
      const context = await collectTicketContext();
      setPhase('analyzing');
      const response = await browser.runtime.sendMessage({
        type: 'ANALYZE_TICKET',
        context,
        force,
      });
      const typed = response as BackgroundResponse<AnalyzeTicketResponse>;
      if (!typed.ok || !typed.data) {
        throw new Error(typed.error ?? 'Analysis failed');
      }
      if (!typed.data.result) {
        throw new Error('No result returned from background');
      }
      // Batch all success state in one update to avoid flicker
      setResult(typed.data.result);
      setCacheStatus(typed.data.cacheStatus);
      setPhase(typed.data.cacheStatus === 'sin-cambios' ? 'cached' : 'ready');
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[wpml-ext] analysis error:', message);
      setError(message);
      setPhase('error');
    }
  }, []);

  // Manual refresh triggered by the user
  const analyze = useCallback(async (force = false) => {
    const currentTicket = scrapeTicket();
    setTicket(currentTicket);
    setCacheStatus(null);
    await runAnalysis(force);
  }, [runAnalysis]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const [publicSettings, currentTicket] = await Promise.all([
        getPublicSettings(),
        Promise.resolve(scrapeTicket()),
      ]);
      if (cancelled) return;

      setSettings(publicSettings);
      setTicket(currentTicket);

      if (!publicSettings.enabled) {
        setPhase('empty');
        return;
      }

      // 1. Load from cache immediately so the user sees data right away
      const cachedTicket = await getCachedTicket(currentTicket.canonicalUrl);
      const cached = isCurrentCache(cachedTicket, PROMPT_VERSION) ? cachedTicket : null;
      if (cancelled) return;

      if (cached) {
        setResult(cached.result);
        setCacheStatus('sin-cambios');
        setPhase('cached');

        // 2. Check if new posts have arrived since the last analysis
        const relevantPostIds = currentTicket.relevantPosts.map((p) => p.id);
        const hasNew = hasNewRelevantPosts(cached, relevantPostIds);
        if (!hasNew) {
          return; // Nothing new - keep showing cached result.
        }

        // 3. New posts exist - re-analyze incrementally without clearing the existing result.
        if (cancelled) return;
        await runAnalysis(false);
        return;
      }

      // 4. No cache: auto-analyze only for [Assigned] tickets
      if (titleStartsAssigned(currentTicket)) {
        await runAnalysis(false);
        return;
      }

      setPhase('empty');
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, []); // empty deps: init runs once on mount

  return useMemo(
    () => ({ phase, ticket, result, cacheStatus, error, settings, analyze }),
    [phase, ticket, result, cacheStatus, error, settings, analyze],
  );
}
