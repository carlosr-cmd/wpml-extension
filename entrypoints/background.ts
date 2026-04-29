import { defineBackground } from 'wxt/utils/define-background';
import { browser } from 'wxt/browser';
import { generateAnalysis, testApiKey } from '@/lib/ai';
import { buildAnalysisPrompt, PROMPT_VERSION } from '@/lib/prompt';
import { getSettings } from '@/lib/settings';
import { getCachedTicket, hasNewRelevantPosts, setCachedTicket } from '@/lib/storage';
import type {
  AnalyzeTicketResponse,
  BackgroundRequest,
  BackgroundResponse,
  CachedTicket,
} from '@/lib/types';

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((request: BackgroundRequest) => {
    if (request.type === 'ANALYZE_TICKET') {
      return handleAnalyze(request).then(toOk, toError);
    }
    if (request.type === 'TEST_API_KEY') {
      return testApiKey(request.provider, request.apiKey, request.model)
        .then(() => toOk({ ok: true }))
        .catch(toError);
    }
    return undefined;
  });
});

async function handleAnalyze(
  request: Extract<BackgroundRequest, { type: 'ANALYZE_TICKET' }>,
): Promise<BackgroundResponse<AnalyzeTicketResponse>> {
  const settings = await getSettings();
  if (!settings.enabled) {
    throw new Error('The extension is disabled in Settings.');
  }

  const allRelevantPostIds = request.context.ticket.relevantPosts.map((post) => post.id);
  const cached = await getCachedTicket(request.context.ticket.canonicalUrl);

  // Return cache if nothing changed
  if (!request.force && cached && !hasNewRelevantPosts(cached, allRelevantPostIds)) {
    return toOk({
      result: cached.result,
      cacheStatus: 'sin-cambios',
      analyzedAt: cached.analyzedAt,
    });
  }

  const provider = settings.providers.provider;
  const apiKey =
    provider === 'anthropic'
      ? settings.providers.anthropicApiKey
      : settings.providers.openaiApiKey;
  const model =
    provider === 'anthropic'
      ? settings.providers.anthropicModel
      : settings.providers.openaiModel;

  if (!apiKey.trim()) {
    throw new Error(`Missing ${provider === 'anthropic' ? 'Anthropic' : 'OpenAI'} API key.`);
  }

  // Incremental: if there's a previous analysis, send only new posts to the AI
  const newPostIds = cached
    ? allRelevantPostIds.filter((id) => !cached.consideredPostIds.includes(id))
    : allRelevantPostIds;

  const contextForAi = (cached && newPostIds.length > 0 && !request.force)
    ? {
        ...request.context,
        ticket: {
          ...request.context.ticket,
          relevantPosts: request.context.ticket.relevantPosts.filter((p) =>
            newPostIds.includes(p.id),
          ),
        },
      }
    : request.context;

  const previousResult = (cached && newPostIds.length > 0 && !request.force)
    ? cached.result
    : undefined;

  const prompt = buildAnalysisPrompt(contextForAi, settings, previousResult);
  const result = await generateAnalysis({
    provider,
    apiKey,
    model,
    system: prompt.system,
    user: prompt.user,
  });
  const analyzedAt = new Date().toISOString();
  const cache: CachedTicket = {
    url: request.context.ticket.canonicalUrl,
    analyzedAt,
    consideredPostIds: allRelevantPostIds,
    relevantPostCount: allRelevantPostIds.length,
    promptVersion: PROMPT_VERSION,
    result,
  };
  await setCachedTicket(cache);

  return toOk({
    result,
    cacheStatus: 'updated',
    analyzedAt,
  });
}

function toOk<T>(data: T): BackgroundResponse<T> {
  return { ok: true, data };
}

function toError(error: unknown): BackgroundResponse<never> {
  return {
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  };
}
