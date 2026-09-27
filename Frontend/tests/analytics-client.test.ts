/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

// The browser dispatcher must never turn a blocked or failed analytics script
// into a page error. These tests drive the real module against a script
// element that fires `error`, and check that navigation keeps working.
const ANALYTICS_CLIENT = '../src/lib/analyticsClient';

type ProviderCall = { provider: string; payload: unknown };

let calls: ProviderCall[] = [];

// The client registers an astro:page-load listener at module evaluation, and
// each test re-imports it, so the listeners are tracked and removed after
// every test. Without this an earlier test's dispatcher would keep firing
// during a later one.
let registered: Array<[string, EventListenerOrEventListenerObject]> = [];
let realAddEventListener: typeof document.addEventListener;

function installProvider(name: string): void {
  (window as unknown as Record<string, unknown>)[name] = (...args: unknown[]) => {
    calls.push({ provider: name, payload: args });
  };
}

function addSnippet(provider: string): HTMLScriptElement {
  const script = document.createElement('script');
  script.setAttribute('data-analytics-provider', provider);
  script.setAttribute('src', 'https://cdn.example/script.js');
  document.head.appendChild(script);
  return script;
}

async function loadClient(): Promise<void> {
  vi.resetModules();
  await import(ANALYTICS_CLIENT);
}

beforeEach(() => {
  calls = [];
  registered = [];
  realAddEventListener = document.addEventListener.bind(document);
  document.addEventListener = ((type: string, handler: EventListenerOrEventListenerObject, options?: unknown) => {
    registered.push([type, handler]);
    return realAddEventListener(type, handler, options as never);
  }) as typeof document.addEventListener;

  document.head.innerHTML = '';
  document.body.innerHTML = '';
  document.cookie = '';
  window.localStorage.clear();
  window.sessionStorage.clear();
  window.history.replaceState({}, '', '/');
  delete (window as unknown as Record<string, unknown>).plausible;
  delete (window as unknown as Record<string, unknown>).umami;
  delete (window as unknown as Record<string, unknown>).goatcounter;
});

afterEach(() => {
  for (const [type, handler] of registered) {
    document.removeEventListener(type, handler);
  }
  document.addEventListener = realAddEventListener;
  vi.resetModules();
});

describe('analytics client failure handling', () => {
  test('a script that fires error is swallowed and navigation still works', async () => {
    const script = addSnippet('plausible');
    await loadClient();

    expect(() => script.dispatchEvent(new Event('error'))).not.toThrow();

    // The dispatcher registered a load listener, so a later load still lands.
    installProvider('plausible');
    window.history.replaceState({}, '', '/notes/example');
    expect(() =>
      document.dispatchEvent(new Event('astro:page-load')),
    ).not.toThrow();
    expect(calls).toHaveLength(1);
  });

  test('a provider that throws does not escape into the page', async () => {
    addSnippet('plausible');
    (window as unknown as Record<string, unknown>).plausible = () => {
      throw new Error('provider exploded');
    };
    await loadClient();
    expect(() => document.dispatchEvent(new Event('astro:page-load'))).not.toThrow();
  });

  test('no page view is sent while the provider global is missing and the script never loads', async () => {
    addSnippet('plausible');
    await loadClient();
    window.history.replaceState({}, '', '/now');
    document.dispatchEvent(new Event('astro:page-load'));
    expect(calls).toHaveLength(0);
  });

  test('one navigation sends exactly one view when the provider is present', async () => {
    addSnippet('plausible');
    installProvider('plausible');
    await loadClient();
    calls = []; // the module-init view for the initial page
    window.history.replaceState({}, '', '/projects');
    document.dispatchEvent(new Event('astro:page-load'));
    expect(calls).toHaveLength(1);
  });

  test('an excluded path is never counted, even with the provider loaded', async () => {
    addSnippet('plausible');
    installProvider('plausible');
    await loadClient();
    calls = [];
    window.history.replaceState({}, '', '/admin/projects');
    document.dispatchEvent(new Event('astro:page-load'));
    window.history.replaceState({}, '', '/login');
    document.dispatchEvent(new Event('astro:page-load'));
    expect(calls).toHaveLength(0);
  });

  test('the query string and fragment are stripped before the provider is called', async () => {
    addSnippet('plausible');
    installProvider('plausible');
    await loadClient();
    calls = [];
    window.history.replaceState({}, '', '/notes/example?ref=x#intro');
    document.dispatchEvent(new Event('astro:page-load'));
    expect(calls).toHaveLength(1);
    expect(JSON.stringify(calls[0]!.payload)).not.toContain('ref=x');
    expect(JSON.stringify(calls[0]!.payload)).not.toContain('intro');
  });

  test('the client writes no cookie and no web storage', async () => {
    addSnippet('plausible');
    installProvider('plausible');
    await loadClient();
    document.dispatchEvent(new Event('astro:page-load'));
    expect(document.cookie).toBe('');
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });

  test('with no snippet element the module is inert', async () => {
    installProvider('plausible');
    await loadClient();
    window.history.replaceState({}, '', '/now');
    expect(() => document.dispatchEvent(new Event('astro:page-load'))).not.toThrow();
    expect(calls).toHaveLength(0);
  });

  test('umami and goatcounter use their manual page-view calls', async () => {
    calls = [];
    (window as unknown as Record<string, unknown>).umami = {
      track: (payload: (props: Record<string, unknown>) => Record<string, unknown>) => {
        calls.push({ provider: 'umami', payload: payload({ referrer: 'r' }) });
      },
    };
    addSnippet('umami');
    await loadClient();
    calls = [];
    window.history.replaceState({}, '', '/work');
    document.dispatchEvent(new Event('astro:page-load'));
    expect(calls[0]!.payload).toEqual({ referrer: 'r', url: '/work' });
  });
});
