/** Client-side routes. The server (Vite) answers index.html for every path. */
export type Route =
  | { name: 'viewer' }
  | { name: 'tracking' }
  | { name: 'internal' }
  | { name: 'embed'; viewerId: string }
  | { name: 'embed-code'; viewerId: string }
  | { name: 'not-found' };

/** Same shape as a viewer id: a lowercase slug. */
const ID = '([a-z0-9]+(?:-[a-z0-9]+)*)';

/** Each pattern captures at most one group: the viewer id. */
const ROUTES: ReadonlyArray<readonly [RegExp, (id: string) => Route]> = [
  [/^\/$/, () => ({ name: 'viewer' })],
  [/^\/seguiment\/?$/, () => ({ name: 'tracking' })],
  [/^\/intern\/?$/, () => ({ name: 'internal' })],
  [new RegExp(`^/embed/${ID}/?$`), (viewerId) => ({ name: 'embed', viewerId })],
  [new RegExp(`^/viewers/${ID}/embed-code/?$`), (viewerId) => ({ name: 'embed-code', viewerId })],
];

export function matchRoute(pathname: string): Route {
  for (const [pattern, route] of ROUTES) {
    const match = pattern.exec(pathname);
    if (match) return route(match[1] ?? '');
  }
  return { name: 'not-found' };
}

/** Changes the URL without reloading and lets the app render the new route. */
export function navigate(path: string): void {
  history.pushState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

interface ClickLike {
  button: number;
  defaultPrevented: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

interface AnchorLike {
  href: string;
  target: string;
  download: boolean;
}

/**
 * True for a plain left click on a link to this origin: the app handles it. Anything the
 * browser should handle itself (new tab, download, another site) returns false.
 */
export function isInternalNavigation(
  click: ClickLike,
  anchor: AnchorLike,
  origin: string,
): boolean {
  if (click.defaultPrevented || click.button !== 0) return false;
  if (click.metaKey || click.ctrlKey || click.shiftKey || click.altKey) return false;
  if ((anchor.target && anchor.target !== '_self') || anchor.download) return false;
  return new URL(anchor.href, origin).origin === origin;
}
