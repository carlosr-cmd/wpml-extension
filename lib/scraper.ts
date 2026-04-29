import type {
  ErrataCandidate,
  RelatedTicketCandidate,
  ScrapedTicket,
  TicketPost,
} from './types';
import { normalizeTicketUrl } from './storage';

const SUPPORTER_MARKERS = [
  'wpml supporter',
  'wpml team',
  'supporter since',
  'support team',
  'wpml contractor',
];
const ERRATA_SEARCH_FORM_URL = 'https://wpml.org/en/htmx/known-issues/search-form/';
const ERRATA_SEARCH_URL = 'https://wpml.org/en/htmx/known-issues/search-issues';

export function scrapeTicket(documentRef: Document = document): ScrapedTicket {
  const canonicalUrl = getCanonicalUrl(documentRef);
  const title = cleanText(scrapeTitle(documentRef));
  const posts = findPostElements(documentRef).map((element, index) =>
    scrapePost(element, index, canonicalUrl),
  );
  const originalCustomer = findOriginalCustomer(posts);
  const classifiedPosts = posts.map((post) => ({
    ...post,
    role: classifyPost(post, originalCustomer?.name ?? null),
  }));
  const supporters = uniquePeople(
    classifiedPosts
      .filter((post) => post.role === 'supporter')
      .map((post) => ({ name: post.authorName, profileUrl: post.authorUrl })),
  );

  return {
    title,
    canonicalUrl,
    status: extractStatus(title, documentRef),
    tags: scrapeTags(documentRef),
    originalCustomer,
    supporters,
    posts: classifiedPosts,
    relevantPosts: classifiedPosts.filter(
      (post) => post.role === 'original_customer' || post.role === 'supporter',
    ),
  };
}

export function titleStartsAssigned(ticket: ScrapedTicket): boolean {
  return ticket.title.trim().toLowerCase().startsWith('[assigned]');
}

export async function fetchCustomerHistory(
  profileUrl: string | null | undefined,
  currentUrl: string,
): Promise<RelatedTicketCandidate[]> {
  if (!profileUrl) return [];
  const doc = await fetchHtml(profileUrl);
  return extractTicketLinks(doc)
    .filter((item) => normalizeTicketUrl(item.url) !== normalizeTicketUrl(currentUrl))
    .slice(0, 3);
}

export async function fetchSimilarTickets(ticket: ScrapedTicket): Promise<RelatedTicketCandidate[]> {
  const query = buildSearchQuery(ticket);
  if (!query) return [];
  const url = `https://wpml.org/forums/?s=${encodeURIComponent(query)}`;
  const doc = await fetchHtml(url);
  return extractTicketLinks(doc)
    .filter((item) => normalizeTicketUrl(item.url) !== normalizeTicketUrl(ticket.canonicalUrl))
    .slice(0, 3);
}

export async function fetchErrataCandidates(ticket: ScrapedTicket): Promise<ErrataCandidate[]> {
  const query = buildSearchQuery(ticket);
  if (!query) return [];

  const htmxResults = await fetchErrataCandidatesFromHtmx(query);
  if (htmxResults.length > 0) return htmxResults;

  return fetchErrataCandidatesFromPublicSearch(query);
}

async function fetchErrataCandidatesFromHtmx(query: string): Promise<ErrataCandidate[]> {
  const formDoc = await fetchHtmlOrNull(ERRATA_SEARCH_FORM_URL);
  const nonce = formDoc ? extractNonce(formDoc) : null;
  if (!nonce) return [];

  const body = new URLSearchParams({
    _wpnonce: nonce,
    wpml_lang: 'en',
    wpv_post_search: query,
    'wpv-relationship-filter': '0',
    'wpv-wpcf-errata-type': '',
    'wpv-wpcf-errata-status': '1',
  });

  const response = await fetch(ERRATA_SEARCH_URL, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      'HX-Request': 'true',
      'HX-Target': 'search_issues_results',
    },
    body,
  }).catch(() => null);
  if (!response?.ok) return [];

  const html = await response.text();
  return extractErrataLinks(new DOMParser().parseFromString(html, 'text/html')).slice(0, 8);
}

async function fetchErrataCandidatesFromPublicSearch(query: string): Promise<ErrataCandidate[]> {
  const docs = await Promise.allSettled([
    fetchHtml(`https://wpml.org/?s=${encodeURIComponent(query)}`),
    fetchHtml(`https://wpml.org/known-issues/?s=${encodeURIComponent(query)}`),
  ]);

  return uniqueByUrl(
    docs.flatMap((result) => (result.status === 'fulfilled' ? extractErrataLinks(result.value) : [])),
  ).slice(0, 8);
}

function extractNonce(documentRef: Document): string | null {
  return (
    documentRef.querySelector<HTMLInputElement>('input[name="_wpnonce"]')?.value ??
    documentRef.body.textContent?.match(/_wpnonce["']?\s*[:=]\s*["']([a-z0-9]+)["']/i)?.[1] ??
    null
  );
}

function scrapeTitle(documentRef: Document): string {
  // bbPress-specific selectors, from most to least specific
  const bbpSelectors = [
    '.bbp-topic-title',
    'h1.page-title',
    'h1.entry-title',
    '#bbp-topic-title',
    '[class*="topic-title"]',
  ];
  for (const sel of bbpSelectors) {
    const text = documentRef.querySelector(sel)?.textContent;
    if (text?.trim()) return text;
  }
  // Fallback: any h1 that contains brackets (likely the ticket title)
  const h1s = Array.from(documentRef.querySelectorAll('h1'));
  const bracketH1 = h1s.find((el) => /\[.+\]/.test(el.textContent ?? ''));
  if (bracketH1?.textContent?.trim()) return bracketH1.textContent;
  // Last resort: page <title>, strip site name suffix
  const pageTitle = documentRef.querySelector('title')?.textContent ?? '';
  return pageTitle.replace(/\s*[|\-–—].*$/, '').trim();
}

function findPostElements(documentRef: Document): Element[] {
  const selectors = [
    '[id^="post-"]',
    '.bbp-reply',
    '.bbp-topic-reply',
    'article',
  ];
  for (const selector of selectors) {
    const elements = Array.from(documentRef.querySelectorAll(selector)).filter((element) => {
      const text = cleanText(element.textContent ?? '');
      return text.length > 40 && /post-|reply|bbp|article/i.test(element.id + element.className);
    });
    if (elements.length > 0) return dedupeElements(elements);
  }
  return [];
}

function scrapePost(element: Element, index: number, canonicalUrl: string): TicketPost {
  const id = element.id || `post-${index + 1}`;
  const authorLink =
    element.querySelector<HTMLAnchorElement>('.bbp-author-name a, a.bbp-author-name, .bbp-author-link, a[href*="/forums/users/"]') ??
    element.querySelector<HTMLAnchorElement>('a[href*="/forums/users/"]');
  const authorName = cleanText(
    authorLink?.textContent ??
      element.querySelector('.bbp-author-name, .author, .name')?.textContent ??
      `Post ${index + 1}`,
  );
  const createdAt = cleanText(
    element.querySelector('time')?.getAttribute('datetime') ??
      element.querySelector('time, .bbp-reply-post-date, .date')?.textContent ??
      '',
  );
  const text = cleanText(
    element.querySelector('.bbp-reply-content, .reply-content, .post-content, .entry-content')?.textContent ??
      element.textContent ??
      '',
  );

  return {
    id,
    authorName,
    authorUrl: authorLink ? absoluteUrl(authorLink.href) : null,
    role: 'other',
    createdAt: createdAt || null,
    url: `${canonicalUrl}#${id}`,
    text,
  };
}

function classifyPost(post: TicketPost, originalCustomerName: string | null): TicketPost['role'] {
  const haystack = `${post.authorName} ${post.text}`.toLowerCase();
  if (SUPPORTER_MARKERS.some((marker) => haystack.includes(marker))) return 'supporter';
  if (originalCustomerName && sameName(post.authorName, originalCustomerName)) {
    return 'original_customer';
  }
  return 'other';
}

function findOriginalCustomer(posts: TicketPost[]): ScrapedTicket['originalCustomer'] {
  const firstCustomer = posts.find((post) => {
    const haystack = `${post.authorName} ${post.text}`.toLowerCase();
    return !SUPPORTER_MARKERS.some((marker) => haystack.includes(marker));
  });
  if (!firstCustomer) return null;
  return {
    name: firstCustomer.authorName,
    profileUrl: firstCustomer.authorUrl,
  };
}

function getCanonicalUrl(documentRef: Document): string {
  const canonical = documentRef.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href;
  return normalizeTicketUrl(canonical || location.href);
}

function scrapeTags(documentRef: Document): string[] {
  const selectors = ['.bbp-topic-tags a', 'a[rel="tag"]', '.tagcloud a', '.tags a'];
  return unique(
    selectors.flatMap((selector) =>
      Array.from(documentRef.querySelectorAll(selector)).map((el) => cleanText(el.textContent ?? '')),
    ),
  ).filter(Boolean);
}

function extractStatus(title: string, documentRef: Document): string | null {
  const match = title.match(/^\[([^\]]+)\]/);
  if (match) return match[1];
  const status = documentRef.querySelector('.bbp-topic-status, .topic-status, [class*="status"]');
  return status ? cleanText(status.textContent ?? '') || null : null;
}

function extractTicketLinks(documentRef: Document): RelatedTicketCandidate[] {
  const links = Array.from(documentRef.querySelectorAll<HTMLAnchorElement>('a[href*="/forums/topic/"]'));
  return uniqueByUrl(
    links
      .map((link) => ({
        title: cleanText(link.textContent ?? ''),
        url: absoluteUrl(link.href),
        status: extractStatus(cleanText(link.textContent ?? ''), documentRef),
        excerpt: cleanText(link.closest('li, article, .bbp-topic')?.textContent ?? '').slice(0, 500),
      }))
      .filter((item) => item.title.length > 4),
  );
}

function extractErrataLinks(documentRef: Document): ErrataCandidate[] {
  const links = Array.from(documentRef.querySelectorAll<HTMLAnchorElement>('a[href*="/errata/"], a[href*="/known-issues/"]'));
  return uniqueByUrl(
    links
      .map((link) => ({
        title: cleanText(link.textContent ?? ''),
        url: absoluteUrl(link.href),
        status: cleanText(link.closest('article, li, tr, .search_issues__item')?.textContent ?? '').match(/Open|Resolved|Closed/i)?.[0] ?? null,
        excerpt: cleanText(link.closest('article, li, tr, .search_issues__item')?.textContent ?? '').slice(0, 500),
      }))
      .filter((item) => item.title.length > 4),
  );
}

async function fetchHtml(url: string, timeoutMs = 10_000): Promise<Document> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { credentials: 'include', signal: controller.signal });
    if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
    const html = await response.text();
    return new DOMParser().parseFromString(html, 'text/html');
  } finally {
    clearTimeout(timer);
  }
}

async function fetchHtmlOrNull(url: string): Promise<Document | null> {
  try {
    return await fetchHtml(url);
  } catch {
    return null;
  }
}

function buildSearchQuery(ticket: ScrapedTicket): string {
  const title = ticket.title.replace(/^\[[^\]]+\]\s*/, '');
  const tags = ticket.tags.slice(0, 3).join(' ');
  return cleanText(`${title} ${tags}`).split(/\s+/).slice(0, 10).join(' ');
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function absoluteUrl(url: string): string {
  return new URL(url, location.origin).toString();
}

function sameName(a: string, b: string): boolean {
  return cleanText(a).toLowerCase() === cleanText(b).toLowerCase();
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function uniquePeople<T extends { name: string; profileUrl: string | null }>(people: T[]): T[] {
  const seen = new Set<string>();
  return people.filter((person) => {
    const key = person.profileUrl ?? person.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function uniqueByUrl<T extends { url: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = normalizeTicketUrl(item.url);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeElements(elements: Element[]): Element[] {
  return elements.filter((element, index) => elements.findIndex((candidate) => candidate === element) === index);
}
