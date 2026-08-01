# Library authors are the audience

DocSmith is for the maintainer of a Svelte library documenting it for the people
who use it. Nobody else is blocked, and a handbook or product-docs site built
with it will work fine. But where a library author's needs conflict with anyone
else's, the library author decides.

## Why

Every hard constraint DocSmith carries is an advantage for that audience and a
tax on any other.

- Doc pages are SvelteKit routes so that a live example is the real component
  from the real library, running and stateful. Only a library author needs that.
  Everyone else pays for it and uses none of it.
- Tailwind v4 is structural, not a preference. `layouts/` and `landing/` are 16
  components with no scoped styles at all, written entirely in utility classes,
  and there is no DocSmith without `DocsShell`. Dropping the Tailwind
  requirement means rewriting them and replacing the 77 vendored shadcn
  primitives, which is a different library rather than a future minor.

The counter-argument is market size: Svelte library authors with docs is a small
population, and the general docs user is where volume would come from. It was
rejected because volume you cannot serve well is not volume. Someone documenting
a SaaS product is better served by Starlight and will work that out; the library
author gets something no other tool offers.

## Considered options

- **Serve anyone documenting anything in Svelte.** Rejected on the rewrite cost
  above, and because hedging it kept three separate bets permanently open
  instead of closing them.

## Consequences

- Tailwind v4 stays a hard peer dependency. No styling abstraction layer, and
  the shell is free to lean harder on Tailwind rather than defensively less.
- The vendored shadcn primitives are an implementation detail, not public API.
  They may be replaced wholesale in a minor.
- Non-Svelte support, OpenAPI reference generation and generic-SSG parity are
  out of scope by construction, not by backlog priority.
- The docs site introduction currently pitches the broader "gives you the
  pipeline, the layout and the navigation out of the box" framing, which
  contradicts this and needs reconciling.
