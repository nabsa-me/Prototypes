import type { PointInfo, SourceResult } from '@fita/contracts';
import type { Position } from '@fita/geo';
import { isThirdPartyFailure } from '../../../shared/upstream.ts';
import { describePosition } from '../domain/position.ts';
import type { GeocoderPort, TerritoryPort } from '../ports.ts';

export type PointInfoSource = 'territory' | 'address';

export interface PointInfoDeps {
  territory: TerritoryPort;
  geocoder: GeocoderPort;
  /** Called for each source that failed on the third party's side. */
  onSourceFailure: (source: PointInfoSource, error: unknown) => void;
}

/**
 * Aggregates both ICGC sources. A source that fails on the third party's side is reported
 * as unavailable and the rest of the answer is kept. Any other failure is a defect and
 * propagates.
 */
export async function getPointInfo(deps: PointInfoDeps, lonLat: Position): Promise<PointInfo> {
  const [territory, address] = await Promise.allSettled([
    deps.territory.locate(lonLat),
    deps.geocoder.reverse(lonLat),
  ]);

  return {
    position: describePosition(lonLat),
    territory: toSourceResult('territory', territory, deps),
    address: toSourceResult('address', address, deps),
  };
}

function toSourceResult<T>(
  source: PointInfoSource,
  settled: PromiseSettledResult<T>,
  deps: PointInfoDeps,
): SourceResult<T> {
  if (settled.status === 'fulfilled') return { status: 'ok', data: settled.value };
  if (!isThirdPartyFailure(settled.reason)) throw settled.reason;
  deps.onSourceFailure(source, settled.reason);
  return { status: 'unavailable' };
}
