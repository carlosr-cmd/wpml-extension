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
  const text =
    args.provider === 'anthropic'
      ? await callAnthropic(args)
      : await callOpenAI(args);
  const json = parseJson(text);
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
      max_tokens: args.maxTokens ?? 1800,
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
      max_tokens: args.maxTokens ?? 1800,
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
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('AI response did not contain JSON');
    return JSON.parse(match[0]);
  }
}
