import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { parseURLMock } = vi.hoisted(() => ({ parseURLMock: vi.fn() }));

vi.mock('rss-parser', () => ({
	default: class {
		parseURL(url: string) {
			return parseURLMock(url);
		}
	},
}));

import { getMediumPosts, slugify } from './medium.js';

describe('slugify', () => {
	// Regression test for a bug that shipped in 0.3.0: a naive
	// [^a-z0-9]+ -> '-' replace silently dropped Turkish letters instead of
	// transliterating them (e.g. "için" -> "i-in", "Adımda" -> "ad-mda"),
	// producing garbled slugs for any non-ASCII title.
	it('transliterates Turkish letters instead of dropping them', () => {
		expect(slugify('Kubernetes için Prometheus ve Grafana Kurulumu')).toBe(
			'kubernetes-icin-prometheus-ve-grafana-kurulumu',
		);
		expect(slugify('7 Adımda Kubernetes Cluster Kurulumu')).toBe(
			'7-adimda-kubernetes-cluster-kurulumu',
		);
		expect(slugify('SSH ile Port Aktarımı ve Tünelleme')).toBe(
			'ssh-ile-port-aktarimi-ve-tunelleme',
		);
		expect(slugify('SVN’den Git’e Proje Taşımak')).toBe(
			'svn-den-git-e-proje-tasimak',
		);
	});

	it('leaves plain ASCII titles untouched', () => {
		expect(slugify('Web nedir?')).toBe('web-nedir');
	});

	it('trims leading/trailing separators and collapses repeats', () => {
		expect(slugify('  Hello,   World!!  ')).toBe('hello-world');
	});
});

describe('getMediumPosts', () => {
	let storageDir: string;

	beforeEach(() => {
		storageDir = mkdtempSync(path.join(tmpdir(), 'astro-medium-loader-'));
		parseURLMock.mockReset();
	});

	afterEach(() => {
		rmSync(storageDir, { recursive: true, force: true });
	});

	function feedWith(items: Record<string, unknown>[]) {
		return { items };
	}

	it('fetches from the network and maps RSS items into MediumPost fields', async () => {
		const longSnippet = Array.from({ length: 40 }, (_, i) => `word${i}`).join(
			' ',
		);

		parseURLMock.mockResolvedValueOnce(
			feedWith([
				{
					title: 'Kubernetes için Prometheus ve Grafana Kurulumu',
					link: 'https://medium.com/@testuser/post-1?source=rss-abc',
					pubDate: '2024-01-01T00:00:00.000Z',
					isoDate: '2024-01-01T00:00:00.000Z',
					categories: ['k8s', 'devops'],
					'content:encoded':
						'<p>Hello</p><img src="https://example.com/hero.png">' +
						'<hr><p>This story was originally published in Some Publication</p>' +
						'<img src="https://medium.com/_/stat?event=post.clientViewed&x=1">',
					'content:encodedSnippet': longSnippet,
				},
			]),
		);

		const posts = await getMediumPosts({ username: 'testuser' });

		expect(parseURLMock).toHaveBeenCalledWith(
			'https://medium.com/feed/@testuser',
		);
		expect(posts).toHaveLength(1);

		const post = posts[0];
		expect(post?.title).toBe('Kubernetes için Prometheus ve Grafana Kurulumu');
		// query string stripped
		expect(post?.link).toBe('https://medium.com/@testuser/post-1');
		expect(post?.slug).toBe('kubernetes-icin-prometheus-ve-grafana-kurulumu');
		expect(post?.categories).toEqual(['k8s', 'devops']);
		// tracking pixel and "originally published" notice removed
		expect(post?.content).not.toContain('medium.com/_/stat');
		expect(post?.content).not.toContain('originally published');
		expect(post?.content).toContain('https://example.com/hero.png');
		expect(post?.heroImage).toBe('https://example.com/hero.png');
		expect(post?.canonical).toContain(
			'href="https://medium.com/@testuser/post-1"',
		);
		// excerpt truncated to 32 words with a trailing ellipsis
		expect(post?.description.endsWith('...')).toBe(true);
		expect(post?.description.split(' ')).toHaveLength(32);
	});

	it('produces an empty description when there is no snippet', async () => {
		parseURLMock.mockResolvedValueOnce(
			feedWith([
				{
					title: 'No Snippet Post',
					link: 'https://medium.com/@testuser/no-snippet',
				},
			]),
		);

		const posts = await getMediumPosts({ username: 'testuser' });
		expect(posts[0]?.description).toBe('');
	});

	it('does not truncate short snippets', async () => {
		parseURLMock.mockResolvedValueOnce(
			feedWith([
				{
					title: 'Short Snippet Post',
					link: 'https://medium.com/@testuser/short-snippet',
					'content:encodedSnippet': 'just a few words here',
				},
			]),
		);

		const posts = await getMediumPosts({ username: 'testuser' });
		expect(posts[0]?.description).toBe('just a few words here');
	});

	it('skips feed items without a link', async () => {
		parseURLMock.mockResolvedValueOnce(feedWith([{ title: 'Linkless Post' }]));

		const posts = await getMediumPosts({ username: 'testuser' });
		expect(posts).toEqual([]);
	});

	it('throws a descriptive error when the feed fails to load', async () => {
		parseURLMock.mockRejectedValueOnce(new Error('network down'));

		await expect(getMediumPosts({ username: 'testuser' })).rejects.toThrow(
			'Failed to parse Medium RSS feed for @testuser: network down',
		);
	});

	it('caches posts to disk and serves the next call from cache without refetching', async () => {
		parseURLMock.mockResolvedValueOnce(
			feedWith([
				{
					title: 'Cached Post',
					link: 'https://medium.com/@testuser/cached-post',
					'content:encoded': '<p>Body</p>',
				},
			]),
		);

		const storage = { enabled: true, path: storageDir };

		const first = await getMediumPosts({ username: 'testuser', storage });
		expect(first).toHaveLength(1);
		expect(parseURLMock).toHaveBeenCalledTimes(1);

		const second = await getMediumPosts({ username: 'testuser', storage });
		expect(second).toHaveLength(1);
		expect(second[0]?.slug).toBe(first[0]?.slug);
		// still only called once: second call was served from the cache file
		expect(parseURLMock).toHaveBeenCalledTimes(1);
	});
});
