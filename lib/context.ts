import {
  fetchCustomerHistory,
  fetchErrataCandidates,
  fetchSimilarTickets,
  scrapeTicket,
} from './scraper';
import type { TicketContext } from './types';

export async function collectTicketContext(): Promise<TicketContext> {
  const ticket = scrapeTicket();
  const [historyCandidates, errataCandidates, similarTicketCandidates] = await Promise.all([
    fetchCustomerHistory(ticket.originalCustomer?.profileUrl, ticket.canonicalUrl),
    fetchErrataCandidates(ticket),
    fetchSimilarTickets(ticket),
  ]);

  return {
    ticket,
    historyCandidates,
    errataCandidates,
    similarTicketCandidates,
  };
}
