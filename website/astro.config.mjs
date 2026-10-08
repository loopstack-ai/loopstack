import { satteri } from '@astrojs/markdown-satteri';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import starlight from '@astrojs/starlight';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import starlightLinksValidator from 'starlight-links-validator';
import { docsLinks, stripLeadingTitle } from './src/plugins/docs-links.ts';
import { sidebar } from './src/sidebar.ts';

export default defineConfig({
  site: 'https://loopstack.ai',
  // The current site serves extensionless paths with no trailing slash; keep those URLs.
  trailingSlash: 'never',

  integrations: [
    starlight({
      title: 'Loopstack',
      description: 'Durable AI workflows and agents for your NestJS backend.',
      favicon: '/favicon.svg',
      routeMiddleware: './src/middleware/title.ts',
      customCss: ['./src/styles/global.css'],
      // Pages that do not set their own social image fall back to this one, so a link shared from
      // any docs page or the blog index still previews.
      head: [
        { tag: 'meta', attrs: { property: 'og:image', content: 'https://loopstack.ai/og-image.png' } },
        { tag: 'meta', attrs: { property: 'og:image:width', content: '1200' } },
        { tag: 'meta', attrs: { property: 'og:image:height', content: '630' } },
        { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' } },
        { tag: 'meta', attrs: { name: 'twitter:image', content: 'https://loopstack.ai/og-image.png' } },
      ],
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/loopstack-ai/loopstack' }],
      components: {
        Header: './src/components/Header.astro',
        Footer: './src/components/Footer.astro',
        ThemeSelect: './src/components/ThemeSelect.astro',
      },
      sidebar,
      plugins: [
        starlightLinksValidator({
          errorOnRelativeLinks: false,
          // Anchors are checked by scripts/check-anchors.cjs instead: under Astro's Sätteri engine
          // this plugin collects headings before their ids are assigned, so every anchor reads as
          // broken. Page-level link checking is unaffected and stays on.
          errorOnInvalidHashes: false,
          // Astro pages outside Starlight's routes are not in its route table.
          exclude: ['http://localhost:*', '/blog', '/blog/**', '/features'],
        }),
      ],
      editLink: {
        // Entry file paths are relative to this directory (`../docs/…`), so the base points at the
        // website folder and the `..` resolves to `edit/main/docs/…`.
        baseUrl: 'https://github.com/loopstack-ai/loopstack/edit/main/website/',
      },
      lastUpdated: false,
      pagefind: true,
      expressiveCode: {
        // `env` appears as a fence language in several registry READMEs; Shiki has no such grammar.
        shiki: { langAlias: { env: 'ini' } },
      },
    }),
    react(),
    sitemap(),
  ],

  markdown: {
    processor: satteri({ mdastPlugins: [docsLinks, stripLeadingTitle] }),
  },

  redirects: {
    '/docs': '/docs/learn/introduction',
  },

  vite: {
    plugins: [tailwindcss()],
  },
});
