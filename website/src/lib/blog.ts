import { type CollectionEntry, getCollection } from 'astro:content';

export type Post = CollectionEntry<'blog'>;

/** Published posts, newest first. Drafts are kept in dev so they can be previewed. */
export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection('blog', ({ data }) => import.meta.env.DEV || !data.draft);
  return posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

/** Hero and card image sizing, carried over from the post frontmatter. */
export function imageClass(size: 'sm' | 'full', themeAdapt: boolean): string {
  return [size === 'sm' ? 'object-contain' : 'object-cover', themeAdapt ? 'dark:invert' : ''].filter(Boolean).join(' ');
}
