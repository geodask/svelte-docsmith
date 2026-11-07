---
'svelte-docsmith': minor
---

Add `svelte-docsmith theme`, the other half of the new theme builder at /themes. Run it from your docs app: it opens the builder, and when you press "Send to my project" it writes the theme to `src/theme.css` and sets `theme` in your `docsmith()` call. If the browser can't reach the terminal (a container, SSH), paste the code the builder shows at the prompt instead. `--link <theme link>` writes a shared theme link straight into the project, and `--file`, `--config`, `--builder` and `--no-open` adjust the rest. The theme link format is documented on /docs/theming for agents.
