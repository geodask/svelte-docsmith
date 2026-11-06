# Svelte DocSmith

A documentation framework for Svelte 5 library authors: markdown doc pages, live
examples and API reference, all inside one real SvelteKit app.

## Language

### Component API reference

**Prop**:
One member of a component's `$props()`. Snippets (including `children`),
callbacks and bindable values are all props.
_Avoid_: attribute, argument, option, slot, event

**Props table**:
The API reference for one component on a doc page, listing its props one per row.
_Avoid_: API table, type table, props grid

**Prop row**:
One entry in a props table: a prop's name, type, default, required/bindable
marks and description.
_Avoid_: prop line, field

**Generated props table**:
A props table derived entirely from the component's own source, with no content
written on the doc page.
_Avoid_: auto table, auto type table, docgen table

**Props import**:
Importing a component file with the `?props` query, which yields that
component's extracted props for a generated props table.
_Avoid_: docgen data, props metadata, props JSON

**Hand-written props table**:
A props table whose rows the author writes on the doc page.
_Avoid_: manual table, static table

**Inherited attributes**:
What a component accepts by spreading its remaining props onto something else:
an element's native attributes, or every prop of another component's type. They
are summarised by what they belong to, never listed as props.
_Avoid_: rest props, passthrough props, HTML props, inherited props
