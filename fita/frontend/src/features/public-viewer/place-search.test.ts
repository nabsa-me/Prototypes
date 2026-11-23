import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { debounce, isSearchable, kindLabel, zoomFor } from './place-search.ts';

describe('isSearchable', () => {
  it.each([
    ['mon', true],
    ['mo', false],
    ['  mo ', false],
    ['', false],
  ])('%j -> %s', (text, expected) => {
    expect(isSearchable(text)).toBe(expected);
  });
});

describe('kindLabel and zoomFor', () => {
  it('zooms closer to an address than to a place', () => {
    expect(zoomFor('address')).toBeGreaterThan(zoomFor('place'));
    expect(kindLabel('kilometre-point')).toBe('Punt quilomètric');
  });
});

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls once with the last arguments after the pause', () => {
    const calls: string[] = [];
    const run = debounce((text: string) => calls.push(text), 300);

    run('mon');
    vi.advanceTimersByTime(200);
    run('mont');
    vi.advanceTimersByTime(299);
    expect(calls).toEqual([]);

    vi.advanceTimersByTime(1);
    expect(calls).toEqual(['mont']);
  });

  it('can be cancelled before it fires', () => {
    const calls: string[] = [];
    const run = debounce((text: string) => calls.push(text), 300);

    run('mon');
    run.cancel();
    vi.advanceTimersByTime(1000);

    expect(calls).toEqual([]);
  });
});
