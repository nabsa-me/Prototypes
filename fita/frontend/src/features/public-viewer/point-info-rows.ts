import type { PointInfo } from '@fita/contracts';
import type { DescriptionItem } from '../../design-system/DescriptionList.svelte';
import { wgs84Degrees } from './coordinates.ts';

const TERRITORY_DOWN = "No disponible: l'API Territorial de l'ICGC no ha respost";
const GEOCODER_DOWN = "No disponible: el Geocodificador de l'ICGC no ha respost";

/** Altitude in metres, `null` outside the DEM, or `'pending'` while its tiles load. */
export type Elevation = number | null | 'pending';

/** The rows of the point panel, in display order, with Catalan texts. */
export function pointInfoRows(info: PointInfo, elevation: Elevation): DescriptionItem[] {
  const rows: DescriptionItem[] = [];

  if (info.territory.status === 'unavailable') {
    rows.push({ term: 'Municipi', value: TERRITORY_DOWN, muted: true });
    rows.push({ term: 'Comarca', value: TERRITORY_DOWN, muted: true });
  } else if (info.territory.data === null) {
    rows.push({ term: 'Municipi', value: 'Fora de Catalunya', muted: true });
    rows.push({ term: 'Comarca', value: 'Fora de Catalunya', muted: true });
  } else {
    rows.push({ term: 'Municipi', value: info.territory.data.municipality.name });
    rows.push({ term: 'Comarca', value: info.territory.data.county.name });
  }

  if (info.address.status === 'unavailable') {
    rows.push({ term: 'Adreça més propera', value: GEOCODER_DOWN, muted: true });
  } else if (info.address.data === null) {
    rows.push({ term: 'Adreça més propera', value: 'Cap adreça a prop', muted: true });
  } else {
    const metres = Math.round(info.address.data.distanceKm * 1000);
    const distance = metres > 0 ? ` (a ${metres} m)` : '';
    rows.push({ term: 'Adreça més propera', value: `${info.address.data.label}${distance}` });
  }

  if (elevation === 'pending') {
    rows.push({ term: 'Altitud aproximada', value: 'Carregant el relleu…', muted: true });
  } else if (elevation === null) {
    rows.push({ term: 'Altitud aproximada', value: "Fora del model d'elevacions", muted: true });
  } else {
    rows.push({ term: 'Altitud aproximada', value: `${elevation} m` });
  }

  const [x, y] = info.position.utm31n;
  rows.push({ term: 'ETRS89 UTM 31N', value: `X ${Math.round(x)} m · Y ${Math.round(y)} m` });
  const wgs84 = wgs84Degrees(info.position.wgs84);
  rows.push({ term: 'WGS84 (lat, lon)', value: `${wgs84.lat}, ${wgs84.lon}` });

  return rows;
}
