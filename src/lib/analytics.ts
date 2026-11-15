/** Content-free event counters. The name of the event is all that is ever sent: no body, no ids, no cookies. */
export const EVENTS = ['dry_run_done', 'free_export_done', 'paid_export_done', 'export_failed', 'checkout_started'] as const;
export type EventName = (typeof EVENTS)[number];

export function track(event: string, relayUrl = ''): boolean {
  if (!relayUrl || !(EVENTS as readonly string[]).includes(event)) return false;
  if (typeof navigator === 'undefined' || !navigator.sendBeacon) return false;
  return navigator.sendBeacon(`${relayUrl}/e/${event}`);
}
