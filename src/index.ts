import Parser from 'rss-parser';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { z } from "astro/zod";
import type { Loader, LoaderContext } from "astro/loaders";

export interface MediumPost {
    slug: string;
    title: string;
    link: string;
    isoDate: Date;
    pubDate: Date;
    description: string;
    content: string;
    categories?: string[];
    heroImage?: string;
    [key: string]: any;
}

export function mediumLoader({ username, cache }: { username: string, cache: boolean }): Loader {
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
            const posts = await getMediumPosts(username, cache);
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
export async function getMediumPosts(username: string, cache: boolean): Promise<MediumPost[]> {
    if (!username) {
        throw new Error('Medium username is required');
    }
    const CACHE_FILE = `.astro/cache/medium/${username}.json`;
    let posts: MediumPost[] = [];

    if (cache) {
        posts = fromCache(CACHE_FILE);
        if (posts.length > 0) {
            return posts;
        }
    }

    posts = await fetchMediumPosts(username);
    if (cache) {
        toCache(CACHE_FILE, posts);
    }
    return posts;
}

async function fetchMediumPosts(username: string): Promise<MediumPost[]> {
    const url = `https://medium.com/feed/@${username}`;

    const parser = new Parser();

    console.log('Parsing Medium RSS feed from', url);
    let feed;
    try {
        feed = await parser.parseURL(url);
    } catch (err) {
        throw new Error(`Failed to parse Medium RSS feed for @${username}: ${err instanceof Error ? err.message : String(err)}`);
    }

    return (feed.items).map((item: Parser.Item & { ["content:encoded"]?: string, ["content:encodedSnippet"]?: string }) => {

        let slug: string = item.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || item.link?.split('/').pop() || '';

        let heroImage: string | undefined;
        if (item['content:encoded']) {
            const match = item['content:encoded'].match(/<img[^>]+src=["']([^"'>]+)["']/i);
            if (match) heroImage = match[1];
        }

        let description: string = '';
        if (item['content:encodedSnippet']) {
            const words = item['content:encodedSnippet'].match(/\S+/g) || [];
            description = words.slice(0, 32).join(' ') + (words.length > 32 ? '...' : '');
        }

        let content: string = item['content:encoded'] || '';
        // Remove <p>was originally published in ...</p> if present, because we will add a canonical link to the original post
        content = content.replace(/<hr><p>[\s\S]*?was originally published in[\s\S]*?<\/p>/i, '');

        let canonical: string = `<hr><p>Read the original post on: <a href="${item.link}" rel="canonical" target="_blank">${item.title}</a></p>`;

        return {
            title: item.title || '',
            link: item.link || '',
            pubDate: item.pubDate ? new Date(item.pubDate) : new Date(0),
            isoDate: item.isoDate ? new Date(item.isoDate) : new Date(0),
            categories: item.categories || [],
            description,
            content,
            canonical,
            heroImage,
            slug
        };
    });
}

function fromCache(file: string): MediumPost[] {
    if (!existsSync(file)) {
        console.warn('Cache file does not exist:', file);
        return [];
    }

    try {
        const cached = readFileSync(file, 'utf-8');
        console.log('Loaded Medium RSS feed from cache:', file);
        return JSON.parse(cached).map((item: any) => {
            return {
                ...item,
                pubDate: item.pubDate ? new Date(item.pubDate) : new Date(0),
                updatedDate: item.updatedDate ? new Date(item.updatedDate) : new Date(0),
                isoDate: item.isoDate ? new Date(item.isoDate) : new Date(0),
            };
        });
    } catch (err) {
        console.warn('Failed to load Medium RSS feed from cache:', err);
        return [];
    }
}

function toCache(file: string, items: MediumPost[]): void {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(items, null, 2), 'utf-8');
}