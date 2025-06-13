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

export interface MediumConfig {
    username: string;
    storage?: {
        enabled: boolean;
        path: string;
    }
}