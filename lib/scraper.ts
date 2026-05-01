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

const MAX_POST_CHARS = 600;
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
    debugInfoShared: hasDebugInfoNotice(documentRef),
    wpMemoryLimit: extractWpMemoryLimit(documentRef),
    originalCustomer,
    supporters,
    posts: classifiedPosts,
    relevantPosts: classifiedPosts.filter(
      (post) => post.role === 'original_customer' || post.role === 'supporter',
    ),
  };
}

// Matches localized assigned prefixes in WPML forum titles.
const ASSIGNED_PREFIXES = ['[assigned]', '[asignado]', '[assigné]', '[zugewiesen]', '[toegewezen]'];

export function titleStartsAssigned(ticket: ScrapedTicket): boolean {
  const lower = ticket.title.trim().toLowerCase();
  return ASSIGNED_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

export async function fetchSimilarTickets(ticket: ScrapedTicket): Promise<RelatedTicketCandidate[]> {
  const profile = buildSimilarityProfile(ticket);
  const query = profile.query;
  if (!query) return [];
  const url = `https://wpml.org/forums/?s=${encodeURIComponent(query)}`;
  const doc = await fetchHtmlOrNull(url);
  if (!doc) return [];
  return extractTicketLinks(doc)
    .filter((item) => normalizeTicketUrl(item.url) !== normalizeTicketUrl(ticket.canonicalUrl))
    .map((item) => ({ item, score: scoreSimilarTicket(item, profile) }))
    .filter(({ score }) => score >= profile.minimumScore)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item)
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
  // Try h1.page-title first - confirmed selector on wpml.org forums.
  const selectors = ['h1.page-title', 'h1.entry-title', '#bbp-topic-title'];
  for (const sel of selectors) {
    const text = documentRef.querySelector(sel)?.textContent?.trim();
    if (text && text.length > 4) return text;
  }
  // Any h1 containing a bracket prefix like [Assigned]
  const bracketH1 = Array.from(documentRef.querySelectorAll('h1')).find(
    (el) => /\[[^\]]+\]/.test(el.textContent ?? ''),
  );
  if (bracketH1?.textContent?.trim()) return bracketH1.textContent.trim();
  // Last resort: strip site name from <title>
  const pageTitle = documentRef.querySelector('title')?.textContent ?? '';
  return pageTitle.replace(/\s*[|\-\u2013\u2014].*$/, '').trim();
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
  const rawText = cleanText(
    element.querySelector('.bbp-reply-content, .reply-content, .post-content, .entry-content')?.textContent ??
      element.textContent ??
      '',
  );
  const text = rawText.length > MAX_POST_CHARS ? `${rawText.slice(0, MAX_POST_CHARS)}...` : rawText;

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

function hasDebugInfoNotice(documentRef: Document): boolean {
  return !!documentRef.querySelector('.bbps-debug-info');
}

function extractWpMemoryLimit(documentRef: Document): ScrapedTicket['wpMemoryLimit'] {
  const rows = Array.from(documentRef.querySelectorAll('tr'));
  const row = rows.find((row) => {
    const firstCell = row.querySelector('td, th');
    return cleanText(firstCell?.textContent ?? '').toLowerCase() === 'wp memory limit';
  });
  if (!row) return null;

  const cells = Array.from(row.querySelectorAll('td, th'));
  const raw = cleanText(cells[1]?.textContent ?? '');
  if (!raw) return null;

  const megabytes = parseMemoryLimitToMb(raw);
  return {
    raw,
    megabytes,
    isBelowRecommended: megabytes !== null && megabytes < 128,
  };
}

function parseMemoryLimitToMb(value: string): number | null {
  const normalized = value.trim().replace(',', '.').toLowerCase();
  const match = normalized.match(/^(\d+(?:\.\d+)?)\s*([kmgt]?)(?:i?b)?$/);
  if (!match) return null;

  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) return null;

  switch (match[2]) {
    case 'g':
      return amount * 1024;
    case 'm':
      return amount;
    case 'k':
      return amount / 1024;
    case 't':
      return amount * 1024 * 1024;
    case '':
      return amount / 1024 / 1024;
    default:
      return null;
  }
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

interface SimilarityProfile {
  query: string;
  requiredTerms: string[];
  keywords: string[];
  minimumScore: number;
}

const IMPORTANT_PLUGIN_TERMS = [
  'acf',
  'avada',
  'beaver',
  'bricks',
  'divi',
  'elementor',
  'facetwp',
  'gutenberg',
  'oxygen',
  'polylang',
  'toolset',
  'woocommerce',
  'wpbakery',
  'yoast',
];

const SEARCH_STOP_WORDS = new Set([
  'about',
  'after',
  'also',
  'and',
  'are',
  'assigned',
  'but',
  'can',
  'cannot',
  'com',
  'does',
  'doesn',
  'don',
  'for',
  'from',
  'have',
  'how',
  'into',
  'issue',
  'not',
  'org',
  'page',
  'please',
  'problem',
  'resolved',
  'site',
  'that',
  'the',
  'this',
  'ticket',
  'with',
  'wpml',
  'www',
  'you',
]);

function buildSimilarityProfile(ticket: ScrapedTicket): SimilarityProfile {
  const title = ticket.title.replace(/^\[[^\]]+\]\s*/, '');
  const customerText = ticket.relevantPosts
    .filter((post) => post.role === 'original_customer')
    .slice(0, 2)
    .map((post) => post.text)
    .join(' ');
  const source = `${title} ${ticket.tags.join(' ')} ${customerText}`;
  const tokens = tokenizeForSearch(source);
  const requiredTerms = IMPORTANT_PLUGIN_TERMS.filter((term) => tokens.includes(term));
  const frequency = new Map<string, number>();

  for (const token of tokens) {
    if (!requiredTerms.includes(token)) {
      frequency.set(token, (frequency.get(token) ?? 0) + 1);
    }
  }

  const keywords = [...frequency.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([token]) => token)
    .filter((token) => token.length > 3)
    .slice(0, 8);
  const queryTerms = unique([...requiredTerms, ...keywords]).slice(0, 8);

  return {
    query: queryTerms.join(' '),
    requiredTerms,
    keywords,
    minimumScore: requiredTerms.length > 0 ? 3 : 4,
  };
}

function scoreSimilarTicket(item: RelatedTicketCandidate, profile: SimilarityProfile): number {
  const haystack = tokenizeForSearch(`${item.title} ${item.excerpt ?? ''}`);
  const haystackSet = new Set(haystack);

  if (profile.requiredTerms.length > 0 && !profile.requiredTerms.some((term) => haystackSet.has(term))) {
    return 0;
  }

  let score = 0;
  for (const term of profile.requiredTerms) {
    if (haystackSet.has(term)) score += 3;
  }
  for (const keyword of profile.keywords) {
    if (haystackSet.has(keyword)) score += 1;
  }

  return score;
}

function tokenizeForSearch(value: string): string[] {
  return cleanText(value)
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !SEARCH_STOP_WORDS.has(token));
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
