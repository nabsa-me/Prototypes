<script lang="ts">
  import { DESCRIPTION_MAX_LENGTH, REPORT_CATEGORIES } from '@fita/contracts';
  import type { Position } from '@fita/geo';
  import Button from '../../design-system/Button.svelte';
  import Field from '../../design-system/Field.svelte';
  import Notice from '../../design-system/Notice.svelte';
  import { ApiRequestError } from '../../http.ts';
  import { validateReportForm, type ReportFormErrors } from './report-form.ts';
  import { CATEGORY_LABEL } from './report-texts.ts';
  import { submitReport } from './reports-client.ts';

  interface Props {
    location: Position;
    /** Leaves the form; also offered once the report is sent. */
    onclose: () => void;
  }

  let { location, onclose }: Props = $props();

  let category = $state('');
  let description = $state('');
  let errors = $state<ReportFormErrors>({});
  let phase = $state<
    | { status: 'editing' }
    | { status: 'sending' }
    | { status: 'sent'; code: string }
    | { status: 'failed'; message: string }
  >({ status: 'editing' });

  async function onsubmit(event: SubmitEvent) {
    event.preventDefault();
    const result = validateReportForm({ category, description }, location);
    if (!result.ok) {
      errors = result.errors;
      return;
    }
    errors = {};
    phase = { status: 'sending' };
    try {
      const { code } = await submitReport(result.report);
      phase = { status: 'sent', code };
    } catch (error) {
      console.error(error);
      const message =
        error instanceof ApiRequestError && error.code === 'outside_catalonia'
          ? 'Només es poden reportar errors de punts dins de Catalunya.'
          : "No s'ha pogut enviar. Torna-ho a provar.";
      phase = { status: 'failed', message };
    }
  }
</script>

{#if phase.status === 'sent'}
  <div class="sent">
    <Notice>Gràcies. Hem rebut l'error que has reportat.</Notice>
    <p>Codi de seguiment:</p>
    <p class="code">{phase.code}</p>
    <p class="help">Guarda'l per consultar com avança la revisió.</p>
    <Button onclick={onclose}>Tornar a la fitxa</Button>
  </div>
{:else}
  <form class="report-form" novalidate {onsubmit}>
    <h3>Reporta un error en aquest punt</h3>
    {#if errors.location}<Notice tone="error">{errors.location}</Notice>{/if}

    <Field label="Què és incorrecte?" error={errors.category}>
      {#snippet control({ id, describedBy, invalid })}
        <select
          {id}
          class="control"
          aria-describedby={describedBy}
          aria-invalid={invalid}
          bind:value={category}
        >
          <option value="" disabled>Tria una categoria</option>
          {#each REPORT_CATEGORIES as value (value)}
            <option {value}>{CATEGORY_LABEL[value]}</option>
          {/each}
        </select>
      {/snippet}
    </Field>

    <Field
      label="Descripció"
      hint={`${description.length}/${DESCRIPTION_MAX_LENGTH} caràcters`}
      error={errors.description}
    >
      {#snippet control({ id, describedBy, invalid })}
        <textarea
          {id}
          class="control"
          aria-describedby={describedBy}
          aria-invalid={invalid}
          maxlength={DESCRIPTION_MAX_LENGTH}
          bind:value={description}></textarea>
      {/snippet}
    </Field>

    {#if phase.status === 'failed'}<Notice tone="error">{phase.message}</Notice>{/if}

    <div class="actions">
      <Button variant="ghost" onclick={onclose}>Cancel·la</Button>
      <Button variant="primary" type="submit" disabled={phase.status === 'sending'}>
        {phase.status === 'sending' ? 'Enviant…' : 'Envia'}
      </Button>
    </div>
  </form>
{/if}

<style>
  .report-form,
  .sent {
    display: grid;
    gap: var(--space-3);
  }

  h3 {
    font-size: var(--text-sm);
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
  }

  .code {
    font-family: var(--font-mono);
    font-size: var(--text-lg);
    font-weight: var(--weight-bold);
    letter-spacing: 0.08em;
  }

  .help {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }
</style>
