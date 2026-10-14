import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { forgetFlags, isFlagOn } from '../../flags';
import { getFooterMode, resetFooterMode } from '../../layout/footerMode';
import { getDisplayLevel, resetDisplayLevel } from '../../views/chat/displayLevel';
import { SettingsPage } from './SettingsPage';
import { useSettingsLinks } from './useSettingsLinks';

/** Skriver adressen ut, så en test kan lese hvor en gammel lenke landet. */
function Address() {
  const { pathname, search, hash } = useLocation();
  return <p data-testid="adresse">{pathname + search + hash}</p>;
}

function Links() {
  useSettingsLinks();
  return <Address />;
}

function open(at = '/innstillinger') {
  render(
    <MemoryRouter initialEntries={[at]}>
      <Links />
      <Routes>
        <Route path="innstillinger" element={<SettingsPage />} />
        <Route path="*" element={null} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  resetDisplayLevel();
  resetFooterMode();
  forgetFlags();
});

describe('SettingsPage', () => {
  it('har fargemodus, svarvisningen og eksperimentene', () => {
    open();

    expect(screen.getByRole('heading', { level: 1, name: 'Innstillinger' })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Fargemodus' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: /Standard/u })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: 'Eksperimenter' })).toBeTruthy();
  });

  it('skifter svarvisning med én gang', () => {
    open();

    const detailed = screen.getByRole('radio', { name: /Detaljert/u }) as HTMLInputElement;
    fireEvent.click(detailed);

    expect(getDisplayLevel()).toBe('detaljert');
    expect(detailed.checked).toBe(true);
  });

  it('har fot-valget lokalt, og to valg som ikke endrer hverandre', () => {
    // Vitest kjører med `import.meta.env.DEV`, som utviklingsserveren.
    open();

    fireEvent.click(screen.getByRole('radio', { name: /Festet/u }));

    expect(getFooterMode()).toBe('pinned');
    expect(getDisplayLevel()).toBe('standard');
  });

  it('slår på et eksperiment med bryteren', () => {
    open();

    const toggle = screen.getByRole('switch', {
      name: /Årsfilter med perioder/u,
    }) as HTMLInputElement;
    expect(toggle.checked).toBe(false);
    fireEvent.click(toggle);

    expect(isFlagOn('year-ranges')).toBe(true);
    // Bryteren viser det den gjorde, ikke bare flagget.
    expect(toggle.checked).toBe(true);
  });

  it('lenker til saken for eksperimentet, i ny fane og sagt i ord', () => {
    open();

    const link = screen.getByRole('link', { name: /^Sak 115 ?\(åpnes i ny fane\)$/u });
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('href')).toBe(
      'https://github.com/digdir/kunnskapsassistenten/issues/115',
    );
  });
});

describe('gamle lenker', () => {
  it('sender #innstillinger til siden', () => {
    open('/threads/abc#innstillinger');

    expect(screen.getByTestId('adresse').textContent).toBe('/innstillinger');
  });

  it('sender #feature-flags til siden', () => {
    open('/#feature-flags');

    expect(screen.getByTestId('adresse').textContent).toBe('/innstillinger');
  });

  it('slår på flagget i ?flagg= og tar parameteren ut, men beholder resten', () => {
    open('/?flagg=year-ranges&annet=1');

    expect(isFlagOn('year-ranges')).toBe(true);
    expect(screen.getByTestId('adresse').textContent).toBe('/innstillinger?annet=1');
    expect(
      (screen.getByRole('switch', { name: /Årsfilter med perioder/u }) as HTMLInputElement).checked,
    ).toBe(true);
  });

  it('lar andre adresser være', () => {
    open('/threads/abc');

    expect(screen.getByTestId('adresse').textContent).toBe('/threads/abc');
  });
});
