import type { AnalysisResult } from './types';

// Mock analysis result used during iteration 1 to render the UI
// without making real API calls. Will be replaced by real analysis
// from the background service worker in iteration 2.
export const MOCK_ANALYSIS: AnalysisResult = {
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
    body:
      "Hi [CLIENT],\n\nThanks for the additional details. Looking at your description, this matches a known errata where term counts are not updated for translated terms when a term is removed from a post. There is a workaround code snippet you can drop into your theme's functions.php that forces the count to recalculate.\n\nBefore applying it, please make sure you have a full website backup. Once applied, remove and re-add a term on a test post to confirm the counts update correctly on the translated side.\n\nLet me know how it goes and I will keep this ticket assigned to me until we confirm everything works.",
    language: 'en',
    sources: [
      {
        type: 'errata',
        url: 'https://wpml.org/errata/removing-a-term-from-a-post-doesnt-reduce-the-count-for-the-translated-terms/',
        title:
          "Removing a term from a post doesn't reduce the count for the translated terms",
      },
    ],
    confidence: 'high',
    confidenceReasoning:
      'A directly applicable errata exists with a workaround code snippet.',
  },
};
