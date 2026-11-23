import { describe, expect, it } from 'vitest';
import { validateReportForm } from './report-form.ts';

const montserrat = [1.8377, 41.5933] as const;
const andorra = [1.5218, 42.5063] as const;

describe('validateReportForm', () => {
  it('returns the report the API expects', () => {
    expect(
      validateReportForm(
        { category: 'road', description: 'The road number is wrong.' },
        montserrat,
      ),
    ).toEqual({
      ok: true,
      report: {
        category: 'road',
        description: 'The road number is wrong.',
        location: [1.8377, 41.5933],
      },
    });
  });

  it('asks for a category and a longer description', () => {
    expect(validateReportForm({ category: '', description: 'short' }, montserrat)).toEqual({
      ok: false,
      errors: {
        category: 'Tria una categoria.',
        description: "Descriu l'error amb almenys 10 caràcters.",
      },
    });
  });

  it('caps the description length', () => {
    const result = validateReportForm(
      { category: 'other', description: 'a'.repeat(1001) },
      montserrat,
    );

    expect(result).toEqual({ ok: false, errors: { description: 'Com a màxim 1000 caràcters.' } });
  });

  it('rejects a point outside Catalonia even when the fields are valid', () => {
    const result = validateReportForm(
      { category: 'road', description: 'The road number is wrong.' },
      andorra,
    );

    expect(result).toEqual({
      ok: false,
      errors: { location: 'Només es poden reportar errors de punts dins de Catalunya.' },
    });
  });
});
