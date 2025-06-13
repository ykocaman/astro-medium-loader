import Parser from 'rss-parser';
import { fromStorage, toStorage } from './storage.js';
import type { MediumConfig } from './scheme.js';
import type { MediumPost } from './scheme';

export async function getMediumPosts({ username, storage = { enabled: false, path: '.' } }: MediumConfig): Promise<MediumPost[]> {
    const STORAGE_FILE = `${storage.path}/${username}.json`;
    let posts: MediumPost[] = [];

    if (storage.enabled) {
        console.log('Checking storage for Medium posts:', STORAGE_FILE);
        posts = fromStorage(STORAGE_FILE);
        if (posts.length > 0) {
            return posts;
        }
    }

    posts = await fetchMediumPosts(username);
    // save storage for future use
    if (storage.enabled) {
        toStorage(STORAGE_FILE, posts);
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