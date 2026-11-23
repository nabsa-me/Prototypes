<script lang="ts">
  import type { SearchResult } from '@fita/contracts';
  import type { Map as MapLibreMap } from 'maplibre-gl';
  import Combobox from '../../design-system/Combobox.svelte';
  import { debounce, isSearchable, kindLabel, searchPlaces, zoomFor } from './place-search.ts';

  const DEBOUNCE_MS = 300;

  let { map }: { map: MapLibreMap } = $props();

  let text = $state('');
  let results = $state.raw<SearchResult[]>([]);
  let status = $state('');
  let chosenLabel: string | undefined;
  let request: AbortController | undefined;

  // Only the latest request may update the list: answers can arrive out of order.
  const search = debounce((query: string) => {
    request?.abort();
    const controller = new AbortController();
    request = controller;
    searchPlaces(query, controller.signal).then(
      (response) => {
        if (request !== controller) return;
        results = response.results;
        status =
          response.results.length === 0 ? 'Cap resultat' : `${response.results.length} resultats`;
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        console.error(error);
        results = [];
        status = "No s'ha pogut cercar ara mateix. Torna-ho a provar.";
      },
    );
  }, DEBOUNCE_MS);

  $effect(() => {
    const query = text;
    if (query === chosenLabel) return;
    chosenLabel = undefined;
    if (!isSearchable(query)) {
      search.cancel();
      request?.abort();
      results = [];
      status = '';
      return;
    }
    search(query);
  });

  $effect(() => () => {
    search.cancel();
    request?.abort();
  });

  function select(id: string) {
    const result = results[Number(id)];
    if (!result) return;
    chosenLabel = result.label;
    text = result.label;
    results = [];
    status = '';
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    map.flyTo({
      center: result.position,
      zoom: zoomFor(result.kind),
      duration: reducedMotion ? 0 : 1200,
    });
  }
</script>

<Combobox
  label="Cerca un lloc, una adreça o un punt quilomètric"
  placeholder="Cerca a Catalunya…"
  hideLabel
  bind:value={text}
  options={results.map((result, index) => ({
    id: String(index),
    label: result.label,
    hint: kindLabel(result.kind),
  }))}
  onselect={select}
  {status}
/>
