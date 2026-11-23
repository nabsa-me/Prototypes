import { TRACKING_CODE_ALPHABET, TRACKING_CODE_LENGTH } from '@fita/contracts';

/** Returns a uniformly distributed integer in [0, max). */
export type RandomIndex = (max: number) => number;

/** `FIT-` followed by 6 characters of the unambiguous alphabet: 31^6 ≈ 8.9·10^8 codes. */
export function generateTrackingCode(randomIndex: RandomIndex): string {
  let suffix = '';
  for (let i = 0; i < TRACKING_CODE_LENGTH; i++) {
    suffix += TRACKING_CODE_ALPHABET[randomIndex(TRACKING_CODE_ALPHABET.length)];
  }
  return `FIT-${suffix}`;
}
