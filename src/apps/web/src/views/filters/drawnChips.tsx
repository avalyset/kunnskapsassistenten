// Chips we draw for several values at once, over Suggestion's chip per value. Suggestion still
// holds every chosen value as a `<data>` chip of its own, which CSS hides (filters.css), so
// u-combobox ticks the options, takes one value off when a ticked option is chosen, and reads
// out and counts single values. The drawn chips come last, as `<data>` too: u-combobox gives
// ArrowLeft and Backspace from the field to the last chip, and a hidden one cannot take focus.
// `compact-filter-chips` draws one chip for the whole field; a year period can draw one per period.

import type { ReactNode } from 'react';

/** One chip for several values; removing it removes them all. */
export type DrawnChip = {
  /** Stable while the chip stands, as the key of its `<data>`. */
  key: string;
  label: string;
  values: readonly string[];
};

type Item = { value: string; label: string };

/** No key the backend sends starts with a null. */
const DRAWN = '\u0000drawn:';

const valueOf = (chip: DrawnChip) => `${DRAWN}${chip.key}`;

const isDrawn = (value: string) => value.startsWith(DRAWN);

/** Suggestion's `selected`: a chip per value, then the drawn ones. */
export function withDrawnChips(items: Item[], drawn: readonly DrawnChip[]): Item[] {
  return [...items, ...drawn.map((chip) => ({ value: valueOf(chip), label: chip.label }))];
}

/**
 * The values after a change from Suggestion: what it holds, less the values of a drawn chip it
 * no longer holds. A ticked option chosen again takes its own chip off, as without drawn chips.
 */
export function valuesAfter(
  items: readonly { value: string }[],
  drawn: readonly DrawnChip[],
): string[] {
  const kept = new Set(items.map((item) => item.value));
  const removed = new Set(
    drawn.filter((chip) => !kept.has(valueOf(chip))).flatMap((c) => c.values),
  );
  return items.map((item) => item.value).filter((value) => !isDrawn(value) && !removed.has(value));
}

/** Whether the change took a drawn chip off: its focus is then lost with it. */
export function removedDrawnChip(
  items: readonly { value: string }[],
  drawn: readonly DrawnChip[],
): boolean {
  const kept = new Set(items.map((item) => item.value));
  return drawn.some((chip) => !kept.has(valueOf(chip)));
}

/** Suggestion's `renderSelected`: the marker filters.css keeps a drawn chip visible by. */
export function renderChip({ label, value }: Item): ReactNode {
  return isDrawn(value) ? <span className="drawn-chip">{label}</span> : label;
}
