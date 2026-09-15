export interface MediumPost {
	slug: string;
	title: string;
	link: string;
	isoDate: Date;
	pubDate: Date;
	updatedDate?: Date;
	description: string;
	content: string;
	/**
	 * HTML attribution block (an `<hr>` + link back to the original Medium
	 * post), not a canonical URL. Appended after `content` when rendering
	 * (see `rendered.html` in the loader). Kept as `canonical` for API
	 * stability since this is a public schema field.
	 */
	canonical: string;
	categories?: string[];
	heroImage?: string;
}

export interface MediumConfig {
	username: string;
	storage?: {
		enabled?: boolean;
		path?: string;
	};
}
