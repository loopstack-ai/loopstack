import { defineRouteMiddleware } from '@astrojs/starlight/route-data';

/**
 * Puts the brand first in the document title, so every tab reads "Loopstack | <page>" instead of
 * "<page> | Loopstack". Starlight builds the title tag before middleware runs and keeps the last
 * matching head entry, so rewriting it here applies to every page, docs included.
 */
export const onRequest = defineRouteMiddleware((context) => {
  const route = context.locals.starlightRoute;
  if (!route) return;

  const site = 'Loopstack';
  const titleTag = route.head.find((tag) => tag.tag === 'title');
  if (!titleTag) return;

  const pageTitle = route.entry?.data?.title ?? titleTag.content;
  titleTag.content = pageTitle === site ? site : `${site} | ${pageTitle}`;
});
