<script lang="ts">
  import Card from './design-system/Card.svelte';
</script>

<main class="page">
  <Card>
    <h1>Pàgina no trobada</h1>
    <p>Aquesta adreça no existeix. <a href="/">Torna al visor</a>.</p>
  </Card>
</main>

<style>
  .page {
    max-width: 40rem;
    margin: 0 auto;
    padding: var(--space-6) var(--space-4);
  }

  h1 {
    font-size: var(--text-lg);
    margin-bottom: var(--space-2);
  }
</style>
