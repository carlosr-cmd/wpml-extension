import { browser } from 'wxt/browser';
import type { ExtensionSettings } from './types';

export const DEFAULT_ANTHROPIC_MODEL = 'claude-sonnet-4-6';
export const DEFAULT_OPENAI_MODEL = 'gpt-4.1-mini';

export const DEFAULT_SETTINGS: ExtensionSettings = {
  enabled: true,
  providers: {
    provider: 'anthropic',
    anthropicApiKey: '',
    anthropicModel: DEFAULT_ANTHROPIC_MODEL,
    openaiApiKey: '',
    openaiModel: DEFAULT_OPENAI_MODEL,
  },
  sections: {
    frustration: true,
    errata: true,
    customerHistory: true,
    similarTickets: true,
    suggestedReply: true,
  },
  customInstructions: '',
};

const SETTINGS_KEY = 'wpmlSupportAssistant.settings';

export async function getSettings(): Promise<ExtensionSettings> {
  const stored = await browser.storage.local.get(SETTINGS_KEY);
  return mergeSettings(stored[SETTINGS_KEY] as Partial<ExtensionSettings> | undefined);
}

export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  await browser.storage.local.set({ [SETTINGS_KEY]: settings });
}

function mergeSettings(stored?: Partial<ExtensionSettings>): ExtensionSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    providers: {
      ...DEFAULT_SETTINGS.providers,
      ...stored?.providers,
    },
    sections: {
      ...DEFAULT_SETTINGS.sections,
      ...stored?.sections,
    },
  };
}
