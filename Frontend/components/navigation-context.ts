import { createContext } from 'react';

type Router = { push: (href: string) => void };
export type NavigationContextValue = { startTransition: (href: string, router: Router) => void };
export const NavigationContext = createContext<NavigationContextValue | null>(null);
