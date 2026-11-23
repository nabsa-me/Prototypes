<script lang="ts">
  import Button from '../../design-system/Button.svelte';
  import Card from '../../design-system/Card.svelte';
  import Field from '../../design-system/Field.svelte';
  import Notice from '../../design-system/Notice.svelte';

  interface Props {
    error?: string | undefined;
    onenter: (token: string) => void;
  }

  let { error, onenter }: Props = $props();
  let token = $state('');
  let missing = $state(false);

  function onsubmit(event: SubmitEvent) {
    event.preventDefault();
    missing = token.length === 0;
    if (!missing) onenter(token);
  }
</script>

<main class="gate">
  <Card>
    <h1>Safata interna d'incidències</h1>
    <p>Accés per a l'equip de producció cartogràfica.</p>
    {#if error}<Notice tone="error">{error}</Notice>{/if}
    <form novalidate {onsubmit}>
      <Field label="Contrasenya" error={missing ? 'Escriu la contrasenya.' : undefined}>
        {#snippet control({ id, describedBy, invalid })}
          <input
            {id}
            type="password"
            class="control"
            autocomplete="current-password"
            aria-describedby={describedBy}
            aria-invalid={invalid}
            bind:value={token}
          />
        {/snippet}
      </Field>
      <Button variant="primary" type="submit">Entra</Button>
    </form>
  </Card>
</main>

<style>
  .gate {
    max-width: 28rem;
    margin: 0 auto;
    padding: var(--space-6) var(--space-4);
  }

  h1 {
    font-size: var(--text-lg);
  }

  p {
    color: var(--color-text-muted);
  }

  form {
    display: grid;
    gap: var(--space-3);
  }
</style>
