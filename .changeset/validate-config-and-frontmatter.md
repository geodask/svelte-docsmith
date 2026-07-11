---
'svelte-docsmith': patch
---

Fail loudly instead of silently on misconfiguration.

- **`defineConfig` now validates the footer.** `footer.copyright`, `footer.poweredBy`, and `footer.columns` (each column's `title`/`links`, and every link's `label`/`href`) are checked, so a malformed footer throws a named error instead of rendering blank.
- **The `docsmith()` Vite plugin warns when it finds no pages.** A missing content directory, or one with no titled `+page.md` files, now logs an actionable warning explaining the empty sidebar instead of leaving you guessing.
- **Invalid YAML frontmatter reports the file.** A page with broken frontmatter throws an error naming the offending file, rather than a bare parser message.
