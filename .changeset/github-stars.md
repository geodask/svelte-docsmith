---
'svelte-docsmith': minor
---

Show your repo's GitHub star count in the header. When `site.github` is a `https://github.com/owner/repo` URL, the header GitHub link now shows the count (`1.2k`, with the exact number in its accessible name) on desktop and tablet, and stays a bare icon on phones. The plugin fetches it from the GitHub API once per build and once per `vite dev` start, sending `GITHUB_TOKEN` when it is set, so readers' browsers never call GitHub. A failed fetch logs a warning and leaves the count off, never failing the build. Set `site.githubStars: false` to turn it off. The count is also exported as `githubStars` from `svelte-docsmith/site` for pages of your own.
