<script lang="ts">
  import { createAdminSession } from './admin-session.ts';
  import InternalTray from './InternalTray.svelte';
  import TokenGate from './TokenGate.svelte';

  const session = createAdminSession();
  let token = $state(session.read());
  let gateError = $state<string>();

  function enter(value: string) {
    session.write(value);
    gateError = undefined;
    token = value;
  }

  function leave(reason?: string) {
    session.clear();
    gateError = reason;
    token = undefined;
  }
</script>

{#if token}
  <InternalTray
    {token}
    onunauthorized={() => leave('La contrasenya no és correcta.')}
    onleave={() => leave()}
  />
{:else}
  <TokenGate error={gateError} onenter={enter} />
{/if}
