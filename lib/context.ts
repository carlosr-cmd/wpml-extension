import { fetchErrataCandidates, fetchSimilarTickets, scrapeTicket } from './scraper';
import { PROMPT_VERSION } from './prompt';
import { getCachedTicket, hasNewRelevantPosts, isCurrentCache } from './storage';
import type { TicketContext } from './types';

export interface CollectTicketContextOptions {
  includeErrata?: boolean;
  includeSimilarTickets?: boolean;
}

export async function collectTicketContext(options: CollectTicketContextOptions = {}): Promise<TicketContext> {
  const { includeErrata = true, includeSimilarTickets = true } = options;
  const ticket = scrapeTicket();

  // Check cache: if there's a current prior analysis and only new posts exist,
  // skip expensive external fetches; the background will handle incremental mode.
  const cachedTicket = await getCachedTicket(ticket.canonicalUrl);
  const cached = isCurrentCache(cachedTicket, PROMPT_VERSION) ? cachedTicket : null;
  const relevantPostIds = ticket.relevantPosts.map((p) => p.id);
  const isIncremental = !!cached && hasNewRelevantPosts(cached, relevantPostIds);

  if (isIncremental) {
    return { ticket, errataCandidates: [], similarTicketCandidates: [] };
  }

  const [errataCandidates, similarTicketCandidates] = await Promise.all([
    includeErrata ? fetchErrataCandidates(ticket) : Promise.resolve([]),
    includeSimilarTickets ? fetchSimilarTickets(ticket) : Promise.resolve([]),
  ]);

  return { ticket, errataCandidates, similarTicketCandidates };
}
