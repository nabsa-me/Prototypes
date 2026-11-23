import {
  SearchQuerySchema,
  SearchResponseSchema,
  type PlaceKind,
  type SearchResponse,
} from '@fita/contracts';
import { getJson } from '../../http.ts';

/** Same rule the API applies, so the browser never sends a request it would reject. */
export function isSearchable(text: string): boolean {
  return SearchQuerySchema.safeParse({ text }).success;
}

const KIND_LABEL: Record<PlaceKind, string> = {
  address: 'Adreça',
  place: 'Lloc',
  'kilometre-point': 'Punt quilomètric',
};

const KIND_ZOOM: Record<PlaceKind, number> = {
  address: 18,
  place: 14,
  'kilometre-point': 16,
};

export function kindLabel(kind: PlaceKind): string {
  return KIND_LABEL[kind];
}

/** Zoom to show a result: close for an address, wider for a named place. */
export function zoomFor(kind: PlaceKind): number {
  return KIND_ZOOM[kind];
}

export function searchPlaces(text: string, signal: AbortSignal): Promise<SearchResponse> {
  return getJson(`/api/search?${new URLSearchParams({ text })}`, SearchResponseSchema, signal);
}

/** Calls `fn` once calls stop arriving for `delayMs`, with the last arguments. */
export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  delayMs: number,
): ((...args: A) => void) & { cancel(): void } {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const debounced = (...args: A) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delayMs);
  };
  return Object.assign(debounced, { cancel: () => clearTimeout(timer) });
}
