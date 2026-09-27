/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    adminGate?: {
      reachable: boolean;
      user: { id: string; email: string; is_admin: boolean } | null;
    };
    // Request-scoped promise cache for CMS fetchers; set by middleware.
    cmsCache: Map<string, Promise<unknown>>;
  }
}
