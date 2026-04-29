import { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { browser } from 'wxt/browser';
import { clearTicketCache } from '@/lib/storage';
import {
  DEFAULT_ANTHROPIC_MODEL,
  DEFAULT_OPENAI_MODEL,
  DEFAULT_SETTINGS,
  getSettings,
  saveSettings,
} from '@/lib/settings';
import type { AiProvider, BackgroundResponse, ExtensionSettings, SectionToggles } from '@/lib/types';

const ANTHROPIC_MODELS = [
  DEFAULT_ANTHROPIC_MODEL,
  'claude-3-5-haiku-latest',
  'claude-3-opus-latest',
];

const OPENAI_MODELS = [DEFAULT_OPENAI_MODEL, 'gpt-4.1', 'gpt-4o-mini'];

type StatusState = { type: 'idle' } | { type: 'pending'; message: string } | { type: 'ok'; message: string } | { type: 'error'; message: string };

function OptionsPage() {
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [status, setStatus] = useState<StatusState>({ type: 'idle' });
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    void getSettings().then(setSettings);
  }, []);

  async function persist(next: ExtensionSettings) {
    setSettings(next);
    await saveSettings(next);
    setStatus({ type: 'ok', message: 'Saved' });
  }

  async function testCurrentKey() {
    setTesting(true);
    setStatus({ type: 'pending', message: 'Testing API key…' });
    try {
      const provider = settings.providers.provider;
      const apiKey =
        provider === 'anthropic'
          ? settings.providers.anthropicApiKey
          : settings.providers.openaiApiKey;
      const model =
        provider === 'anthropic'
          ? settings.providers.anthropicModel
          : settings.providers.openaiModel;
      const response = (await browser.runtime.sendMessage({
        type: 'TEST_API_KEY',
        provider,
        apiKey,
        model,
      })) as BackgroundResponse<{ ok: true }>;
      if (!response.ok) throw new Error(response.error ?? 'API key test failed');
      setStatus({ type: 'ok', message: 'API key is valid' });
    } catch (error) {
      setStatus({ type: 'error', message: error instanceof Error ? error.message : String(error) });
    } finally {
      setTesting(false);
    }
  }

  async function clearCache() {
    await clearTicketCache();
    setStatus({ type: 'ok', message: 'Ticket cache cleared' });
  }

  const provider = settings.providers.provider;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 font-sans text-stone-900">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">WPML Support Assistant</h1>
        <p className="mt-1 text-sm text-stone-600">Settings</p>
      </header>

      <section className="border-b border-stone-200 py-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold">Extension</h2>
            <p className="mt-1 text-xs text-stone-600">Enable the floating assistant on WPML ticket pages.</p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(event) => void persist({ ...settings, enabled: event.target.checked })}
            />
            Enabled
          </label>
        </div>
      </section>

      <section className="border-b border-stone-200 py-6">
        <h2 className="text-sm font-semibold">AI Provider</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Provider">
            <select
              value={provider}
              onChange={(event) =>
                void persist({
                  ...settings,
                  providers: { ...settings.providers, provider: event.target.value as AiProvider },
                })
              }
            >
              <option value="anthropic">Anthropic Claude</option>
              <option value="openai">OpenAI ChatGPT</option>
            </select>
          </Field>

          <Field label="Model">
            <select
              value={provider === 'anthropic' ? settings.providers.anthropicModel : settings.providers.openaiModel}
              onChange={(event) =>
                void persist({
                  ...settings,
                  providers: {
                    ...settings.providers,
                    [provider === 'anthropic' ? 'anthropicModel' : 'openaiModel']: event.target.value,
                  },
                })
              }
            >
              {(provider === 'anthropic' ? ANTHROPIC_MODELS : OPENAI_MODELS).map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Anthropic API key">
            <input
              type="password"
              value={settings.providers.anthropicApiKey}
              onChange={(event) =>
                void persist({
                  ...settings,
                  providers: { ...settings.providers, anthropicApiKey: event.target.value },
                })
              }
              placeholder="sk-ant-..."
            />
          </Field>

          <Field label="OpenAI API key">
            <input
              type="password"
              value={settings.providers.openaiApiKey}
              onChange={(event) =>
                void persist({
                  ...settings,
                  providers: { ...settings.providers, openaiApiKey: event.target.value },
                })
              }
              placeholder="sk-..."
            />
          </Field>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            disabled={testing}
            onClick={() => void testCurrentKey()}
            className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-800 hover:bg-stone-50 disabled:opacity-50"
          >
            {testing ? 'Testing…' : 'Test API key'}
          </button>
          <StatusBadge status={status} />
        </div>
      </section>

      <section className="border-b border-stone-200 py-6">
        <h2 className="text-sm font-semibold">Sections</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {SECTION_LABELS.map(([key, label]) => (
            <label key={key} className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.sections[key]}
                onChange={(event) =>
                  void persist({
                    ...settings,
                    sections: { ...settings.sections, [key]: event.target.checked },
                  })
                }
              />
              {label}
            </label>
          ))}
        </div>
      </section>

      <section className="border-b border-stone-200 py-6">
        <h2 className="text-sm font-semibold">Custom Instructions</h2>
        <textarea
          value={settings.customInstructions}
          onChange={(event) => void persist({ ...settings, customInstructions: event.target.value })}
          rows={5}
          className="mt-3 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
          placeholder="Optional tone, style, or support-process instructions."
        />
      </section>

      <section className="py-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void clearCache()}
            className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-800 hover:bg-stone-50"
          >
            Clear ticket cache
          </button>
          {status.type !== 'idle' && status.message === 'Ticket cache cleared' && (
            <StatusBadge status={status} />
          )}
        </div>
      </section>
    </main>
  );
}

const SECTION_LABELS: Array<[keyof SectionToggles, string]> = [
  ['frustration', 'Frustration'],
  ['errata', 'Errata'],
  ['customerHistory', 'Customer history'],
  ['similarTickets', 'Similar tickets'],
  ['suggestedReply', 'Suggested reply'],
];

function StatusBadge({ status }: { status: StatusState }) {
  if (status.type === 'idle') return null;

  if (status.type === 'pending') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-stone-500">
        <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        {status.message}
      </span>
    );
  }

  if (status.type === 'ok') {
    return (
      <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="6.25" stroke="#059669" strokeWidth="1.5" />
          <path d="M4 7l2.5 2.5L10 4.5" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {status.message}
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1.5 text-xs font-medium text-red-700">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="6.25" stroke="#b91c1c" strokeWidth="1.5" />
        <path d="M4.5 4.5l5 5M9.5 4.5l-5 5" stroke="#b91c1c" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      {status.message}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs font-medium text-stone-700">
      <span>{label}</span>
      <div className="mt-1 [&_input]:w-full [&_input]:rounded-md [&_input]:border [&_input]:border-stone-300 [&_input]:px-3 [&_input]:py-2 [&_input]:text-sm [&_select]:w-full [&_select]:rounded-md [&_select]:border [&_select]:border-stone-300 [&_select]:px-3 [&_select]:py-2 [&_select]:text-sm">
        {children}
      </div>
    </label>
  );
}

const root = document.getElementById('app');
if (root) ReactDOM.createRoot(root).render(<OptionsPage />);
