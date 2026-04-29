import type { ExtensionSettings, TicketContext } from './types';

export const PROMPT_VERSION = '2026-04-29.v1';

export function buildAnalysisPrompt(context: TicketContext, settings: ExtensionSettings) {
  const enabledSections = Object.entries(settings.sections)
    .filter(([, enabled]) => enabled)
    .map(([key]) => key)
    .join(', ');

  const system = [
    'You are an expert WPML technical support assistant.',
    'Analyze only the provided public WPML forum data.',
    'Return strict JSON only. Do not wrap it in markdown.',
    'The suggested reply must be useful for a WPML supporter, match the ticket language when clear, use [CLIENT] as the customer placeholder, and contain 2 to 4 paragraphs.',
    'Frustration score is 1 to 10, where 10 means very frustrated or angry.',
  ].join(' ');

  const user = JSON.stringify(
    {
      task: 'Analyze this WPML support ticket for the enabled sections.',
      enabledSections,
      requiredOutputShape: {
        frustration: {
          score: 'integer 1-10',
          label: 'short label',
          reasoning: 'brief evidence-based explanation',
        },
        errata: [{ title: 'string', url: 'absolute URL', whyRelevant: 'string' }],
        customerHistory: [{ title: 'string', url: 'absolute URL', whyRelated: 'string' }],
        similarTickets: [{ title: 'string', url: 'absolute URL', status: 'string or null', whySimilar: 'string' }],
        suggestedReply: {
          body: '2 to 4 paragraphs, uses [CLIENT], same language as ticket or English fallback',
          language: 'detected language name or ISO code',
          sources: [{ type: 'errata | ticket | history | general', url: 'URL or null', title: 'string' }],
          confidence: 'high | medium | low',
          confidenceReasoning: 'string',
        },
      },
      customInstructions: settings.customInstructions || null,
      ticket: {
        title: context.ticket.title,
        canonicalUrl: context.ticket.canonicalUrl,
        status: context.ticket.status,
        tags: context.ticket.tags,
        originalCustomer: context.ticket.originalCustomer,
        supporters: context.ticket.supporters,
        relevantPosts: context.ticket.relevantPosts.map((post) => ({
          id: post.id,
          authorName: post.authorName,
          role: post.role,
          createdAt: post.createdAt,
          url: post.url,
          text: post.text,
        })),
      },
      candidates: {
        errata: context.errataCandidates,
        customerHistory: context.historyCandidates,
        similarTickets: context.similarTicketCandidates,
      },
    },
    null,
    2,
  );

  return { system, user };
}
