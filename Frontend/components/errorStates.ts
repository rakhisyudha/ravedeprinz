// Plain data module (no 'use client'): the 404 route is a server component,
// so it can only read state values from a server-evaluated module.
// Anything exported from ErrorState.tsx is a client reference on the server.

export type ErrorStateData = {
  code: string;
  eyebrow: string;
  title: string;
  description: string;
  action: string;
};

export type ErrorStateKind =
  | 'notFound'
  | 'unauthorized'
  | 'invalidCredentials'
  | 'sessionExpired'
  | 'unavailable';

export const errorStates: Record<ErrorStateKind, ErrorStateData> = {
  notFound: {
    code: '404',
    eyebrow: 'LOST ROUTE',
    title: 'NOTHING HERE.',
    description: 'This page slipped out of the archive. Head back to the index and pick another route.',
    action: 'BACK TO INDEX',
  },
  unauthorized: {
    code: '403',
    eyebrow: 'ACCESS DENIED',
    title: 'YOU’RE NOT ON THE LIST.',
    description: 'This archive is private. Your account isn’t cleared for entry.',
    action: 'DISMISS',
  },
  invalidCredentials: {
    code: '401',
    eyebrow: 'LOGIN FAILED',
    title: 'THAT DIDN’T WORK.',
    description: 'The credentials don’t match. Check them and try again.',
    action: 'TRY AGAIN',
  },
  sessionExpired: {
    code: '401',
    eyebrow: 'SESSION LOST',
    title: 'SIGN IN AGAIN.',
    description: 'Your session has expired. The archive needs to verify you again.',
    action: 'SIGN IN',
  },
  unavailable: {
    code: '503',
    eyebrow: 'ARCHIVE OFFLINE',
    title: 'NOTHING TO SEE RIGHT NOW.',
    description: 'The archive isn’t responding. Give it a moment and try again.',
    action: 'RETRY',
  },
};
