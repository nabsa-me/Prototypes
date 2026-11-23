<script lang="ts">
  import { PUBLIC_NOTE_MAX_LENGTH, type ReportAdminView, type ReportStatus } from '@fita/contracts';
  import Button from '../../design-system/Button.svelte';
  import Field from '../../design-system/Field.svelte';
  import Notice from '../../design-system/Notice.svelte';
  import { ApiRequestError } from '../../http.ts';
  import { changeReportStatus } from './admin-client.ts';
  import { STATUS_LABEL } from './report-texts.ts';
  import { needsNote, nextStatuses, validateStatusChange } from './status-change.ts';

  interface Props {
    report: ReportAdminView;
    token: string;
    onchanged: (report: ReportAdminView) => void;
    /** Someone else changed the report: the caller reloads it. */
    onconflict: () => void;
    onunauthorized: () => void;
  }

  let { report, token, onchanged, onconflict, onunauthorized }: Props = $props();

  let status = $state<ReportStatus | ''>('');
  let note = $state('');
  let errors = $state<{ status?: string; note?: string }>({});
  let sending = $state(false);
  let failure = $state<string>();
  const options = $derived(nextStatuses(report.status));

  async function onsubmit(event: SubmitEvent) {
    event.preventDefault();
    const result = validateStatusChange({ status, note }, report);
    if (!result.ok) {
      errors = result.errors;
      return;
    }
    errors = {};
    failure = undefined;
    sending = true;
    try {
      const updated = await changeReportStatus(token, report.code, result.change);
      status = '';
      note = '';
      onchanged(updated);
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) {
        onunauthorized();
      } else if (error instanceof ApiRequestError && error.code === 'version_conflict') {
        failure =
          "Algú altre l'ha canviada mentre la revisaves. S'ha recarregat: revisa-la de nou.";
        onconflict();
      } else {
        console.error(error);
        failure = "No s'ha pogut canviar l'estat. Torna-ho a provar.";
      }
    } finally {
      sending = false;
    }
  }
</script>

{#if options.length === 0}
  <p class="final">Estat final: aquesta incidència ja no admet canvis.</p>
{:else}
  <form class="status-change" novalidate {onsubmit}>
    <h3>Canvia l'estat</h3>
    <Field label="Nou estat" error={errors.status}>
      {#snippet control({ id, describedBy, invalid })}
        <select
          {id}
          class="control"
          aria-describedby={describedBy}
          aria-invalid={invalid}
          bind:value={status}
        >
          <option value="" disabled>Tria un estat</option>
          {#each options as value (value)}
            <option {value}>{STATUS_LABEL[value]}</option>
          {/each}
        </select>
      {/snippet}
    </Field>
    <Field
      label={needsNote(status) ? 'Nota pública (obligatòria)' : 'Nota pública (opcional)'}
      hint="La veu qui va reportar l'error quan consulta el codi."
      error={errors.note}
    >
      {#snippet control({ id, describedBy, invalid })}
        <textarea
          {id}
          class="control"
          aria-describedby={describedBy}
          aria-invalid={invalid}
          maxlength={PUBLIC_NOTE_MAX_LENGTH}
          bind:value={note}></textarea>
      {/snippet}
    </Field>
    {#if failure}<Notice tone="error">{failure}</Notice>{/if}
    <div class="actions">
      <Button variant="primary" type="submit" disabled={sending}>
        {sending ? 'Desant…' : 'Desa el canvi'}
      </Button>
    </div>
  </form>
{/if}

<style>
  .status-change {
    display: grid;
    gap: var(--space-3);
  }

  h3 {
    font-size: var(--text-sm);
  }

  .final {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }

  .actions {
    display: flex;
    justify-content: flex-end;
  }
</style>
