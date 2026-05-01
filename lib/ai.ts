import { AnalysisResultSchema } from './schemas';
import type { AiProvider, AnalysisResult } from './types';

interface GenerateArgs {
  provider: AiProvider;
  apiKey: string;
  model: string;
  system: string;
  user: string;
}

export async function generateAnalysis(args: GenerateArgs): Promise<AnalysisResult> {
  const json =
    args.provider === 'anthropic'
      ? await callAnthropicAnalysis(args)
      : parseJson(await callOpenAI(args));
  return AnalysisResultSchema.parse(json);
}

export async function testApiKey(
  provider: AiProvider,
  apiKey: string,
  model: string,
): Promise<void> {
  const system = 'Reply with JSON only.';
  const user = '{"ok":true}';
  if (provider === 'anthropic') {
    await callAnthropic({ provider, apiKey, model, system, user, maxTokens: 16 });
  } else {
    await callOpenAI({ provider, apiKey, model, system, user, maxTokens: 16 });
  }
}

async function callAnthropic(args: GenerateArgs & { maxTokens?: number }): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': args.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: args.model,
      max_tokens: args.maxTokens ?? 3000,
      temperature: 0.2,
      system: args.system,
      messages: [{ role: 'user', content: args.user }],
    }),
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body?.error?.message ?? `Anthropic API error ${response.status}`);
  }
  const text = body?.content?.find((item: { type: string }) => item.type === 'text')?.text;
  if (!text) throw new Error('Anthropic returned an empty response');
  return text;
}

async function callAnthropicAnalysis(args: GenerateArgs & { maxTokens?: number }): Promise<unknown> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': args.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: args.model,
      max_tokens: args.maxTokens ?? 3000,
      temperature: 0.1,
      system: args.system,
      messages: [{ role: 'user', content: args.user }],
      tools: [{
        name: 'return_analysis',
        description: 'Return the WPML ticket analysis as structured data.',
        input_schema: ANALYSIS_JSON_SCHEMA,
      }],
      tool_choice: { type: 'tool', name: 'return_analysis' },
    }),
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body?.error?.message ?? `Anthropic API error ${response.status}`);
  }
  const toolUse = body?.content?.find(
    (item: { type?: string; name?: string }) =>
      item.type === 'tool_use' && item.name === 'return_analysis',
  );
  if (toolUse?.input) return toolUse.input;

  const text = body?.content?.find((item: { type?: string }) => item.type === 'text')?.text;
  if (!text) throw new Error('Anthropic returned neither structured analysis nor text');
  return parseJson(text);
}

async function callOpenAI(args: GenerateArgs & { maxTokens?: number }): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${args.apiKey}`,
    },
    body: JSON.stringify({
      model: args.model,
      temperature: 0.2,
      max_tokens: args.maxTokens ?? 3000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: args.system },
        { role: 'user', content: args.user },
      ],
    }),
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body?.error?.message ?? `OpenAI API error ${response.status}`);
  }
  const text = body?.choices?.[0]?.message?.content;
  if (!text) throw new Error('OpenAI returned an empty response');
  return text;
}

function parseJson(text: string): unknown {
  const trimmed = stripMarkdownFence(text.trim());
  try {
    return JSON.parse(trimmed);
  } catch (initialError) {
    const objectText = extractBalancedJsonObject(trimmed);
    if (!objectText) throw new Error('AI response did not contain JSON');
    try {
      return JSON.parse(objectText);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const preview = objectText.slice(0, 240).replace(/\s+/g, ' ');
      throw new Error(
        `AI returned invalid JSON: ${message}. Response starts with: ${preview}`,
        { cause: initialError },
      );
    }
  }
}

function stripMarkdownFence(text: string): string {
  const match = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match ? match[1].trim() : text;
}

function extractBalancedJsonObject(text: string): string | null {
  const start = text.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i += 1) {
    const char = text[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = inString;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }

  return null;
}

const LINK_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'url', 'whyRelevant'],
  properties: {
    title: { type: 'string', minLength: 1 },
    url: { type: 'string' },
    whyRelevant: { type: 'string', minLength: 1 },
  },
};

const ANALYSIS_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'nextBestAction',
    'missingInfo',
    'frustration',
    'errata',
    'similarTickets',
    'suggestedReply',
  ],
  properties: {
    nextBestAction: {
      type: 'object',
      additionalProperties: false,
      required: ['action', 'actionType', 'reasoning', 'urgency', 'replySnippet', 'alternatives'],
      properties: {
        action: { type: 'string', minLength: 1 },
        actionType: {
          type: 'string',
          enum: [
            'ask_missing_info',
            'share_errata_workaround',
            'standard_troubleshooting',
            'request_staging_access',
            'request_duplicator_package',
            'escalate_to_second_tier',
            'wait_for_customer',
            'link_similar_ticket',
            'test_conflict',
          ],
        },
        reasoning: { type: 'string', minLength: 1 },
        urgency: { type: 'string', enum: ['low', 'normal', 'high'] },
        replySnippet: { type: 'string', minLength: 1 },
        alternatives: {
          type: 'array',
          maxItems: 2,
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['action', 'whenToUse'],
            properties: {
              action: { type: 'string', minLength: 1 },
              whenToUse: { type: 'string', minLength: 1 },
            },
          },
        },
      },
    },
    missingInfo: {
      type: 'array',
      maxItems: 5,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['item', 'reason', 'priority', 'suggestedAsk'],
        properties: {
          item: { type: 'string', minLength: 1 },
          reason: { type: 'string', minLength: 1 },
          priority: { type: 'string', enum: ['high', 'medium', 'low'] },
          suggestedAsk: { type: 'string', minLength: 1 },
        },
      },
    },
    frustration: {
      type: 'object',
      additionalProperties: false,
      required: ['score', 'label', 'reasoning'],
      properties: {
        score: { type: 'integer', minimum: 1, maximum: 10 },
        label: { type: 'string', minLength: 1 },
        reasoning: { type: 'string', minLength: 1 },
      },
    },
    errata: {
      type: 'array',
      maxItems: 5,
      items: LINK_SCHEMA,
    },
    similarTickets: {
      type: 'array',
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'url', 'status', 'whySimilar'],
        properties: {
          title: { type: 'string', minLength: 1 },
          url: { type: 'string' },
          status: { type: ['string', 'null'] },
          whySimilar: { type: 'string', minLength: 1 },
        },
      },
    },
    suggestedReply: {
      type: 'object',
      additionalProperties: false,
      required: ['body', 'confidence', 'confidenceReasoning', 'sources'],
      properties: {
        body: { type: 'string', minLength: 1 },
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        confidenceReasoning: { type: 'string', minLength: 1 },
        sources: {
          type: 'array',
          maxItems: 5,
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['type', 'url', 'title'],
            properties: {
              type: { type: 'string', enum: ['errata', 'ticket', 'general'] },
              url: { type: ['string', 'null'] },
              title: { type: 'string', minLength: 1 },
            },
          },
        },
      },
    },
  },
};
