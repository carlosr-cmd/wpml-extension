import type { AnalysisResult } from './types';

// Mock analysis result used during iteration 1 to render the UI
// without making real API calls. Will be replaced by real analysis
// from the background service worker in iteration 2.
export const MOCK_ANALYSIS: AnalysisResult = {
  nextBestAction: {
    action: 'Ask the customer to test the errata workaround on staging',
    actionType: 'share_errata_workaround',
    reasoning: 'The reported taxonomy count behavior matches a related known issue, but it should be verified safely before touching production.',
    urgency: 'normal',
    replySnippet: 'Please test the workaround from the related errata on a staging copy after taking a full backup, then let me know whether the translated term counts update correctly.',
    alternatives: [
      {
        action: 'Ask for WPML debug information',
        whenToUse: 'Use this if the customer cannot reproduce the issue on staging or if plugin versions are unclear.',
      },
    ],
  },
  missingInfo: [
    {
      item: 'WPML debug information',
      reason: 'Plugin and environment versions are needed before confirming whether the known issue applies.',
      priority: 'medium',
      suggestedAsk: 'Could you please share the WPML debug information from WPML > Support > Debug information?',
    },
  ],
  frustration: {
    score: 6,
    label: 'Mildly impatient',
    reasoning:
      'Customer has waited two days without a substantive update and is asking when they can expect a fix.',
  },
  errata: [
    {
      title:
        "Removing a term from a post doesn't reduce the count for the translated terms",
      url: 'https://wpml.org/errata/removing-a-term-from-a-post-doesnt-reduce-the-count-for-the-translated-terms/',
      whyRelevant:
        'Customer reports incorrect term counts on translated taxonomy archives.',
    },
  ],
  similarTickets: [
    {
      title: '[Resolved] Translation queue does not complete',
      url: 'https://wpml.org/forums/topic/example-similar-ticket/',
      status: 'Resolved',
      whySimilar: 'Similar queue symptoms and resolution path.',
    },
  ],
  suggestedReply: {
    body: 'Hi [CLIENT],\n\nThanks for the details. This looks related to a known issue with translated term counts. Please make a full backup first, then test the workaround from the errata on a staging copy and confirm whether removing and re-adding a term updates the counts correctly.\n\nI will keep the ticket assigned while we verify the result.',
    confidence: 'medium',
    confidenceReasoning: 'The suggested reply is based on one related errata and should be verified on the customer site.',
    sources: [
      {
        type: 'errata',
        url: 'https://wpml.org/errata/removing-a-term-from-a-post-doesnt-reduce-the-count-for-the-translated-terms/',
        title: "Removing a term from a post doesn't reduce the count for the translated terms",
      },
    ],
  },
};
