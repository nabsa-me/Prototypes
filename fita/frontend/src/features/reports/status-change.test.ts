import { describe, expect, it } from 'vitest';
import { needsNote, nextStatuses, validateStatusChange } from './status-change.ts';

const open = { status: 'open', version: 3 } as const;
const reviewing = { status: 'in_review', version: 4 } as const;

describe('nextStatuses and needsNote', () => {
  it('offers only the moves the state machine allows', () => {
    expect(nextStatuses('open')).toEqual(['in_review', 'dismissed']);
    expect(nextStatuses('resolved')).toEqual([]);
  });

  it('asks for a note only for final statuses', () => {
    expect([
      needsNote('resolved'),
      needsNote('dismissed'),
      needsNote('in_review'),
      needsNote(''),
    ]).toEqual([true, true, false, false]);
  });
});

describe('validateStatusChange', () => {
  it('sends the version the user is looking at and no note when the field is empty', () => {
    expect(validateStatusChange({ status: 'in_review', note: '' }, open)).toEqual({
      ok: true,
      change: { status: 'in_review', version: 3 },
    });
  });

  it('sends the note when there is one', () => {
    expect(validateStatusChange({ status: 'resolved', note: 'Fixed.' }, reviewing)).toEqual({
      ok: true,
      change: { status: 'resolved', publicNote: 'Fixed.', version: 4 },
    });
  });

  it('asks for a status', () => {
    expect(validateStatusChange({ status: '', note: '' }, open)).toEqual({
      ok: false,
      errors: { status: 'Tria el nou estat.' },
    });
  });

  it('refuses a status the current one cannot move to', () => {
    expect(validateStatusChange({ status: 'resolved', note: 'Fixed.' }, open)).toMatchObject({
      ok: false,
      errors: { status: 'Tria el nou estat.' },
    });
  });

  it.each([
    ['empty', ''],
    ['only spaces', '   '],
  ])('asks for a note when closing with a note that is %s', (_label, note) => {
    expect(validateStatusChange({ status: 'dismissed', note }, reviewing)).toEqual({
      ok: false,
      errors: { note: "Escriu una nota per a qui va reportar l'error." },
    });
  });

  it('caps the note length', () => {
    expect(validateStatusChange({ status: 'in_review', note: 'a'.repeat(1001) }, open)).toEqual({
      ok: false,
      errors: { note: 'Com a màxim 1000 caràcters.' },
    });
  });
});
