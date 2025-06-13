import Parser from 'rss-parser';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { z } from "astro/zod";
import type { Loader } from "astro/loaders";

export interface MediumPost {
    id?: string;
    title?: string;
    link?: string;
    pubDate?: Date;
    isoDate?: Date;
    content?: string;
    creator?: string;
    categories?: string[];
    heroImage?: string;
    [key: string]: any;
}

export function mediumLoader({username, cache}: {username: string, cache: boolean}): Loader {
  return {
    name: 'medium-loader',
    schema: () =>
      z.object({
        id: z.string(),
        title: z.string(),
        link: z.string().url(),
        pubDate: z.date(),
        isoDate: z.date(),
        content: z.string().optional(),
        creator: z.string().optional(),
        categories: z.array(z.string()).optional(),
        heroImage: z.string().optional(),
        source: z.string().default('medium'),
        external: z.boolean().default(true),
      }),
    async load({ store, parseData }: any) {
      const posts = await getMediumPosts(username, cache);
      store.clear();
      for (const post of posts) {
        const data = await parseData({
          id: post.id,
          data: post,
        });
        store.set({ id: post.id, data });
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

    return (feed.items).map((item: Parser.Item & { ["content:encoded"]?: string }) => {

        let id = item.link;
        if (item.guid) {
            const match = item.guid.match(/\/p\/([a-zA-Z0-9]+)$/);
            if (match) id = match[1];
        }

        let heroImage: string | undefined;
        if (item['content:encoded']) {
            const match = item['content:encoded'].match(/<img[^>]+src=["']([^"'>]+)["']/i);
            if (match) heroImage = match[1];
        }

        return {
            title: item.title,
            link: item.link,
            pubDate: item.pubDate ? new Date(item.pubDate) : new Date(0),
            isoDate: item.isoDate ? new Date(item.isoDate) : new Date(0),
            content: item['content:encoded'],
            creator: item.creator,
            categories: item.categories,
            heroImage,
            id
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
        return JSON.parse(cached);
    } catch (err) {
        console.warn('Failed to load Medium RSS feed from cache:', err);
        return [];
    }
}

function toCache(file: string, items: MediumPost[]): void {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(items, null, 2), 'utf-8');
}