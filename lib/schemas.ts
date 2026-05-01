import { z } from 'zod';

export const FrustrationSchema = z.object({
  score: z.number().int().min(1).max(10),
  label: z.string().min(1),
  reasoning: z.string().min(1),
});

export const ErrataItemSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
  whyRelevant: z.string().min(1),
});

export const SimilarTicketItemSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
  status: z.string().nullable(),
  whySimilar: z.string().min(1),
});

export const MissingInfoItemSchema = z.object({
  item: z.string().min(1),
  reason: z.string().min(1),
  priority: z.enum(['high', 'medium', 'low']),
  suggestedAsk: z.string().min(1),
});

export const NextBestActionSchema = z.object({
  action: z.string().min(1),
  actionType: z.enum([
    'ask_missing_info',
    'share_errata_workaround',
    'standard_troubleshooting',
    'request_staging_access',
    'request_duplicator_package',
    'escalate_to_second_tier',
    'wait_for_customer',
    'link_similar_ticket',
    'test_conflict',
  ]),
  reasoning: z.string().min(1),
  urgency: z.enum(['low', 'normal', 'high']),
  replySnippet: z.string().min(1),
  alternatives: z.array(z.object({
    action: z.string().min(1),
    whenToUse: z.string().min(1),
  })).max(2),
});

export const SuggestedReplySchema = z.object({
  body: z.string().min(1),
  confidence: z.enum(['high', 'medium', 'low']),
  confidenceReasoning: z.string().min(1),
  sources: z.array(z.object({
    type: z.enum(['errata', 'ticket', 'general']),
    url: z.string().url().nullable(),
    title: z.string().min(1),
  })).max(5),
});

export const AnalysisResultSchema = z.object({
  nextBestAction: NextBestActionSchema,
  missingInfo: z.array(MissingInfoItemSchema).max(5),
  frustration: FrustrationSchema,
  errata: z.array(ErrataItemSchema).max(5),
  similarTickets: z.array(SimilarTicketItemSchema).max(3),
  suggestedReply: SuggestedReplySchema,
});

export type AnalysisResultFromSchema = z.infer<typeof AnalysisResultSchema>;
