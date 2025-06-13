
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import type { MediumPost } from './scheme';

export function fromStorage(file: string): MediumPost[] {
    if (!existsSync(file)) {
        console.warn('Storage file does not exist:', file);
        return [];
    }

    try {
        const cached = readFileSync(file, 'utf-8');
        console.log('Loaded RSS feed from storage:', file);
        return JSON.parse(cached).map((item: any) => {
            return {
                ...item,
                pubDate: item.pubDate ? new Date(item.pubDate) : undefined,
                updatedDate: item.updatedDate ? new Date(item.updatedDate) : undefined,
                isoDate: item.isoDate ? new Date(item.isoDate) : undefined,
            };
        });
    } catch (err) {
        console.warn('Failed to load RSS feed from storage:', err);
        return [];
    }
}

export function toStorage(file: string, items: MediumPost[]): void {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(items, null, 2), 'utf-8');
}