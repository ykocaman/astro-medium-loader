import { z } from 'astro/zod';
import type { Loader, LoaderContext } from 'astro/loaders';
import type { MediumConfig } from './types.js';
import { getMediumPosts } from './medium.js';

export function mediumLoader({ username, storage }: MediumConfig): Loader {
  storage = { ...{ enabled: false, path: '.astro/storage/medium' }, ...storage };

  if (!username) {
    throw new Error('Medium username is required');
  }
  return {
    name: 'medium-loader',
    schema: z.object({
      title: z.string(),
      link: z.url(),
      isoDate: z.date(),
      pubDate: z.date(),
      updatedDate: z.date().optional(),
      description: z.string(),
      content: z.string(),
      canonical: z.string(),
      categories: z.array(z.string()).optional(),
      heroImage: z.string().optional(),
      source: z.string().default('medium'),
      external: z.boolean().default(true),
    }),
    load: async ({ store, parseData }: LoaderContext) => {
      const posts = await getMediumPosts({ username, storage });
      store.clear();

      for (const post of posts) {
        const data = await parseData({
          id: post.slug,
          data: post as unknown as Record<string, unknown>,
        });

        store.set({
          id: post.slug,
          data,
          rendered: { html: post.content + post.canonical },
        });
      }
    },
  };
}
