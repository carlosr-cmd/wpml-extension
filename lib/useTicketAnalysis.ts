import { useCallback, useEffect, useMemo, useState } from 'react';
import { browser } from 'wxt/browser';
import { collectTicketContext } from './context';
import { getPublicSettings, type PublicSettings } from './publicSettings';
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

  const analyze = useCallback(async (force = false) => {
    setError(null);
    setCacheStatus(null);
    setPhase('scraping');
    try {
      const context = await collectTicketContext();
      setTicket(context.ticket);
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

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const publicSettings = await getPublicSettings();
      const currentTicket = scrapeTicket();
      if (cancelled) return;
      setSettings(publicSettings);
      setTicket(currentTicket);
      if (!publicSettings.enabled) {
        setPhase('empty');
        return;
      }
      if (titleStartsAssigned(currentTicket)) {
        await analyze(false);
        return;
      }
      setPhase('empty');
    }
    void init();
    return () => {
      cancelled = true;
    };
  }, [analyze]);

  return useMemo(
    () => ({
      phase,
      ticket,
      result,
      cacheStatus,
      error,
      settings,
      analyze,
    }),
    [phase, ticket, result, cacheStatus, error, settings, analyze],
  );
}
