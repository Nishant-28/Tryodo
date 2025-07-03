import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface SlotPhaseInput {
  start_time: string; // "HH:mm"
  end_time: string; // not used yet
  cutoff_time: string; // "HH:mm"
  pickup_delay_minutes: number;
  delivery_date: string; // "YYYY-MM-DD"
}

/**
 * Returns one of the four phases of a delivery slot relative to the provided `now` time:
 *  - "open"          : before cutoff, customers can still place orders
 *  - "preparation"   : cutoff passed, 15-minute prep window for vendors
 *  - "ready_for_pickup" : prep window over, waiting for DP
 *  - "post_pickup"   : after pickup window (handled by DP status)
 */
export function getSlotPhase(slot: SlotPhaseInput, now: Date = new Date()): 'open' | 'preparation' | 'ready_for_pickup' | 'post_pickup' {
  const cutoff = new Date(`${slot.delivery_date}T${slot.cutoff_time}`);
  const prepEnd = new Date(cutoff.getTime() + 15 * 60_000);
  const pickupStart = prepEnd; // same as prepEnd
  const pickupEnd = new Date(cutoff.getTime() + slot.pickup_delay_minutes * 60_000);

  if (now < cutoff) return 'open';
  if (now < prepEnd) return 'preparation';
  if (now < pickupEnd) return 'ready_for_pickup';
  return 'post_pickup';
}
