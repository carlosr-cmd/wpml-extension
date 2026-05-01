import { defineContentScript } from 'wxt/utils/define-content-script';
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root';
import { Component, type ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import { FloatingPanel } from '@/components/FloatingPanel';
import './style.css';

class ContentErrorBoundary extends Component<{ children: ReactNode }, { message: string | null }> {
  state = { message: null };

  static getDerivedStateFromError(error: unknown) {
    return { message: error instanceof Error ? error.message : String(error) };
  }

  render() {
    if (this.state.message) {
      return (
        <div
          className="fixed bottom-5 right-5 z-[2147483647] max-w-sm rounded-md border bg-white px-3 py-2 text-xs"
          style={{
            borderColor: '#fecaca',
            color: '#991b1b',
            boxShadow: '0 12px 30px rgba(0,0,0,0.14)',
          }}
        >
          WPML Support Assistant render error: {this.state.message}
        </div>
      );
    }

    return this.props.children;
  }
}

export default defineContentScript({
  matches: ['https://wpml.org/forums/topic/*', 'https://wpml.org/*/forums/topic/*'],
  cssInjectionMode: 'ui',

  async main(ctx) {
    const ui = await createShadowRootUi(ctx, {
      name: 'wpml-support-assistant',
      position: 'inline',
      anchor: 'body',
      append: 'last',
      onMount(container) {
        const root = ReactDOM.createRoot(container);
        root.render(
          <ContentErrorBoundary>
            <FloatingPanel />
          </ContentErrorBoundary>,
        );
        return root;
      },
      onRemove(root) {
        root?.unmount();
      },
    });

    ui.mount();
  },
});
