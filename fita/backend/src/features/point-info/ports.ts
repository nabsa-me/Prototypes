import type { Address, Territory } from '@fita/contracts';
import type { Position } from '@fita/geo';

/** Administrative units containing a point (ICGC API Territorial). */
export interface TerritoryPort {
  /** Resolves `null` when the point is outside every Catalan municipality. */
  locate(lonLat: Position): Promise<Territory | null>;
}

/** Nearest postal address to a point (ICGC Geocoder, reverse). */
export interface GeocoderPort {
  /** Resolves `null` when there is no address near the point. */
  reverse(lonLat: Position): Promise<Address | null>;
}
