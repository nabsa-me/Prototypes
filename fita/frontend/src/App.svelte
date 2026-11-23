<script lang="ts">
  import { onMount } from 'svelte';
  import EmbeddedViewer from './features/embedded-viewer/EmbeddedViewer.svelte';
  import PublicViewer from './features/public-viewer/PublicViewer.svelte';
  import InternalPage from './features/reports/InternalPage.svelte';
  import TrackingPage from './features/reports/TrackingPage.svelte';
  import NotFound from './NotFound.svelte';
  import { isInternalNavigation, matchRoute, navigate } from './router.ts';

  let route = $state(matchRoute(location.pathname));

  onMount(() => {
    const onPopState = () => {
      route = matchRoute(location.pathname);
    };

    // One listener turns every same-origin link into client-side navigation.
    const onClick = (event: MouseEvent) => {
      const anchor = event.target instanceof Element ? event.target.closest('a') : null;
      if (!anchor) return;
      const link = {
        href: anchor.href,
        target: anchor.target,
        download: anchor.hasAttribute('download'),
      };
      if (!isInternalNavigation(event, link, location.origin)) return;
      event.preventDefault();
      navigate(`${anchor.pathname}${anchor.search}${anchor.hash}`);
    };

    window.addEventListener('popstate', onPopState);
    document.addEventListener('click', onClick);
    return () => {
      window.removeEventListener('popstate', onPopState);
      document.removeEventListener('click', onClick);
    };
  });
</script>

{#if route.name === 'viewer'}
  <PublicViewer />
{:else if route.name === 'tracking'}
  <TrackingPage />
{:else if route.name === 'internal'}
  <InternalPage />
{:else if route.name === 'embed'}
  {#key route.viewerId}
    <EmbeddedViewer viewerId={route.viewerId} />
  {/key}
{:else}
  <NotFound />
{/if}
