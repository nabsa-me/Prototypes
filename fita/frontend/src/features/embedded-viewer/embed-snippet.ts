export const EMBED_HEIGHTS = [360, 480, 640] as const;
export type EmbedHeight = (typeof EMBED_HEIGHTS)[number];

export interface EmbedSnippetOptions {
  /** Where this app is served, e.g. `window.location.origin`. */
  origin: string;
  viewerId: string;
  /** Accessible name of the frame: the viewer title. */
  title: string;
  height: EmbedHeight;
}

const ATTRIBUTE_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '"': '&quot;',
  "'": '&#39;',
  '<': '&lt;',
  '>': '&gt;',
};

/** Escapes a value for a double-quoted HTML attribute. */
export function escapeAttribute(value: string): string {
  return value.replace(/[&"'<>]/g, (character) => ATTRIBUTE_ESCAPES[character] ?? character);
}

export function embedUrl(origin: string, viewerId: string): string {
  return new URL(`/embed/${encodeURIComponent(viewerId)}`, origin).href;
}

/** The `<iframe>` a client pastes into its own page. */
export function embedSnippet({ origin, viewerId, title, height }: EmbedSnippetOptions): string {
  const attributes = [
    `src="${escapeAttribute(embedUrl(origin, viewerId))}"`,
    `title="${escapeAttribute(title)}"`,
    'width="100%"',
    `height="${height}"`,
    'style="border:0"',
    'loading="lazy"',
    'allow="fullscreen"',
    'referrerpolicy="strict-origin-when-cross-origin"',
  ];
  return `<iframe ${attributes.join(' ')}></iframe>`;
}
