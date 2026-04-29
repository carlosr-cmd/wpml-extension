import { browser } from 'wxt/browser';
import type { CachedTicket } from './types';

const CACHE_PREFIX = 'wpmlSupportAssistant.cache.';

export function cacheKey(url: string): string {
  return `${CACHE_PREFIX}${normalizeTicketUrl(url)}`;
}

export function normalizeTicketUrl(url: string): string {
  const parsed = new URL(url);
  parsed.hash = '';
  parsed.search = '';
  return parsed.toString().replace(/\/page\/\d+\/?$/i, '/');
}

export async function getCachedTicket(url: string): Promise<CachedTicket | null> {
  const key = cacheKey(url);
  const stored = await browser.storage.local.get(key);
  return (stored[key] as CachedTicket | undefined) ?? null;
}

export async function setCachedTicket(cache: CachedTicket): Promise<void> {
  await browser.storage.local.set({ [cacheKey(cache.url)]: cache });
}

export async function clearTicketCache(): Promise<void> {
  const all = await browser.storage.local.get(null);
  const keys = Object.keys(all).filter((key) => key.startsWith(CACHE_PREFIX));
  if (keys.length > 0) {
    await browser.storage.local.remove(keys);
  }
}

export function hasNewRelevantPosts(cache: CachedTicket | null, postIds: string[]): boolean {
  if (!cache) return true;
  return postIds.some((postId) => !cache.consideredPostIds.includes(postId));
}
