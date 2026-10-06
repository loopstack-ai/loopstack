import { describe, expect, it } from 'vitest';
import { WebFetchMarkdownService } from '../webfetch-markdown.service.js';

describe('WebFetchMarkdownService', () => {
  const service = new WebFetchMarkdownService();

  it('converts headings with atx style', async () => {
    expect(await service.toMarkdown('<h1>Title</h1><h2>Sub</h2>')).toBe('# Title\n\n## Sub');
  });

  it('converts code blocks with fences', async () => {
    const markdown = await service.toMarkdown('<pre><code>const a = 1;</code></pre>');

    expect(markdown).toBe('```\nconst a = 1;\n```');
  });

  it('converts links and emphasis', async () => {
    const markdown = await service.toMarkdown('<p>See <a href="https://example.com">docs</a> <em>now</em></p>');

    expect(markdown).toBe('See [docs](https://example.com) _now_');
  });

  it('drops script, style, noscript and iframe elements', async () => {
    const markdown = await service.toMarkdown(
      '<p>Keep</p><script>alert(1)</script><style>p{}</style><noscript>No JS</noscript><iframe src="https://example.com"></iframe>',
    );

    expect(markdown).toBe('Keep');
  });

  it('reuses the converter across calls', async () => {
    const fresh = new WebFetchMarkdownService();

    expect(await fresh.toMarkdown('<p>one</p>')).toBe('one');
    expect(await fresh.toMarkdown('<p>two</p>')).toBe('two');
  });
});
