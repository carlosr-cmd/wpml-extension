import { useCallback, useEffect, useMemo, useState } from 'react';
import { browser } from 'wxt/browser';
import { collectTicketContext } from './context';
import { getPublicSettings, type PublicSettings } from './publicSettings';
import { getCachedTicket, hasNewRelevantPosts } from './storage';
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

  const runAnalysis = useCallback(async (currentTicket: ScrapedTicket, force: boolean) => {
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
      setResult(typed.data.result);
      setCacheStatus(typed.data.cacheStatus);
      setPhase(typed.data.cacheStatus === 'sin-cambios' ? 'cached' : 'ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase('error');
    }
  }, []);

  // Manual refresh triggered by the user
  const analyze = useCallback(async (force = false) => {
    const currentTicket = scrapeTicket();
    setTicket(currentTicket);
    setCacheStatus(null);
    await runAnalysis(currentTicket, force);
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
      const cached = await getCachedTicket(currentTicket.canonicalUrl);
      if (cancelled) return;

      if (cached) {
        setResult(cached.result);
        setCacheStatus('sin-cambios');
        setPhase('cached');

        // 2. Check if new posts have arrived since the last analysis
        const relevantPostIds = currentTicket.relevantPosts.map((p) => p.id);
        const hasNew = hasNewRelevantPosts(cached, relevantPostIds);
        if (!hasNew) {
          return; // Nothing new — keep showing cached result
        }

        // 3. New posts exist — re-analyze incrementally (don't clear the existing result)
        if (cancelled) return;
        await runAnalysis(currentTicket, false);
        return;
      }

      // 4. No cache: auto-analyze only for [Assigned] tickets
      if (titleStartsAssigned(currentTicket)) {
        await runAnalysis(currentTicket, false);
        return;
      }

      setPhase('empty');
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, [runAnalysis]);

  return useMemo(
    () => ({ phase, ticket, result, cacheStatus, error, settings, analyze }),
    [phase, ticket, result, cacheStatus, error, settings, analyze],
  );
}
