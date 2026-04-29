import { fetchErrataCandidates, fetchSimilarTickets, scrapeTicket } from './scraper';
import { getCachedTicket, hasNewRelevantPosts } from './storage';
import type { TicketContext } from './types';

export async function collectTicketContext(): Promise<TicketContext> {
  const ticket = scrapeTicket();

  // Check cache: if there's a prior analysis and only new posts exist,
  // skip expensive external fetches — the background will handle incremental mode.
  const cached = await getCachedTicket(ticket.canonicalUrl);
  const relevantPostIds = ticket.relevantPosts.map((p) => p.id);
  const isIncremental = !!cached && hasNewRelevantPosts(cached, relevantPostIds);

  if (isIncremental) {
    return { ticket, errataCandidates: [], similarTicketCandidates: [] };
  }

  const [errataCandidates, similarTicketCandidates] = await Promise.all([
    fetchErrataCandidates(ticket),
    fetchSimilarTickets(ticket),
  ]);

  return { ticket, errataCandidates, similarTicketCandidates };
}
