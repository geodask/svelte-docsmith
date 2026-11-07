---
'svelte-docsmith': patch
---

Fix three small props table quirks. A `@deprecated` tag with more than one paragraph now reads "Deprecated: …" as one sentence on the page, as it already did in agent markdown, instead of a bare "Deprecated:" above the paragraphs. A props playground control's tooltip keeps line breaks where the description has a `<br>`, a new paragraph or a list item, instead of running the words together. It also decodes numeric character references (`&#8212;`, `&#x2014;`) and common named ones (`&nbsp;`, `&mdash;`) instead of showing them literally.
