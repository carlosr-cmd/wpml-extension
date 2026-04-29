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
};
