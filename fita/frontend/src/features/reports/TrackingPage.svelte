<script lang="ts">
  import { TrackingCodeSchema, type ReportPublicView } from '@fita/contracts';
  import { onMount } from 'svelte';
  import Badge from '../../design-system/Badge.svelte';
  import Button from '../../design-system/Button.svelte';
  import Card from '../../design-system/Card.svelte';
  import DescriptionList from '../../design-system/DescriptionList.svelte';
  import Field from '../../design-system/Field.svelte';
  import Notice from '../../design-system/Notice.svelte';
  import { ApiRequestError } from '../../http.ts';
  import { CATEGORY_LABEL, STATUS_LABEL, STATUS_TONE, formatDateTime } from './report-texts.ts';
  import { fetchPublicReport } from './reports-client.ts';

  let code = $state(new URLSearchParams(location.search).get('codi') ?? '');
  let formatError = $state<string>();
  let result = $state<
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'found'; report: ReportPublicView }
    | { status: 'not-found' }
    | { status: 'failed' }
  >({ status: 'idle' });

  async function lookUp() {
    const parsed = TrackingCodeSchema.safeParse(code);
    if (!parsed.success) {
      formatError =
        'El codi té el format FIT- seguit de 6 lletres o xifres, per exemple FIT-7K3Q9X.';
      result = { status: 'idle' };
      return;
    }
    formatError = undefined;
    // Keeps the code in the address, so the page can be bookmarked or shared.
    history.replaceState(history.state, '', `/seguiment?codi=${parsed.data}`);
    result = { status: 'loading' };
    try {
      result = { status: 'found', report: await fetchPublicReport(parsed.data) };
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 404) {
        result = { status: 'not-found' };
      } else {
        console.error(error);
        result = { status: 'failed' };
      }
    }
  }

  function onsubmit(event: SubmitEvent) {
    event.preventDefault();
    void lookUp();
  }

  onMount(() => {
    if (code) void lookUp();
  });
</script>

<main class="page">
  <nav><a href="/">← Torna al visor</a></nav>
  <h1>Consulta una incidència</h1>
  <p class="intro">
    Escriu el codi de seguiment que vas rebre en reportar l'error per veure'n l'estat i la resposta
    de l'equip.
  </p>

  <form class="lookup" novalidate {onsubmit}>
    <Field label="Codi de seguiment" error={formatError}>
      {#snippet control({ id, describedBy, invalid })}
        <input
          {id}
          class="control code"
          aria-describedby={describedBy}
          aria-invalid={invalid}
          autocomplete="off"
          spellcheck="false"
          placeholder="FIT-7K3Q9X"
          value={code}
          oninput={(event) => (code = event.currentTarget.value.toUpperCase())}
        />
      {/snippet}
    </Field>
    <Button variant="primary" type="submit" disabled={result.status === 'loading'}>Consulta</Button>
  </form>

  {#if result.status === 'loading'}
    <Notice>Consultant…</Notice>
  {:else if result.status === 'not-found'}
    <Notice tone="error">No hi ha cap incidència amb aquest codi.</Notice>
  {:else if result.status === 'failed'}
    <Notice tone="error">No s'ha pogut consultar ara mateix. Torna-ho a provar.</Notice>
  {:else if result.status === 'found'}
    {@const report = result.report}
    <Card>
      <div class="heading">
        <h2>{report.code}</h2>
        <Badge tone={STATUS_TONE[report.status]} label={STATUS_LABEL[report.status]} />
      </div>
      <DescriptionList
        items={[
          {
            term: 'Resposta de l’equip',
            value: report.publicNote ?? 'Encara no hi ha cap resposta.',
            muted: report.publicNote === null,
          },
          { term: 'Categoria', value: CATEGORY_LABEL[report.category] },
          { term: 'Descripció', value: report.description },
          { term: 'Registrada', value: formatDateTime(report.createdAt) },
          { term: 'Última actualització', value: formatDateTime(report.updatedAt) },
        ]}
      />
    </Card>
  {/if}
</main>

<style>
  .page {
    display: grid;
    gap: var(--space-4);
    max-width: 40rem;
    margin: 0 auto;
    padding: var(--space-5) var(--space-4) var(--space-6);
  }

  nav a {
    color: var(--color-primary-strong);
    font-size: var(--text-sm);
  }

  h1 {
    font-size: var(--text-lg);
  }

  .intro {
    color: var(--color-text-muted);
  }

  .lookup {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: end;
    gap: var(--space-2);
  }

  .code {
    font-family: var(--font-mono);
    letter-spacing: 0.06em;
  }

  .heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
  }

  h2 {
    font-family: var(--font-mono);
    font-size: var(--text-md);
  }
</style>
