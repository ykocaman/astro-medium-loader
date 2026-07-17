import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
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
      pubDate: item.pubDate ? new Date(item.pubDate as string) : undefined,
      updatedDate: item.updatedDate ? new Date(item.updatedDate as string) : undefined,
      isoDate: item.isoDate ? new Date(item.isoDate as string) : undefined,
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
