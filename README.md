# @ykocaman/astro-medium-loader

[![npm version](https://img.shields.io/npm/v/@ykocaman/astro-medium-loader.svg?style=flat-square)](https://www.npmjs.com/package/@ykocaman/astro-medium-loader)
[![npm downloads](https://img.shields.io/npm/dm/@ykocaman/astro-medium-loader.svg?style=flat-square)](https://www.npmjs.com/package/@ykocaman/astro-medium-loader)
[![GitHub stars](https://img.shields.io/github/stars/ykocaman/astro-medium-loader?style=flat-square)](https://github.com/ykocaman/astro-medium-loader/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/ykocaman/astro-medium-loader.svg?style=flat-square)](https://github.com/ykocaman/astro-medium-loader/issues)

An Astro loader that fetches and parses Medium RSS feeds by username. Supports canonical links, optional caching, and flexible storage strategies.

## Installation

```bash
pnpm install @ykocaman/astro-medium-loader
# or
npm install @ykocaman/astro-medium-loader
# or
yarn add @ykocaman/astro-medium-loader
````

## Usage

Import and configure the loader in your `content.config.ts`:

### 1. Live Fetching (Every Request)

Fetch and parse the user’s Medium posts on every build or request.

```ts
// content.config.ts
import { defineCollection } from 'astro:content';
import { mediumLoader } from '@ykocaman/astro-medium-loader';

const medium = defineCollection({
  loader: mediumLoader({
    username: 'ykocaman'
  })
});

export const collections = { medium };
```

### 2. Cached Fetching (Recommended for Development)

Cache the fetched feed under `.astro/storage/medium` to speed up repeated requests during development.

```ts
// content.config.ts
import { defineCollection } from 'astro:content';
import { mediumLoader } from '@ykocaman/astro-medium-loader';

const medium = defineCollection({
  loader: mediumLoader({
    username: 'ykocaman',
    storage: {
      enabled: true,
      path: '.astro/storage/medium'
    }
  })
});

export const collections = { medium };
```

> **Note:** The `.astro` directory is typically git-ignored, so each new deploy will re-fetch the latest Medium posts.

### 3. Persistent Storage (Offline Builds)

Store the feed data permanently in a local directory (e.g. `src/content/medium`) so no further requests to Medium are needed after the initial build.

```ts
// content.config.ts
import { defineCollection } from 'astro:content';
import { mediumLoader } from '@ykocaman/astro-medium-loader';

const medium = defineCollection({
  loader: mediumLoader({
    username: 'ykocaman',
    storage: {
      enabled: true,
      path: 'src/content/medium'
    }
  })
});

export const collections = { medium };
```

> **Note:** On the first build, the loader writes to `src/content/medium/${username}.json`. Subsequent builds read directly from that file.

### 4. Rendering Your Collection

Use Astro’s content API to retrieve and render your Medium posts just like any other collection:

```ts
---
import { type CollectionEntry, getCollection, render } from 'astro:content';
import BlogPost from '../../layouts/BlogPost.astro';

export async function getStaticPaths() {
	const posts = await getCollection('medium');
	return posts.map((post) => ({
		params: { slug: post.id },
		props: post,
	}));
}
type Props = CollectionEntry<'medium'>;

const post = Astro.props;
const { Content } = await render(post);
---

<BlogPost {...post.data}>
	<Content />
</BlogPost>

```

## Options

| Option            | Type    | Default | Description                                                                                   |
| ----------------- | ------- | ------- | --------------------------------------------------------------------------------------------- |
| `username`        | string  | —       | Medium username (without the `@`)                                                             |
| `storage.enabled` | boolean | `false` | Enable caching or persistent storage                                                          |
| `storage.path`    | string  | `.astro/storage/medium` | Path to content directory (e.g. `src/content/medium`) |

## Features

* **RSS Fetching & Parsing**
  Automatically fetches and parses Medium RSS feeds.
* **Canonical Links**
  Injects a canonical link pointing back to the original Medium post.
* **Flexible Caching**
  Cache feed data in `.astro` for faster development builds.
* **Persistent Content Storage**
  Save feed output to your `src/content` directory for offline or CI-friendly builds.
* **Full Astro Content Integration**
  Works seamlessly with Astro’s [default blog template](https://astro.build/themes/details/blog/), `render` and `getCollection` APIs.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'Add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

