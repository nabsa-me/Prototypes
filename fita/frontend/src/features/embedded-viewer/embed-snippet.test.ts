import { describe, expect, it } from 'vitest';
import { embedSnippet, embedUrl, escapeAttribute } from './embed-snippet.ts';

describe('embedUrl', () => {
  it('points at the embed route of this origin', () => {
    expect(embedUrl('http://127.0.0.1:5791', 'miradors')).toBe(
      'http://127.0.0.1:5791/embed/miradors',
    );
  });
});

describe('embedSnippet', () => {
  it('builds a lazy, borderless, full-width iframe with an accessible title', () => {
    expect(
      embedSnippet({
        origin: 'https://fita.example',
        viewerId: 'miradors',
        title: 'Ruta dels miradors',
        height: 480,
      }),
    ).toBe(
      '<iframe src="https://fita.example/embed/miradors" title="Ruta dels miradors" width="100%" ' +
        'height="480" style="border:0" loading="lazy" allow="fullscreen" ' +
        'referrerpolicy="strict-origin-when-cross-origin"></iframe>',
    );
  });

  it('cannot be broken out of by a title with quotes or markup', () => {
    const snippet = embedSnippet({
      origin: 'https://fita.example',
      viewerId: 'miradors',
      title: 'Ruta "nord" <script>alert(1)</script>',
      height: 360,
    });

    expect(snippet).toContain(
      'title="Ruta &quot;nord&quot; &lt;script&gt;alert(1)&lt;/script&gt;"',
    );
    expect(snippet).not.toContain('<script>');
  });
});

describe('escapeAttribute', () => {
  it('escapes every character that matters in an attribute', () => {
    expect(escapeAttribute(`a&b"c'd<e>f`)).toBe('a&amp;b&quot;c&#39;d&lt;e&gt;f');
  });
});
