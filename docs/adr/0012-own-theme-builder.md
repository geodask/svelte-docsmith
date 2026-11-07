# Our own theme builder on `/themes`

Customising a theme means hand-writing about 35 OKLCH tokens for both colour modes. tweakcn.com is a capable builder whose export already drops into a DocSmith theme file, so linking to it was the cheap option.

Now `/themes` on the docs site becomes a theme builder. Guided controls (brand colour, neutral tint, radius, fonts, shadow strength) generate the full token set for both modes, an Advanced panel edits any single token, and contrast below WCAG AA is flagged. The preview is an embedded sample docs page (sidebar, prose, code block, callout, props table) in both modes side by side, while the builder's own controls keep the default theme; a button applies the theme across the whole site. Pasting tweakcn or shadcn CSS loads it. A theme leaves as a copied or downloaded theme file plus its `docsmith({ theme })` line, and as a theme link: the builder URL carrying the whole theme. `/docs/theming` stays the reference and links presets into the builder.

## Considered Options

- **Link tweakcn and build nothing.** Rejected: it cannot preview a theme on real docs chrome (sidebar, code blocks, callouts, props tables), and the CLI handoff needs a builder that can send a theme back.
- **Raw pickers for every token.** Rejected: brand matching means "my colour, make the rest fit", not seventy inputs. Kept as the Advanced panel.
- **Re-skin the whole site as the preview**, as the showcase does today. Rejected: a bad colour makes the builder's own controls unreadable.

## Consequences

- The theme link is the seam the CLI handoff and agents use to pass a theme around, so its encoding is a public format to keep stable.
- The builder needs a palette generator that derives every token from a few inputs, for both modes.
- Fonts are named, not loaded: a theme sets font families and the author loads them. Loading fonts from the builder is a later decision.
