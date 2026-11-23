import type { ReportAdminView } from '@fita/contracts';
import { describe, expect, it } from 'vitest';
import { reportsToFeatureCollection, statusColors } from './report-layer.ts';

const report: ReportAdminView = {
  code: 'FIT-7K3Q9X',
  category: 'road',
  description: 'The road number is wrong.',
  status: 'in_review',
  publicNote: null,
  createdAt: '2026-11-23T10:00:00.000Z',
  updatedAt: '2026-11-23T10:00:00.000Z',
  location: [1.8377, 41.5933],
  version: 2,
};

describe('reportsToFeatureCollection', () => {
  it('turns each report into a point carrying only its code and status', () => {
    expect(reportsToFeatureCollection([report])).toEqual({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [1.8377, 41.5933] },
          properties: { code: 'FIT-7K3Q9X', status: 'in_review' },
        },
      ],
    });
  });
});

describe('statusColors', () => {
  it('reads one design token per status', () => {
    const tokens: Record<string, string> = {
      '--color-warning': '#8a4b00',
      '--color-info': '#1d4ed8',
      '--color-success': '#166534',
      '--color-neutral': '#4b5563',
    };

    expect(statusColors((token) => tokens[token] ?? '')).toEqual({
      open: '#8a4b00',
      in_review: '#1d4ed8',
      resolved: '#166534',
      dismissed: '#4b5563',
    });
  });
});
