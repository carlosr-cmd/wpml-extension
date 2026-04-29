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

export const CustomerHistoryItemSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
  whyRelated: z.string().min(1),
});

export const SimilarTicketItemSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
  status: z.string().nullable(),
  whySimilar: z.string().min(1),
});

export const SuggestedReplySchema = z.object({
  body: z.string().min(1),
  language: z.string().min(2),
  sources: z.array(
    z.object({
      type: z.enum(['errata', 'ticket', 'history', 'general']),
      url: z.string().url().nullable(),
      title: z.string().min(1),
    }),
  ),
  confidence: z.enum(['high', 'medium', 'low']),
  confidenceReasoning: z.string().min(1),
});

export const AnalysisResultSchema = z.object({
  frustration: FrustrationSchema,
  errata: z.array(ErrataItemSchema).max(5),
  customerHistory: z.array(CustomerHistoryItemSchema).max(3),
  similarTickets: z.array(SimilarTicketItemSchema).max(3),
  suggestedReply: SuggestedReplySchema,
});

export type AnalysisResultFromSchema = z.infer<typeof AnalysisResultSchema>;
