import { z } from "astro/zod";
import type { Loader, LoaderContext } from "astro/loaders";
import type {  MediumConfig } from './scheme.js';
import { getMediumPosts } from "./medium.js";

export function mediumLoader({ username, storage = { enabled: false, path: '.astro/storage/medium' } }: MediumConfig): Loader {
    return {
        name: 'medium-loader',
        schema: () =>
            z.object({
                title: z.string(),
                link: z.string().url(),
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
        load: async ({ store, parseData, renderMarkdown }: LoaderContext) => {
            const posts = await getMediumPosts({ username, storage });
            store.clear();

            for (const post of posts) {

                const data = await parseData({
                    id: post.slug,
                    data: post,
                });

                store.set({
                    id: post.slug,
                    data,
                    rendered: await renderMarkdown(post.content + post.canonical),
                });
            }
        }
    };
}
