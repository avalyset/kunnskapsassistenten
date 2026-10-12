import { act, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { defaultViewportWidth, setViewportWidth } from '../test/matchMedia';
import { LayoutProvider } from './LayoutProvider';
import { Shell } from './Shell';
import { useLayout } from './useLayout';

/**
 * Focus lent to a modal dialog elsewhere (the flags menu) while a sidebar collapses. The browser
 * hands it back on close, to an element the collapse has hidden, and Chromium then leaves it in
 * the closed dialog until it drops to `<body>`. jsdom does no hand-back, so each test does the
 * browser's part: nothing when the element is hidden, focusing it when it is not.
 */

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

beforeEach(() => {
  window.localStorage.clear();
  setViewportWidth(defaultViewportWidth);
});
afterEach(() => {
  window.localStorage.clear();
  setViewportWidth(defaultViewportWidth);
});

// Stands in for the flags menu: a modal dialog whose switch collapses the navigation panel.
function MenuProbe() {
  const { setCollapsed } = useLayout();
  return (
    <dialog open aria-label="Meny">
      <button type="button" onClick={() => setCollapsed('primary-sidebar', true)}>
        Lukk navigasjonspanelet
      </button>
    </dialog>
  );
}

function open() {
  render(
    <MemoryRouter initialEntries={['/']}>
      <LayoutProvider>
        <Routes>
          <Route path="/" element={<Shell />} />
        </Routes>
        <MenuProbe />
      </LayoutProvider>
    </MemoryRouter>,
  );
}

/** Something to stand on in the navigation panel's content, like a thread link. */
function focusInNavigationPanel(): HTMLElement {
  const content = document.querySelector('.primary-sidebar .sidebar-content');
  const target = content?.querySelector<HTMLElement>('a[href], button, select, input');
  if (!target) throw new Error('Ingenting å sette fokus på i navigasjonspanelet.');
  target.focus();
  return target;
}

function closeMenu() {
  act(() => screen.getByRole('dialog', { name: 'Meny', hidden: true }).closest('dialog')!.close());
}

describe('fokus lånt til en dialog mens navigasjonspanelet lukkes', () => {
  it('går til skinneknappen når dialogen lukkes og elementet er skjult', () => {
    open();
    focusInNavigationPanel();
    const menuButton = screen.getByRole('button', { name: 'Lukk navigasjonspanelet' });
    menuButton.focus();

    act(() => menuButton.click());
    closeMenu();

    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Vis tråder og filter' }),
    );
  });

  it('blir der nettleseren la det når panelet fortsatt er åpent', () => {
    open();
    const before = focusInNavigationPanel();
    screen.getByRole('button', { name: 'Lukk navigasjonspanelet' }).focus();

    // The browser's hand-back, which succeeds on an element that is not hidden.
    before.focus();
    closeMenu();

    expect(document.activeElement).toBe(before);
  });
});
