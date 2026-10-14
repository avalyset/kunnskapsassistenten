// `?flagg=a,b` turns flags on, never off, so a link cannot undo someone's trial.
// `#feature-flags` was the old menu. Both now land on the settings page; see
// src/routes/settings/useSettingsLinks.ts.

import { isFlagId, setFlag, type FlagId } from './flags';

export const FEATURE_FLAGS_HASH = '#feature-flags';

export const FLAG_LINK_PARAM = 'flagg';

/** Turns on every known flag named; `?flagg=a&flagg=b` works like `?flagg=a,b`. */
export function turnOnFromLink(values: readonly string[]): FlagId[] {
  const ids = values
    .flatMap((value) => value.split(','))
    .map((id) => id.trim())
    .filter(isFlagId);
  for (const id of ids) setFlag(id, true);
  return ids;
}
