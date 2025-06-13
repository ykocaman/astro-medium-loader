# astro-medium-loader

Fetch Medium RSS feeds by username for use in Astro projects.

## Installation

```bash
pnpm install @ykocaman/astro-medium-loader
```

## Usage

```tsx
// content.config.ts
import { defineCollection } from 'astro:content';
import { mediumLoader } from "@ykocaman/astro-medium-loader";

const medium = defineCollection({
    loader: mediumLoader({username: 'ykocaman', cache: true}),
});

export const collections = { medium };
```

```tsx
// index.astro
---
import { getCollection } from 'astro:content';
const posts = await getCollection('medium');
---

<BlogPost {...post.data}>
	<Content />
</BlogPost>
```

## Options
- `username`: Medium username (without the `@`)
- `cache`: Enable/disable caching (recommended: `true` for production)

## License
MIT