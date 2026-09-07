/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    adminGate?: {
      reachable: boolean;
      user: { id: string; email: string; is_admin: boolean } | null;
    };
  }
}
