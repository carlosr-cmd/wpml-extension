import type { AnalysisResult, ExtensionSettings, TicketContext } from './types';

export const PROMPT_VERSION = '2026-04-29.v2';

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
        frustration: { score: 'integer 1-10', label: 'short label', reasoning: 'brief evidence-based explanation' },
        errata: [{ title: 'string', url: 'absolute URL', whyRelevant: 'string' }],
        similarTickets: [{ title: 'string', url: 'absolute URL', status: 'string or null', whySimilar: 'string' }],
      },
      customInstructions: settings.customInstructions || null,
      ticket: {
        title: context.ticket.title,
        canonicalUrl: context.ticket.canonicalUrl,
        status: context.ticket.status,
        tags: context.ticket.tags,
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
