<script lang="ts">
  import { REPORT_STATUSES, type ReportAdminView, type ReportStatus } from '@fita/contracts';
  import { onMount } from 'svelte';
  import Badge from '../../design-system/Badge.svelte';
  import Button from '../../design-system/Button.svelte';
  import DescriptionList from '../../design-system/DescriptionList.svelte';
  import Field from '../../design-system/Field.svelte';
  import Notice from '../../design-system/Notice.svelte';
  import { ApiRequestError } from '../../http.ts';
  import { visibleBounds } from '../../map/bounds.ts';
  import { loadViewerConfig } from '../../map/load-viewer-config.ts';
  import { createViewerMap, type ViewerMap } from '../../map/viewer-map.ts';
  import { fetchAdminReports } from './admin-client.ts';
  import {
    REPORTS_LAYER,
    addReportLayer,
    codeAt,
    moveFlag,
    showReports,
    statusColors,
  } from './report-layer.ts';
  import { CATEGORY_LABEL, STATUS_LABEL, STATUS_TONE, formatDateTime } from './report-texts.ts';

  interface Props {
    token: string;
    onunauthorized: () => void;
    onleave: () => void;
  }

  let { token, onunauthorized, onleave }: Props = $props();

  let container: HTMLDivElement;
  let viewer = $state.raw<ViewerMap>();
  let layerReady = $state(false);
  let mapFailed = $state(false);

  let statusFilter = $state<ReportStatus | ''>('');
  let visibleOnly = $state(false);
  /** Bumped when the map stops moving, so the "visible area" filter refetches. */
  let viewChanges = $state(0);

  let reports = $state.raw<ReportAdminView[]>([]);
  let listState = $state<'loading' | 'ready' | 'error'>('loading');
  let hovered = $state<string>();
  let selected = $state<string>();
  const selectedReport = $derived(reports.find((report) => report.code === selected));

  onMount(() => {
    const controller = new AbortController();
    loadViewerConfig('intern', controller.signal)
      .then((config) => {
        const created = createViewerMap({
          container,
          config,
          view: config.initialView,
          basemapId: config.basemaps[0]?.id ?? '',
        });
        const map = created.map;
        map.once('style.load', () => {
          const tokens = getComputedStyle(container);
          addReportLayer(
            map,
            statusColors((name) => tokens.getPropertyValue(name).trim()),
          );
          layerReady = true;
        });
        map.on('mousemove', REPORTS_LAYER, (event) => {
          hovered = codeAt(event);
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', REPORTS_LAYER, () => {
          hovered = undefined;
          map.getCanvas().style.cursor = '';
        });
        map.on('click', REPORTS_LAYER, (event) => {
          selected = codeAt(event);
        });
        map.on('moveend', () => {
          if (visibleOnly) viewChanges++;
        });
        viewer = created;
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error(error);
        mapFailed = true;
      });

    return () => {
      controller.abort();
      viewer?.destroy();
    };
  });

  // Reloads the list whenever a filter changes (or the view, with "visible area" on).
  $effect(() => {
    const status = statusFilter || undefined;
    void viewChanges;
    const map = viewer?.map;
    if (visibleOnly && !map) return;
    const bbox = visibleOnly && map ? visibleBounds(map) : undefined;

    const controller = new AbortController();
    listState = 'loading';
    fetchAdminReports(token, { status, bbox }, controller.signal).then(
      (result) => {
        reports = result;
        listState = 'ready';
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof ApiRequestError && error.status === 401) {
          onunauthorized();
          return;
        }
        console.error(error);
        listState = 'error';
      },
    );
    return () => controller.abort();
  });

  $effect(() => {
    if (layerReady && viewer) showReports(viewer.map, reports);
  });

  // Mirrors the hovered and selected reports on the map through feature-state.
  let shownHover: string | undefined;
  let shownSelection: string | undefined;
  $effect(() => {
    const next = hovered;
    if (!layerReady || !viewer) return;
    moveFlag(viewer.map, 'hover', shownHover, next);
    shownHover = next;
  });
  $effect(() => {
    const next = selected;
    if (!layerReady || !viewer) return;
    moveFlag(viewer.map, 'selected', shownSelection, next);
    shownSelection = next;
  });

  function choose(report: ReportAdminView) {
    selected = report.code;
    const map = viewer?.map;
    if (!map) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    map.flyTo({
      center: report.location,
      zoom: Math.max(map.getZoom(), 13),
      duration: reducedMotion ? 0 : 900,
    });
  }
</script>

<div class="tray">
  <header class="bar">
    <h1>Safata d'incidències</h1>
    <Button variant="ghost" onclick={onleave}>Surt</Button>
  </header>

  <div class="map-area">
    <div class="map" bind:this={container}></div>
    {#if mapFailed}
      <div class="map-error"><Notice tone="error">No s'ha pogut carregar el mapa.</Notice></div>
    {/if}
  </div>

  <aside class="sidebar" aria-label="Incidències">
    <div class="filters">
      <Field label="Estat">
        {#snippet control({ id, describedBy })}
          <select {id} class="control" aria-describedby={describedBy} bind:value={statusFilter}>
            <option value="">Tots els estats</option>
            {#each REPORT_STATUSES as status (status)}
              <option value={status}>{STATUS_LABEL[status]}</option>
            {/each}
          </select>
        {/snippet}
      </Field>
      <label class="check">
        <input type="checkbox" bind:checked={visibleOnly} />
        Només la zona visible
      </label>
    </div>

    <p class="count" role="status">
      {#if listState === 'loading'}
        Carregant…
      {:else if listState === 'error'}
        No s'han pogut carregar les incidències.
      {:else}
        {reports.length} {reports.length === 1 ? 'incidència' : 'incidències'}
      {/if}
    </p>

    <ul class="list">
      {#each reports as report (report.code)}
        <li>
          <button
            type="button"
            class="item"
            class:hovered={hovered === report.code}
            aria-current={selected === report.code ? 'true' : undefined}
            onmouseenter={() => (hovered = report.code)}
            onmouseleave={() => (hovered = undefined)}
            onfocus={() => (hovered = report.code)}
            onblur={() => (hovered = undefined)}
            onclick={() => choose(report)}
          >
            <span class="row">
              <span class="code">{report.code}</span>
              <Badge tone={STATUS_TONE[report.status]} label={STATUS_LABEL[report.status]} />
            </span>
            <span class="meta">
              {CATEGORY_LABEL[report.category]} · {formatDateTime(report.createdAt)}
            </span>
          </button>
        </li>
      {/each}
    </ul>

    {#if selectedReport}
      <section class="detail" aria-labelledby="detail-title">
        <h2 id="detail-title">{selectedReport.code}</h2>
        <DescriptionList
          items={[
            { term: 'Estat', value: STATUS_LABEL[selectedReport.status] },
            { term: 'Categoria', value: CATEGORY_LABEL[selectedReport.category] },
            { term: 'Descripció', value: selectedReport.description },
            {
              term: 'Nota pública',
              value: selectedReport.publicNote ?? 'Sense nota',
              muted: selectedReport.publicNote === null,
            },
            { term: 'Registrada', value: formatDateTime(selectedReport.createdAt) },
            { term: 'Última actualització', value: formatDateTime(selectedReport.updatedAt) },
          ]}
        />
      </section>
    {/if}
  </aside>
</div>

<style>
  .tray {
    display: grid;
    grid-template-columns: 1fr minmax(20rem, 26rem);
    grid-template-rows: auto 1fr;
    height: 100dvh;
  }

  .bar {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-2) var(--space-4);
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
  }

  h1 {
    font-size: var(--text-md);
  }

  .map-area {
    position: relative;
    min-height: 0;
  }

  .map {
    position: absolute;
    inset: 0;
  }

  .map-error {
    position: absolute;
    top: var(--space-3);
    left: var(--space-3);
  }

  .sidebar {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    min-height: 0;
    overflow-y: auto;
    padding: var(--space-4);
    background: var(--color-surface);
    border-left: 1px solid var(--color-border);
  }

  .filters {
    display: grid;
    gap: var(--space-2);
  }

  .check {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-sm);
  }

  .count {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }

  .list {
    display: grid;
    gap: var(--space-1);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .item {
    display: grid;
    gap: var(--space-1);
    width: 100%;
    padding: var(--space-2) var(--space-3);
    text-align: left;
    background: none;
    border: 1px solid transparent;
    border-radius: var(--radius-md);
    cursor: pointer;
  }

  .item.hovered {
    background: var(--color-primary-soft);
  }

  .item[aria-current='true'] {
    border-color: var(--color-primary);
  }

  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
  }

  .code {
    font-family: var(--font-mono);
    font-weight: var(--weight-bold);
    font-size: var(--text-sm);
  }

  .meta {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  .detail {
    display: grid;
    gap: var(--space-3);
    padding-top: var(--space-3);
    border-top: 1px solid var(--color-border);
  }

  h2 {
    font-family: var(--font-mono);
    font-size: var(--text-md);
  }

  @media (max-width: 639px) {
    .tray {
      grid-template-columns: 1fr;
      grid-template-rows: auto 45dvh 1fr;
    }

    .sidebar {
      border-left: 0;
      border-top: 1px solid var(--color-border);
    }
  }
</style>
