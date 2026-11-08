---
'svelte-docsmith': patch
---

The header's GitHub star count now shows up even when the build can't fetch it. Shared build machines (Vercel, Netlify, GitHub Actions) often hit GitHub's unauthenticated rate limit, which left sites without a count unless they set `GITHUB_TOKEN`. Now, when the build has no count, each reader's browser asks GitHub itself, once, and caches the answer for a day, so it stays within every reader's own allowance. Setting `GITHUB_TOKEN` still bakes the count into the build and skips the browser request, and `site.githubStars: false` turns both off.
