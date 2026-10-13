import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { SidebarFooter } from './SidebarFooter';

/**
 * Issue 85c: de tre sidene fra den gamle Kunnskapsassistenten skal
 * være å nå fra foten av navigasjonspanelet.
 */
function open(at: string) {
  render(
    <MemoryRouter initialEntries={[at]}>
      <SidebarFooter />
    </MemoryRouter>,
  );
}

const links = () => screen.getByRole('list', { name: 'Om Kunnskapsassistenten' });

describe('SidebarFooter', () => {
  it('har Innstillinger først, så de tre sidene i rekkefølgen fra den gamle', () => {
    open('/');

    const found = within(links())
      .getAllByRole('link')
      .map((link) => [link.textContent, link.getAttribute('href')]);

    expect(found).toEqual([
      ['Innstillinger', '/innstillinger'],
      ['Onboarding', '/onboarding'],
      ['Endringslogg', '/endringslogg'],
      ['Om prosjektet', '/om-prosjektet'],
    ]);
  });

  it('merker siden som er åpen, og bare den', () => {
    open('/endringslogg');

    const current = within(links())
      .getAllByRole('link')
      .filter((link) => link.getAttribute('aria-current') === 'page');

    expect(current.map((link) => link.textContent)).toEqual(['Endringslogg']);
  });

  it('merker ingen av dem når leseren står i en tråd', () => {
    open('/threads/42');

    expect(within(links()).queryByRole('link', { current: 'page' })).toBeNull();
  });

  it('har ikke fargemodus lenger, den står på Innstillinger', () => {
    open('/');

    expect(screen.queryByRole('group', { name: 'Fargemodus' })).toBeNull();
  });
});
