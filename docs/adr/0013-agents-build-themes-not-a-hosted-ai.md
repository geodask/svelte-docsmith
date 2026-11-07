# Agents build themes, not a hosted AI

An AI that turns "make it feel warmer, like our logo" into a theme fits brand matching well. A chat inside the builder would call an LLM through the docs site's server.

Instead the theme file is documented well enough for the author's own coding agent to write it: the theming page, which agents already read through the docs MCP server, `llms.txt` and agent markdown, explains every token and how to build a theme link. The agent writes `src/theme.css` into the repo, or hands back a theme link to fine-tune in the builder.

## Considered Options

- **A hosted chat in the builder.** Rejected for now: the maintainer pays for every request and has to rate-limit and defend an open endpoint, for something the authors' editor agents do for free. Revisit if authors ask for it.

## Consequences

- Theme docs are written for agents as much as people: complete token list, exact file shape, the theme link format.
- No server runtime or API key is needed for theming.
