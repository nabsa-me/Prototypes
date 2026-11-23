import { TrackingCodeSchema } from '@fita/contracts';
import { describe, expect, it } from 'vitest';
import { generateTrackingCode } from './tracking-code.ts';

describe('generateTrackingCode', () => {
  it('maps random indices onto the unambiguous alphabet', () => {
    const indices = [0, 30, 5, 10, 15, 20];
    let call = 0;

    const code = generateTrackingCode(() => indices[call++] ?? 0);

    // Alphabet: 23456789ABCDEFGHJKMNPQRSTUVWXYZ
    expect(code).toBe('FIT-2Z7CHP');
  });

  it('asks for indices below the alphabet size', () => {
    const maxima: number[] = [];

    generateTrackingCode((max) => {
      maxima.push(max);
      return 0;
    });

    expect(maxima).toEqual([31, 31, 31, 31, 31, 31]);
  });

  it('produces codes the contract accepts', () => {
    const code = generateTrackingCode((max) => Math.floor(Math.random() * max));

    expect(TrackingCodeSchema.safeParse(code).success).toBe(true);
  });
});
