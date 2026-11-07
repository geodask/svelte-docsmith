# Code colours are theme tokens

Code blocks are coloured by a Shiki theme pair set separately from the site's theme, so picking Ocean leaves github-light/github-dark code blocks, and a custom theme has no way to colour its code at all.

Now code colours are tokens in the theme file (`--code-keyword`, `--code-string` and the rest), rendered through Shiki's CSS-variables theme. Every preset defines them for both colour modes, and a theme that leaves them out falls back to defaults. `codeTheme` stays as an optional override naming an exact Shiki pair for authors who want one.

## Considered Options

- **Each preset names a Shiki pair.** Rejected: custom themes, the main case, would still get the default pair, and a theme would be a file plus a config value.
- **Tokens only, no named-pair override.** Rejected: authors who want `catppuccin` exactly would have to transcribe it into tokens.

## Consequences

- A theme stays one file, which is what the builder exports and the CLI writes.
- Switching themes in the browser recolours code without a rebuild, so the builder previews code blocks live.
- The code block renderer builds every block with the CSS-variables theme unless `codeTheme` is set; Twoslash popups and line highlights read the same tokens.
