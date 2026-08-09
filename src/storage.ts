import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { MediumPost } from './types.js';

export function fromStorage(file: string): MediumPost[] {
	if (!existsSync(file)) {
		console.warn('Storage file does not exist:', file);
		return [];
	}

	try {
		const cached = readFileSync(file, 'utf-8');
		return JSON.parse(cached).map((item: Record<string, unknown>) => ({
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
	mkdirSync(path.dirname(file), { recursive: true });
	writeFileSync(file, JSON.stringify(items, null, 2), 'utf-8');
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
