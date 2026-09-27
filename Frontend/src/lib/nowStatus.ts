// The home page's one-line "now" summary: what is being built and when it was
// last stamped. Deliberately minimal — the availability status and the now
// entry's description are not read here, so the row stays a single line.

import { nowContent } from '../data/site';
import type { NowCurrent } from './cms';

export type NowPayload = { current: NowCurrent | null } | null;

export type NowStatusView = {
  title: string;
  updatedLabel: string;
  /** The source entry's own label, e.g. "CURRENTLY BUILDING". */
  label: string;
  ariaLabel: string;
};

/** Live `current` is only usable when it has a real label and a real title. */
function usable(current: NowCurrent | null | undefined): current is NowCurrent {
  return Boolean(current?.label?.trim()) && Boolean(current?.title?.trim());
}

export function buildNowStatus(liveNow: NowPayload): NowStatusView {
  const source = usable(liveNow?.current) ? liveNow.current : nowContent.current;
  return {
    title: source.title,
    updatedLabel: source.updated_label,
    label: source.label,
    ariaLabel: `Now: ${source.title} — since ${source.updated_label}`,
  };
}
