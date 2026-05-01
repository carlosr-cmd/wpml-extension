import type { AnalysisResult, ExtensionSettings, TicketContext } from './types';

export const PROMPT_VERSION = '2026-05-01.v6';

export function buildAnalysisPrompt(
  context: TicketContext,
  settings: ExtensionSettings,
  previousResult?: AnalysisResult,
) {
  const enabledSections = Object.entries(settings.sections)
    .filter(([, enabled]) => enabled)
    .map(([key]) => key)
    .join(', ');

  const isIncremental = !!previousResult;

  const system = [
    'You are an expert WPML technical support assistant.',
    'Analyze only the provided public WPML forum data.',
    'Return strict JSON only. Do not wrap it in markdown.',
    'Frustration score is 1 to 10, where 10 means very frustrated or angry.',
    'Focus on excellent WPML support workflow: identify missing information, choose one practical next step, and avoid generic requests already answered in the ticket.',
    isIncremental
      ? 'You are given the previous analysis and only the NEW posts added since then. Update the analysis to reflect the new information.'
      : '',
  ].filter(Boolean).join(' ');

  const postsToSend = context.ticket.relevantPosts.map((post) => ({
    id: post.id,
    authorName: post.authorName,
    role: post.role,
    createdAt: post.createdAt,
    url: post.url,
    text: post.text,
  }));

  const user = JSON.stringify(
    {
      task: isIncremental
        ? 'Update this WPML ticket analysis based on the new posts only.'
        : 'Analyze this WPML support ticket for the enabled sections.',
      enabledSections,
      requiredOutputShape: {
        nextBestAction: {
          action: 'single best next action for the supporter',
          actionType: 'ask_missing_info | share_errata_workaround | standard_troubleshooting | request_staging_access | request_duplicator_package | escalate_to_second_tier | wait_for_customer | link_similar_ticket | test_conflict',
          reasoning: 'brief evidence-based explanation',
          urgency: 'low | normal | high',
          replySnippet: 'short copyable reply snippet for this action',
          alternatives: [{ action: 'string', whenToUse: 'string' }],
        },
        missingInfo: [{
          item: 'specific missing item such as WPML debug information, reproduction steps, affected URL, screenshots, error logs, staging access, Duplicator package, language pair, plugin/theme versions, or sample content',
          reason: 'why this is needed for this ticket',
          priority: 'high | medium | low',
          suggestedAsk: 'copyable sentence asking the customer for this item',
        }],
        frustration: { score: 'integer 1-10', label: 'short label', reasoning: 'brief evidence-based explanation' },
        errata: [{ title: 'string', url: 'absolute URL', whyRelevant: 'string' }],
        similarTickets: [{ title: 'string', url: 'absolute URL', status: 'string or null', whySimilar: 'string' }],
        suggestedReply: {
          body: 'ready-to-send support reply, concise, empathetic, and technically precise',
          confidence: 'high | medium | low',
          confidenceReasoning: 'brief explanation of why this reply is or is not strongly supported',
          sources: [{ type: 'errata | ticket | general', url: 'absolute URL or null', title: 'string' }],
        },
      },
      customInstructions: settings.customInstructions || null,
      supportGuidelines: [
        'For Missing information, list at most 5 items and only include items that are truly needed for the next support step.',
        'Prefer high-priority asks for WPML debug information, exact reproduction steps, affected URL/content, screenshots, browser/PHP error logs, staging credentials, or Duplicator package only when the ticket context justifies them.',
        'If ticket.debugInfoShared is true, do not ask for WPML debug information because the customer has already shared it.',
        'If ticket.wpMemoryLimit.isBelowRecommended is true, suggest increasing the WordPress memory limit to at least 128M as part of the next action or suggested reply. If it is false, do not suggest increasing memory.',
        'For Next best action, choose one decisive action. If an open errata clearly matches, suggest sharing the errata or workaround. If critical data is missing, ask for that first. If enough evidence exists and the issue is complex or reproducible, suggest escalation or a package for deeper debugging.',
        'Do not invent private information, credentials, site details, or internal policy. Use only the provided ticket posts and candidates.',
      ],
      ticket: {
        title: context.ticket.title,
        canonicalUrl: context.ticket.canonicalUrl,
        status: context.ticket.status,
        tags: context.ticket.tags,
        debugInfoShared: context.ticket.debugInfoShared,
        wpMemoryLimit: context.ticket.wpMemoryLimit,
        originalCustomer: context.ticket.originalCustomer,
        supporters: context.ticket.supporters,
        newPosts: isIncremental ? postsToSend : undefined,
        relevantPosts: isIncremental ? undefined : postsToSend,
      },
      previousAnalysis: isIncremental ? previousResult : undefined,
      candidates: isIncremental ? undefined : {
        errata: context.errataCandidates,
        similarTickets: context.similarTicketCandidates,
      },
    },
    null,
    2,
  );

  return { system, user };
}
