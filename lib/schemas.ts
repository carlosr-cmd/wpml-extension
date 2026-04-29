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

export const AnalysisResultSchema = z.object({
  frustration: FrustrationSchema,
  errata: z.array(ErrataItemSchema).max(5),
  similarTickets: z.array(SimilarTicketItemSchema).max(3),
});

export type AnalysisResultFromSchema = z.infer<typeof AnalysisResultSchema>;
