import { i18nLoader } from '@astrojs/starlight/loaders';
import { docsSchema, i18nSchema } from '@astrojs/starlight/schema';
import { glob } from 'astro/loaders';
import { defineCollection, z } from 'astro:content';

/**
 * The docs collection is read in place from the monorepo: `docs/**`, the registry package READMEs and
 * the example module READMEs. Entry ids become URL paths, so `docs/learn/introduction.md` is served at
 * `/docs/learn/introduction`, `registry/features/git-module/README.md` at
 * `/docs/registry/features/git-module` and `examples/src/hitl/README.md` at `/docs/examples/hitl`.
 * Pages the monorepo has no reason to carry (the 404) live in `src/content/docs` and keep their bare id.
 */
function docsEntryId({ entry }: { entry: string }): string {
  const withoutExt = entry.replace(/\.mdx?$/, '');
  const local = withoutExt.match(/^website\/src\/content\/docs\/(.+)$/);
  if (local) return local[1];
  const example = withoutExt.match(/^examples\/src\/([^/]+)\/README$/);
  if (example) return `docs/examples/${example[1]}`;
  const registry = withoutExt.match(/^registry\/(features|examples|tools)\/([^/]+)\/README$/);
  if (registry) return `docs/registry/${registry[1]}/${registry[2]}`;
  return withoutExt.replace(/\/index$/, '');
}

const docs = defineCollection({
  loader: glob({
    base: '..',
    pattern: [
      'docs/**/[^_]*.md',
      'registry/features/*/README.md',
      'examples/src/*/README.md',
      'website/src/content/docs/**/[^_]*.{md,mdx}',
    ],
    generateId: docsEntryId,
  }),
  schema: docsSchema({
    extend: z.object({
      includeInLlmsTxt: z.boolean().optional(),
      includeInLlmsFullTxt: z.boolean().optional(),
    }),
  }),
});

const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    author: z.string(),
    tags: z.array(z.string()).default([]),
    img: z.string().optional(),
    imgSize: z.enum(['sm', 'full']).default('full'),
    imgThemeAdapt: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

const i18n = defineCollection({ loader: i18nLoader(), schema: i18nSchema() });

export const collections = { docs, blog, i18n };
