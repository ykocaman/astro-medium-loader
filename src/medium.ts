import Parser from 'rss-parser';
import { fromStorage, toDate, toStorage } from './storage.js';
import type { MediumConfig, MediumPost } from './types.js';

export const DEFAULT_STORAGE_PATH = '.astro/storage/medium';

type MediumFeedItem = Parser.Item & {
	'content:encoded'?: string;
	'content:encodedSnippet'?: string;
};

export async function getMediumPosts({
	username,
	storage,
}: MediumConfig): Promise<MediumPost[]> {
	const storageFile = `${storage?.path ?? DEFAULT_STORAGE_PATH}/${username}.json`;

	if (storage?.enabled) {
		const cached = fromStorage(storageFile);
		if (cached.length > 0) {
			return cached;
		}
	}

	const posts = await fetchMediumPosts(username);
	// save storage for future use
	if (storage?.enabled) {
		toStorage(storageFile, posts);
	}
	return posts;
}

async function fetchMediumPosts(username: string): Promise<MediumPost[]> {
	const url = `https://medium.com/feed/@${username}`;

	let feed: Parser.Output<{
		'content:encoded'?: string;
		'content:encodedSnippet'?: string;
	}>;
	try {
		feed = await new Parser().parseURL(url);
	} catch (err) {
		throw new Error(
			`Failed to parse Medium RSS feed for @${username}: ${err instanceof Error ? err.message : String(err)}`,
		);
	}

	return (
		feed.items
			// A post without a link is unusable (and would fail the z.url() schema check)
			.filter((item): item is MediumFeedItem & { link: string } =>
				Boolean(item.link),
			)
			.map(toMediumPost)
	);
}

function toMediumPost(item: MediumFeedItem & { link: string }): MediumPost {
	// Post URL without Medium's RSS query string (e.g. ?source=rss-...)
	const [link = ''] = item.link.split('?');
	const slug = slugify(item.title ?? '') || slugFromUrl(link) || '';
	const content = cleanContent(item['content:encoded'] ?? '');

	return {
		title: item.title || '',
		link,
		pubDate: toDate(item.pubDate),
		isoDate: toDate(item.isoDate),
		categories: item.categories || [],
		description: excerpt(item['content:encodedSnippet']),
		content,
		canonical: buildCanonicalLink(link, item.title ?? ''),
		heroImage: extractHeroImage(content),
		slug,
	};
}

function cleanContent(raw: string): string {
	return (
		raw
			// Remove <p>was originally published in ...</p> because we add our own canonical link
			.replace(/<hr><p>[\s\S]*?was originally published in[\s\S]*?<\/p>/i, '')
			// Remove Medium's RSS tracking pixel (fires post.clientViewed on every page view)
			// BEFORE extracting the hero image, so image-less posts don't pick the pixel as hero
			.replace(
				/<img[^>]+src=["']https?:\/\/medium\.com\/_\/stat[^"'>]*["'][^>]*>/gi,
				'',
			)
	);
}

function extractHeroImage(content: string): string | undefined {
	return content.match(/<img[^>]+src=["']([^"'>]+)["']/i)?.[1];
}

function excerpt(snippet: string | undefined): string {
	if (!snippet) return '';
	const words = snippet.match(/\S+/g) ?? [];
	return words.slice(0, 32).join(' ') + (words.length > 32 ? '...' : '');
}

function buildCanonicalLink(link: string, title: string): string {
	return `<hr><p>Read the original post on: <a href="${link}" target="_blank">${escapeHtml(title)}</a></p>`;
}

/**
 * Escape text for safe interpolation into HTML (used for the canonical link text).
 */
function escapeHtml(input: string): string {
	return input
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

/**
 * Derive a slug from a post URL (used when the title is empty).
 * Takes the last path segment, decodes percent-encoded characters
 * (e.g. %C3%A7 → ç) and slugifies it.
 */
function slugFromUrl(url: string): string {
	const segment = url.split('/').filter(Boolean).pop() ?? '';
	let decoded = segment;
	try {
		decoded = decodeURIComponent(segment);
	} catch {
		// keep the raw segment if it contains malformed escapes
	}
	return slugify(decoded);
}

/**
 * Turn a string into a URL-friendly slug.
 * Uses locale-independent lowercase + Unicode normalization so Turkish
 * (and other accented) characters become ASCII instead of being dropped.
 */
export function slugify(input: string): string {
	return input
		.toLowerCase()
		.normalize('NFKD')
		.replace(/ı/g, 'i') // Turkish dotless ı does not decompose under NFKD
		.replace(/[\u0300-\u036f]/g, '') // strip combining diacritics (ç→c, ö→o, ş→s, ü→u, …)
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}
