import { browser } from 'wxt/browser';
import { DEFAULT_SETTINGS } from './settings';
import type { ExtensionSettings } from './types';

const SETTINGS_KEY = 'wpmlSupportAssistant.settings';

export type PublicSettings = Pick<ExtensionSettings, 'enabled' | 'sections' | 'customInstructions'>;

export async function getPublicSettings(): Promise<PublicSettings> {
  const stored = await browser.storage.local.get(SETTINGS_KEY);
  const settings = stored[SETTINGS_KEY] as Partial<ExtensionSettings> | undefined;
  return {
    enabled: settings?.enabled ?? DEFAULT_SETTINGS.enabled,
    sections: {
      ...DEFAULT_SETTINGS.sections,
      ...settings?.sections,
    },
    customInstructions: settings?.customInstructions ?? '',
  };
}
