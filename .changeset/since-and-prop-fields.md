---
'svelte-docsmith': minor
---

Generated props tables now say when things arrived and what is inside an object prop. A prop tagged `@since 0.3` gets a "since 0.3" badge on its row, and `@since` in the component's `<!-- @component -->` comment goes on the caption. A prop typed with one of the library's own object types opens into its fields under a collapsed **Fields** toggle, each with its type, `@default` and description, nested as deep as the type goes. A list opens into its item's fields, and a union of objects shows each shape under its name. Library types, `Snippet` and HTML attributes stay closed, and a type that refers to itself stops where it repeats. Agent markdown gets a `Since` column when any row has one, and a row per field named by its path (`options.delay`). Hand-written `Prop` rows take `since` and a `fields` snippet too.

Pages take a `since` frontmatter field, shown in the page header and in the page's agent markdown. A page whose `since` names the newest release in the site's changelog (`0.15` matches `0.15.2`) gets a dot in the sidebar.
