<script lang="ts">
  import type { ViewerConfig } from '@fita/contracts';
  import { onMount } from 'svelte';
  import Button from '../../design-system/Button.svelte';
  import Card from '../../design-system/Card.svelte';
  import Field from '../../design-system/Field.svelte';
  import Notice from '../../design-system/Notice.svelte';
  import { ApiRequestError } from '../../http.ts';
  import { loadViewerConfig } from '../../map/load-viewer-config.ts';
  import { EMBED_HEIGHTS, embedSnippet, embedUrl, type EmbedHeight } from './embed-snippet.ts';

  let { viewerId }: { viewerId: string } = $props();

  const origin = window.location.origin;
  let config = $state<ViewerConfig>();
  let failure = $state<'not-found' | 'error'>();
  let height = $state<EmbedHeight>(480);
  let copyStatus = $state('');
  let textarea = $state<HTMLTextAreaElement>();

  const snippet = $derived(
    config ? embedSnippet({ origin, viewerId, title: config.title, height }) : '',
  );

  onMount(() => {
    const controller = new AbortController();
    loadViewerConfig(viewerId, controller.signal).then(
      (loaded) => (config = loaded),
      (error: unknown) => {
        if (controller.signal.aborted) return;
        console.error(error);
        failure = error instanceof ApiRequestError && error.status === 404 ? 'not-found' : 'error';
      },
    );
    return () => controller.abort();
  });

  async function copy() {
    // The Clipboard API needs a secure context (HTTPS or localhost). Without it, or if the
    // browser refuses, the code is selected for the user to copy by hand.
    if (window.isSecureContext && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(snippet);
        copyStatus = 'Codi copiat.';
        return;
      } catch {
        // Permission denied: fall back to selecting the text.
      }
    }
    textarea?.select();
    copyStatus = 'Codi seleccionat: copia’l amb Ctrl+C (o ⌘+C).';
  }
</script>

<main class="page">
  {#if failure === 'not-found'}
    <Notice tone="error">Aquest visor no existeix.</Notice>
  {:else if failure}
    <Notice tone="error">No s'ha pogut carregar el visor.</Notice>
  {:else if config}
    <h1>Insereix «{config.title}» al teu web</h1>
    <p class="intro">
      Copia aquest codi a la pàgina on vulguis mostrar el visor. Apunta a
      <code>{embedUrl(origin, viewerId)}</code>.
    </p>

    <Card>
      <div class="options">
        <Field label="Alçada del visor">
          {#snippet control({ id, describedBy })}
            <select {id} class="control" aria-describedby={describedBy} bind:value={height}>
              {#each EMBED_HEIGHTS as value (value)}
                <option {value}>{value} px</option>
              {/each}
            </select>
          {/snippet}
        </Field>
      </div>

      <Field label="Codi per inserir">
        {#snippet control({ id, describedBy })}
          <textarea
            {id}
            class="control code"
            aria-describedby={describedBy}
            readonly
            rows="4"
            bind:this={textarea}>{snippet}</textarea
          >
        {/snippet}
      </Field>
      <div class="actions">
        <span class="copy-status" role="status">{copyStatus}</span>
        <Button variant="primary" onclick={copy}>Copia el codi</Button>
      </div>
    </Card>

    <h2>Vista prèvia</h2>
    <div class="preview">
      <!-- The preview renders the same <iframe> the client pastes; embedSnippet escapes every attribute value. -->
      <!-- eslint-disable-next-line svelte/no-at-html-tags -->
      {@html snippet}
    </div>
  {:else}
    <Notice>Carregant…</Notice>
  {/if}
</main>

<style>
  .page {
    display: grid;
    gap: var(--space-4);
    max-width: 56rem;
    margin: 0 auto;
    padding: var(--space-5) var(--space-4) var(--space-6);
  }

  h1 {
    font-size: var(--text-lg);
  }

  h2 {
    font-size: var(--text-md);
  }

  .intro {
    color: var(--color-text-muted);
  }

  code,
  .code {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    word-break: break-all;
  }

  .options {
    max-width: 12rem;
  }

  .actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--space-3);
  }

  .copy-status {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }

  .preview {
    border: 1px dashed var(--color-border);
    border-radius: var(--radius-md);
    overflow: hidden;
    background: var(--color-surface);
  }
</style>
