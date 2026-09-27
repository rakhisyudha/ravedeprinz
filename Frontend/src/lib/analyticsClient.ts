// Browser half of the analytics integration. Bundled once and imported by
// AnalyticsSnippet.astro, so exactly one dispatcher exists per document.
//
// The provider global is often missing when the first page view fires: Astro's
// ClientRouter dispatches astro:page-load as soon as the head is in place, and
// the deferred provider script may still be in flight. The dispatcher
// therefore waits for the snippet's load event once, drops the view if the
// script errors, and never lets a provider failure escape.
//
// Nothing here touches cookies, localStorage, or sessionStorage. Only the
// path is passed to the provider; the referrer and the provider's own
// default metadata are its business.

import { createPageViewTracker, type AnalyticsProvider } from './analytics';

type PlausibleFn = (event: 'pageview', options: { u: string }) => void;

type Globals = {
  plausible?: PlausibleFn;
  umami?: { track?: (payload: (props: Record<string, unknown>) => Record<string, unknown>) => void };
  goatcounter?: { count?: (payload: { path: string }) => void };
};

/** Calls the provider's manual page-view API. Returns false when it cannot. */
function callProvider(provider: AnalyticsProvider, path: string): boolean {
  const globals = window as unknown as Globals;
  try {
    if (provider === 'plausible' && typeof globals.plausible === 'function') {
      globals.plausible('pageview', { u: `${window.location.origin}${path}` });
      return true;
    }
    if (provider === 'umami' && typeof globals.umami?.track === 'function') {
      globals.umami.track((props) => ({ ...props, url: path }));
      return true;
    }
    if (provider === 'goatcounter' && typeof globals.goatcounter?.count === 'function') {
      globals.goatcounter.count({ path });
      return true;
    }
  } catch {
    // A provider that throws costs one page view, never a page error.
    return false;
  }
  return false;
}

function start(provider: AnalyticsProvider): void {
  const tracker = createPageViewTracker((path) => {
    try {
      if (callProvider(provider, path)) return;
      const script = document.querySelector<HTMLScriptElement>('script[data-analytics-provider]');
      if (!script) return;
      // Wait for the deferred snippet exactly once; an error drops the view.
      script.addEventListener(
        'load',
        () => {
          try {
            callProvider(provider, path);
          } catch {
            /* dropped */
          }
        },
        { once: true },
      );
    } catch {
      /* dropped */
    }
  });

  const report = () => {
    try {
      tracker.onPageLoad(window.location.href);
    } catch {
      /* dropped */
    }
  };

  // Module init plus the first astro:page-load both fire; the tracker's
  // lastPath dedupe makes the duplicate a no-op.
  report();
  document.addEventListener('astro:page-load', report);
}

// The snippet is only emitted for a valid config, so its presence is the
// enable signal and its data attribute names the provider.
const snippet = document.querySelector<HTMLScriptElement>('script[data-analytics-provider]');
if (snippet) {
  start(snippet.getAttribute('data-analytics-provider') as AnalyticsProvider);
}
