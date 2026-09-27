// Cookieless analytics: config parsing, the snippet's attributes, the
// excluded-path rule, and the single page-view dispatcher that every
// provider runs through. All pure, so the state machine can be property
// tested without a browser.

export type AnalyticsProvider = 'plausible' | 'umami' | 'goatcounter';

export const ANALYTICS_PROVIDERS: readonly AnalyticsProvider[] = ['plausible', 'umami', 'goatcounter'];

export type AnalyticsConfig = {
  provider: AnalyticsProvider;
  scriptUrl: string;
  siteId: string;
};

const ENV_KEYS = {
  provider: 'PUBLIC_ANALYTICS_PROVIDER',
  scriptUrl: 'PUBLIC_ANALYTICS_SCRIPT_URL',
  siteId: 'PUBLIC_ANALYTICS_SITE_ID',
} as const;

const trimmed = (value: string | undefined): string => (value ?? '').trim();

/**
 * A config is valid only when all three values are present and exact: a known
 * provider name (case-sensitive), an absolute https: script URL, and a
 * non-empty site id. Anything else disables the snippet entirely.
 */
export function parseAnalyticsConfig(
  env: Record<string, string | undefined>,
): AnalyticsConfig | null {
  const provider = trimmed(env[ENV_KEYS.provider]);
  const scriptUrl = trimmed(env[ENV_KEYS.scriptUrl]);
  const siteId = trimmed(env[ENV_KEYS.siteId]);

  if (!ANALYTICS_PROVIDERS.includes(provider as AnalyticsProvider)) return null;

  let parsed: URL;
  try {
    parsed = new URL(scriptUrl);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:') return null;
  if (siteId === '') return null;

  return { provider: provider as AnalyticsProvider, scriptUrl, siteId };
}

/** Runtime env first (Docker/K8s inject after the build), then the baked values. */
export function readAnalyticsEnv(): Record<string, string | undefined> {
  const runtime = typeof process !== 'undefined' ? process.env : undefined;
  const baked = (import.meta.env ?? {}) as Record<string, string | undefined>;
  const read = (key: string) => runtime?.[key] ?? baked[key];
  return {
    [ENV_KEYS.provider]: read(ENV_KEYS.provider),
    [ENV_KEYS.scriptUrl]: read(ENV_KEYS.scriptUrl),
    [ENV_KEYS.siteId]: read(ENV_KEYS.siteId),
  };
}

export function isAnalyticsProvider(value: string): value is AnalyticsProvider {
  return ANALYTICS_PROVIDERS.includes(value as AnalyticsProvider);
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * The snippet's attributes. Every provider runs in manual mode: automatic
 * history tracking is switched off so the single dispatcher below is the only
 * thing that can record a page view.
 */
export function snippetAttributes(cfg: AnalyticsConfig): Record<string, string | boolean> {
  const attributes: Record<string, string | boolean> = {
    src: cfg.scriptUrl,
    defer: true,
    'data-analytics-provider': cfg.provider,
  };

  if (cfg.provider === 'plausible') {
    attributes['data-domain'] = cfg.siteId;
  } else if (cfg.provider === 'umami') {
    attributes['data-website-id'] = cfg.siteId;
    attributes['data-auto-track'] = 'false';
  } else {
    attributes['data-goatcounter'] = isHttpsUrl(cfg.siteId)
      ? cfg.siteId
      : `https://${cfg.siteId}.goatcounter.com/count`;
    attributes['data-goatcounter-settings'] = '{"no_onload":true}';
  }

  return attributes;
}

/** /login and everything under /admin are never counted. */
export function isExcludedPath(pathname: string): boolean {
  return pathname === '/login' || pathname.startsWith('/admin');
}

export function shouldRenderSnippet(pathname: string, cfg: AnalyticsConfig | null): boolean {
  return cfg !== null && !isExcludedPath(pathname);
}

/** The pathname only: no query string, no fragment. */
export function pageViewPath(href: string): string {
  return new URL(href).pathname;
}

export type PageViewTracker = { onPageLoad(href: string): void };

/**
 * The one choke point for page views. Excluded paths and repeated paths are
 * recorded but never sent, so one navigation yields exactly one page view
 * and a query-string-only change yields none.
 */
export function createPageViewTracker(send: (path: string) => void): PageViewTracker {
  let lastPath: string | undefined;
  return {
    onPageLoad(href: string): void {
      const path = pageViewPath(href);
      if (isExcludedPath(path)) {
        lastPath = path;
        return;
      }
      if (path === lastPath) return;
      lastPath = path;
      send(path);
    },
  };
}
