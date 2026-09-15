import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fromStorage, toDate, toStorage } from './storage.js';
import type { MediumPost } from './types.js';

const samplePost: MediumPost = {
	slug: 'hello-world',
	title: 'Hello World',
	link: 'https://medium.com/@user/hello-world',
	isoDate: new Date('2024-01-01T00:00:00.000Z'),
	pubDate: new Date('2024-01-01T00:00:00.000Z'),
	description: 'desc',
	content: '<p>content</p>',
	canonical: '<hr><p>Read the original post on: ...</p>',
	categories: ['a'],
	heroImage: 'https://example.com/img.png',
};

describe('storage', () => {
	let dir: string;

	beforeEach(() => {
		dir = mkdtempSync(path.join(tmpdir(), 'astro-medium-loader-'));
	});

	afterEach(() => {
		rmSync(dir, { recursive: true, force: true });
	});

	it('round-trips posts through toStorage + fromStorage, restoring Date objects', () => {
		const file = path.join(dir, 'nested', 'user.json');
		toStorage(file, [samplePost]);

		expect(existsSync(file)).toBe(true);

		const loaded = fromStorage(file);
		expect(loaded).toHaveLength(1);
		expect(loaded[0]?.slug).toBe('hello-world');
		expect(loaded[0]?.pubDate).toEqual(new Date('2024-01-01T00:00:00.000Z'));
		expect(loaded[0]?.isoDate).toEqual(new Date('2024-01-01T00:00:00.000Z'));
	});

	describe('fromStorage', () => {
		it('returns [] and warns when the file does not exist', () => {
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
			const result = fromStorage(path.join(dir, 'missing.json'));
			expect(result).toEqual([]);
			expect(warn).toHaveBeenCalled();
			warn.mockRestore();
		});

		it('returns [] and warns when the file does not contain a JSON array', () => {
			const file = path.join(dir, 'not-array.json');
			writeFileSync(file, JSON.stringify({ oops: true }), 'utf-8');

			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
			const result = fromStorage(file);
			expect(result).toEqual([]);
			expect(warn).toHaveBeenCalled();
			warn.mockRestore();
		});

		it('filters out malformed cached entries while keeping valid ones', () => {
			const file = path.join(dir, 'mixed.json');
			writeFileSync(
				file,
				JSON.stringify([
					{ ...samplePost, slug: 'valid-post' },
					{ title: 'missing other required fields' },
					'not even an object',
				]),
				'utf-8',
			);

			const result = fromStorage(file);
			expect(result).toHaveLength(1);
			expect(result[0]?.slug).toBe('valid-post');
		});
	});

	describe('toStorage', () => {
		it('fails soft (warns, does not throw) when the destination cannot be created', () => {
			const blockerFile = path.join(dir, 'blocker');
			writeFileSync(blockerFile, 'not a directory', 'utf-8');
			// blockerFile exists as a *file*, so treating it as a directory segment must fail
			const impossiblePath = path.join(blockerFile, 'sub', 'user.json');

			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
			expect(() => toStorage(impossiblePath, [samplePost])).not.toThrow();
			expect(warn).toHaveBeenCalled();
			warn.mockRestore();
		});
	});
});

describe('toDate', () => {
	it('parses a valid date string', () => {
		expect(toDate('2024-01-01T00:00:00.000Z')).toEqual(
			new Date('2024-01-01T00:00:00.000Z'),
		);
	});

	it('falls back to epoch for invalid input', () => {
		expect(toDate('not-a-date')).toEqual(new Date(0));
	});

	it('falls back to epoch for undefined', () => {
		expect(toDate(undefined)).toEqual(new Date(0));
	});
});
