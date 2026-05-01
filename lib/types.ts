export type AiProvider = 'anthropic' | 'openai';

export type AnalysisPhase =
  | 'idle'
  | 'scraping'
  | 'cached'
  | 'analyzing'
  | 'ready'
  | 'empty'
  | 'error';

export interface ProviderSettings {
  provider: AiProvider;
  anthropicApiKey: string;
  anthropicModel: string;
  openaiApiKey: string;
  openaiModel: string;
}

export interface SectionToggles {
  nextBestAction: boolean;
  missingInfo: boolean;
  frustration: boolean;
  errata: boolean;
  similarTickets: boolean;
  suggestedReply: boolean;
}

export interface ExtensionSettings {
  enabled: boolean;
  providers: ProviderSettings;
  sections: SectionToggles;
  customInstructions: string;
}

export interface TicketPost {
  id: string;
  authorName: string;
  authorUrl: string | null;
  role: 'original_customer' | 'supporter' | 'other';
  createdAt: string | null;
  url: string | null;
  text: string;
}

export interface ScrapedTicket {
  title: string;
  canonicalUrl: string;
  status: string | null;
  tags: string[];
  originalCustomer: {
    name: string;
    profileUrl: string | null;
  } | null;
  supporters: Array<{
    name: string;
    profileUrl: string | null;
  }>;
  posts: TicketPost[];
  relevantPosts: TicketPost[];
}

export interface RelatedTicketCandidate {
  title: string;
  url: string;
  status: string | null;
  excerpt?: string;
}


export interface ErrataCandidate {
  title: string;
  url: string;
  status?: string | null;
  excerpt?: string;
}

export interface TicketContext {
  ticket: ScrapedTicket;
  errataCandidates: ErrataCandidate[];
  similarTicketCandidates: RelatedTicketCandidate[];
}

export interface FrustrationAnalysis {
  score: number;
  label: string;
  reasoning: string;
}

export interface ErrataItem {
  title: string;
  url: string;
  whyRelevant: string;
}

export interface SimilarTicketItem {
  title: string;
  url: string;
  status: string | null;
  whySimilar: string;
}

export interface MissingInfoItem {
  item: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  suggestedAsk: string;
}

export interface NextBestAction {
  action: string;
  actionType:
    | 'ask_missing_info'
    | 'share_errata_workaround'
    | 'standard_troubleshooting'
    | 'request_staging_access'
    | 'request_duplicator_package'
    | 'escalate_to_second_tier'
    | 'wait_for_customer'
    | 'link_similar_ticket'
    | 'test_conflict';
  reasoning: string;
  urgency: 'low' | 'normal' | 'high';
  replySnippet: string;
  alternatives: Array<{
    action: string;
    whenToUse: string;
  }>;
}

export interface SuggestedReply {
  body: string;
  confidence: 'high' | 'medium' | 'low';
  confidenceReasoning: string;
  sources: Array<{
    type: 'errata' | 'ticket' | 'general';
    url: string | null;
    title: string;
  }>;
}

export interface AnalysisResult {
  nextBestAction: NextBestAction;
  missingInfo: MissingInfoItem[];
  frustration: FrustrationAnalysis;
  errata: ErrataItem[];
  similarTickets: SimilarTicketItem[];
  suggestedReply: SuggestedReply;
}

export interface CachedTicket {
  url: string;
  analyzedAt: string;
  consideredPostIds: string[];
  relevantPostCount: number;
  promptVersion: string;
  result: AnalysisResult;
}

export interface AnalyzeTicketRequest {
  type: 'ANALYZE_TICKET';
  context: TicketContext;
  force?: boolean;
}

export interface AnalyzeTicketResponse {
  result: AnalysisResult;
  cacheStatus: 'sin-cambios' | 'updated';
  analyzedAt: string;
}

export interface TestApiKeyRequest {
  type: 'TEST_API_KEY';
  provider: AiProvider;
  apiKey: string;
  model: string;
}

export type BackgroundRequest = AnalyzeTicketRequest | TestApiKeyRequest;

export interface BackgroundResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}
