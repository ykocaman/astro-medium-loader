export interface MediumPost {
  slug: string;
  title: string;
  link: string;
  isoDate: Date;
  pubDate: Date;
  updatedDate?: Date;
  description: string;
  content: string;
  canonical: string;
  categories?: string[];
  heroImage?: string;
}

export interface MediumConfig {
  username: string;
  storage?: {
    enabled: boolean;
    path?: string;
  };
}
