import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  hooks: {
    'build:manifestGenerated': (_, manifest) => {
      if (manifest.options_ui) {
        manifest.options_ui.open_in_tab = true;
      }
    },
  },
  manifest: {
    name: 'WPML Support Assistant',
    description: 'AI-powered assistant for WPML support specialists. Analyzes tickets and suggests replies.',
    permissions: ['storage', 'unlimitedStorage'],
    host_permissions: [
      'https://wpml.org/*',
      'https://api.anthropic.com/*',
      'https://api.openai.com/*',
    ],
    action: {
      default_title: 'WPML Support Assistant',
    },
    options_ui: {
      open_in_tab: true,
      page: 'options.html',
    },
  },
});
