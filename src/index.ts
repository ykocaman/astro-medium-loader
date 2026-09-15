import type { Loader, LoaderContext } from 'astro/loaders';
import { z } from 'astro/zod';
import { getMediumPosts } from './medium.js';
import type { MediumConfig } from './types.js';

export function mediumLoader({ username, storage }: MediumConfig): Loader {
	if (!username) {
		throw new Error('Medium username is required');
	}
	// Accept "@username" and normalize to "username" so the feed URL is always well-formed
	username = username.replace(/^@/, '');

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
					// Extra fields (slug, heroImage, …) are stripped by the zod schema
					data: { ...post },
				});

				store.set({
					id: post.slug,
					data,
					rendered: { html: `${post.content}${post.canonical}` },
				});
			}
		},
	};
}
