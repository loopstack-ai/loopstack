import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineMdastPlugin } from 'satteri';

/** The monorepo root: two levels up from `website/src/plugins`. */
const REPO_ROOT = path.resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const SITE_ORIGIN = 'https://loopstack.ai';

/**
 * Maps a markdown file inside the monorepo to its route on the site, mirroring the id
 * generation of the `docs` collection. Returns null for a file the site does not publish.
 */
export function routeForFile(absPath: string): string | null {
  const rel = path.relative(REPO_ROOT, absPath).split(path.sep).join('/');
  if (rel.startsWith('docs/')) {
    return '/' + rel.replace(/\.md$/, '').replace(/\/index$/, '');
  }
  const example = rel.match(/^examples\/src\/([^/]+)\/README\.md$/);
  if (example) return `/docs/examples/${example[1]}`;
  const registry = rel.match(/^registry\/([^/]+)\/README\.md$/);
  if (registry) return `/docs/registry/${registry[1]}`;
  return null;
}

/**
 * Rewrites links so one markdown source works both on GitHub and on the site: relative `.md`
 * links become routes, and absolute loopstack.ai links become same-origin paths.
 *
 * It also publishes the page's own route as a `slug` on the render-time frontmatter. The docs are
 * loaded from outside `src/content/docs`, and starlight-links-validator derives its lookup key
 * from a file's path relative to that directory, which would key every page under `../../docs/…`
 * and report all internal links as broken. The validator prefers a frontmatter `slug` when it
 * finds one, so this gives it the real route. Nothing else reads the field.
 */
/**
 * Drops a document's own leading `# Heading`.
 *
 * Every source file carries one so it reads correctly on GitHub and npm, but Starlight already
 * renders the frontmatter `title` as the page heading, so keeping both puts two h1s on every page.
 * The frontmatter title is the one that also drives the sidebar, the nav and `<title>`, so it wins
 * and the body copy of it is removed here rather than from the source.
 */
export const stripLeadingTitle = defineMdastPlugin({
  name: 'loopstack-strip-leading-title',
  heading(node, ctx) {
    if (node.depth !== 1) return;
    const parent = ctx.parent(node);
    if (parent?.type !== 'root') return;
    if (ctx.indexOf(node) !== 0) return;
    ctx.removeNode(node);
  },
});

export const docsLinks = defineMdastPlugin({
  name: 'loopstack-docs-links',

  before(_root, ctx) {
    if (!ctx.fileURL) return;
    const route = routeForFile(fileURLToPath(ctx.fileURL));
    const frontmatter = ctx.data.astro?.frontmatter;
    if (route && frontmatter && typeof frontmatter.slug !== 'string') {
      frontmatter.slug = route.replace(/^\//, '');
    }
  },

  link(node, ctx) {
    const url = node.url;

    if (url.startsWith(SITE_ORIGIN + '/')) {
      ctx.setProperty(node, 'url', url.slice(SITE_ORIGIN.length));
      return;
    }
    if (/^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith('/') || url.startsWith('#')) return;

    const [target, hash] = url.split('#');
    if (!target.endsWith('.md')) return;
    if (!ctx.fileURL) return;

    const route = routeForFile(path.resolve(path.dirname(fileURLToPath(ctx.fileURL)), target));
    if (!route) return;

    ctx.setProperty(node, 'url', hash ? `${route}#${hash}` : route);
  },
});
