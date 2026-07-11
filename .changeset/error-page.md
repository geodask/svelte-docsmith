---
'svelte-docsmith': minor
---

Add an `ErrorPage` component for 404 and error routes. Drop it into a SvelteKit `+error.svelte` to get a styled error screen that keeps the full site chrome — header, search, footer, theme — so a lost reader can navigate away or search instead of hitting a bare stack trace.

```svelte
<script lang="ts">
	import { docs } from 'svelte-docsmith/content';
	import { ErrorPage } from 'svelte-docsmith';
	import { siteConfig } from '$lib/site-config';
</script>

<ErrorPage config={siteConfig} content={docs} home="/docs" homeLabel="Back to the docs" />
```

It reads the status and message from the current `page` by default (404 → "Page not found"), and accepts `status`, `title`, `message`, `home`/`homeLabel`, `search`, and a `children` snippet for overrides.
