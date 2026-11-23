import { describe, expect, it } from 'vitest';
import { isInternalNavigation, matchRoute } from './router.ts';

describe('matchRoute', () => {
  it.each([
    ['/', 'viewer'],
    ['/seguiment', 'tracking'],
    ['/seguiment/', 'tracking'],
    ['/seguiment/extra', 'not-found'],
    ['/unknown', 'not-found'],
  ])('%s -> %s', (pathname, name) => {
    expect(matchRoute(pathname).name).toBe(name);
  });
});

describe('isInternalNavigation', () => {
  const origin = 'http://127.0.0.1:5791';
  const click = {
    button: 0,
    defaultPrevented: false,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
  };
  const anchor = { href: `${origin}/seguiment`, target: '', download: false };

  it('handles a plain click on a link to this origin', () => {
    expect(isInternalNavigation(click, anchor, origin)).toBe(true);
  });

  it.each([
    ['another site', click, { ...anchor, href: 'https://www.icgc.cat/' }],
    ['a new tab target', click, { ...anchor, target: '_blank' }],
    ['a download', click, { ...anchor, download: true }],
    ['a middle click', { ...click, button: 1 }, anchor],
    ['ctrl+click', { ...click, ctrlKey: true }, anchor],
    ['a click already handled', { ...click, defaultPrevented: true }, anchor],
  ])('leaves %s to the browser', (_label, event, link) => {
    expect(isInternalNavigation(event, link, origin)).toBe(false);
  });
});
