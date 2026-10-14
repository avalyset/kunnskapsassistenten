import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { FEATURE_FLAGS_HASH, FLAG_LINK_PARAM, turnOnFromLink } from '../../flags';
import { SETTINGS_HASH } from '../../views/chat/displayLevel';
import { SETTINGS_PATH } from './SettingsPage';

/**
 * Old links to the hidden menus land on the settings page: `#innstillinger`, `#feature-flags`,
 * and `?flagg=a,b`, which still turns those flags on (never off) first. `replace`, so Back does
 * not walk into the link and turn the flag on again. Mounted in the shell, so it works on every
 * route.
 */
export function useSettingsLinks(): void {
  const { search, hash } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(search);
    const flagLink = params.has(FLAG_LINK_PARAM);
    if (!flagLink && hash !== SETTINGS_HASH && hash !== FEATURE_FLAGS_HASH) return;

    if (flagLink) turnOnFromLink(params.getAll(FLAG_LINK_PARAM));
    params.delete(FLAG_LINK_PARAM);
    const rest = params.toString();
    navigate({ pathname: `/${SETTINGS_PATH}`, search: rest ? `?${rest}` : '' }, { replace: true });
  }, [search, hash, navigate]);
}
