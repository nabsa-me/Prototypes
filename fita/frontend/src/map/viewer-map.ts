import type { InitialView, ViewerConfig } from '@fita/contracts';
import {
  AttributionControl,
  Map as MapLibreMap,
  NavigationControl,
  setWorkerUrl,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import './viewer-map.css';
import { firstSymbolLayerId, rasterLayerId, rasterVisibility } from './basemaps.ts';

// MapLibre locates its worker next to its own module. Vite's dependency pre-bundling moves
// the module, so the worker URL is given explicitly.
setWorkerUrl(workerUrl);

const TERRAIN_SOURCE = 'fita-terrain';

/** Catalan texts for MapLibre's built-in controls. */
const LOCALE = {
  'AttributionControl.ToggleAttribution': "Mostra o amaga l'atribució",
  'AttributionControl.MapFeedback': 'Comentaris sobre el mapa',
  'Map.Title': 'Mapa',
  'Marker.Title': 'Marcador',
  'NavigationControl.ResetBearing': 'Arrossega per girar el mapa; clica per tornar al nord',
  'NavigationControl.ZoomIn': 'Apropa',
  'NavigationControl.ZoomOut': 'Allunya',
  'Popup.Close': 'Tanca',
};
export const TERRAIN_EXAGGERATION = 1;

export interface ViewerMap {
  readonly map: MapLibreMap;
  setBasemap(id: string): void;
  destroy(): void;
}

/** Builds a MapLibre map from a validated viewer configuration. */
export function createViewerMap(options: {
  container: HTMLElement;
  config: ViewerConfig;
  view: InitialView;
  basemapId: string;
}): ViewerMap {
  const { config, view } = options;
  let activeBasemap = options.basemapId;
  let styleReady = false;

  const map = new MapLibreMap({
    container: options.container,
    style: config.style,
    center: view.center,
    zoom: view.zoom,
    bearing: view.bearing,
    pitch: view.pitch,
    maxPitch: 85,
    attributionControl: false,
    locale: LOCALE,
  });
  map.addControl(new AttributionControl({ compact: false }), 'bottom-right');
  map.addControl(new NavigationControl({ visualizePitch: true }), 'top-right');

  const applyBasemap = () => {
    for (const { layerId, visible } of rasterVisibility(config.basemaps, activeBasemap)) {
      map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
    }
  };

  // 'style.load' fires once the style is parsed; 'load' would wait for every initial tile.
  map.once('style.load', () => {
    const beforeId = firstSymbolLayerId(map.getStyle().layers);
    for (const basemap of config.basemaps) {
      if (basemap.kind !== 'raster') continue;
      const id = rasterLayerId(basemap.id);
      map.addSource(id, {
        type: 'raster',
        tiles: basemap.tiles,
        tileSize: basemap.tileSize,
        maxzoom: basemap.maxzoom,
        attribution: basemap.attribution,
      });
      map.addLayer({ id, type: 'raster', source: id, layout: { visibility: 'none' } }, beforeId);
    }

    if (config.terrain) {
      const terrain = config.terrain;
      map.addSource(TERRAIN_SOURCE, {
        type: 'raster-dem',
        tiles: terrain.tiles,
        tileSize: terrain.tileSize,
        minzoom: terrain.minzoom,
        maxzoom: terrain.maxzoom,
        encoding: terrain.encoding,
        bounds: terrain.bounds,
        attribution: terrain.attribution,
      });
      map.setTerrain({ source: TERRAIN_SOURCE, exaggeration: TERRAIN_EXAGGERATION });
    }

    styleReady = true;
    applyBasemap();
  });

  return {
    map,
    setBasemap(id) {
      activeBasemap = id;
      if (styleReady) applyBasemap();
    },
    destroy() {
      map.remove();
    },
  };
}
