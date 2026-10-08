import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { getPosts } from '../lib/blog';

export const GET: APIRoute = async (context) => {
  const posts = (await getPosts()).filter((post) => !post.data.draft);

  return rss({
    title: 'Loopstack Blog',
    description: 'Releases, patterns and notes from the people building Loopstack.',
    site: context.site ?? 'https://loopstack.ai',
    trailingSlash: false,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      author: post.data.author,
      link: `/blog/${post.id}`,
    })),
  });
};
