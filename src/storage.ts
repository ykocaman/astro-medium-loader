import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { MediumPost } from './types.js';

/** Required string fields every cached post must have to be considered usable. */
const REQUIRED_STRING_FIELDS = [
	'slug',
	'title',
	'link',
	'description',
	'content',
	'canonical',
] as const;

function isValidCachedPost(item: unknown): item is Record<string, unknown> {
	if (typeof item !== 'object' || item === null) return false;
	const record = item as Record<string, unknown>;
	return REQUIRED_STRING_FIELDS.every(
		(field) => typeof record[field] === 'string',
	);
}

export function fromStorage(file: string): MediumPost[] {
	if (!existsSync(file)) {
		console.warn('Storage file does not exist:', file);
		return [];
	}

	try {
		const cached = readFileSync(file, 'utf-8');
		const parsed: unknown = JSON.parse(cached);
		if (!Array.isArray(parsed)) {
			console.warn(
				'Storage file does not contain an array, ignoring cache:',
				file,
			);
			return [];
		}

		return parsed.filter(isValidCachedPost).map((item) => ({
			...item,
			// Default missing/invalid dates instead of undefined so the loader schema (z.date()) still validates
			pubDate: toDate(item.pubDate),
			updatedDate: item.updatedDate ? toDate(item.updatedDate) : undefined,
			isoDate: toDate(item.isoDate),
		})) as MediumPost[];
	} catch (err) {
		console.warn('Failed to load RSS feed from storage:', err);
		return [];
	}
}

export function toStorage(file: string, items: MediumPost[]): void {
	try {
		mkdirSync(path.dirname(file), { recursive: true });
		writeFileSync(file, JSON.stringify(items, null, 2), 'utf-8');
	} catch (err) {
		// Fail soft: caller already has valid posts to return even if caching them fails
		console.warn('Failed to write RSS feed cache to storage:', err);
	}
}

/**
 * Parse a cached date value; fall back to epoch on missing or invalid input
 * (empty string / garbage would otherwise produce an Invalid Date that
 * serializes to null in JSON, silently corrupting the cache).
 */
export function toDate(value: unknown): Date {
	const date = value ? new Date(value as string) : new Date(0);
	return Number.isNaN(date.getTime()) ? new Date(0) : date;
}
