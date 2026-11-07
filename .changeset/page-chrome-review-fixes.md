---
'svelte-docsmith': patch
---

Harden the page chrome. Two `site.nav` links, or two footer links or columns, that share an `href` or a title no longer crash the header or footer render. The feedback widget's "open an issue" link now keeps only the owner and repository of `site.github`, so a URL with `.git`, a subpath like `/tree/main`, a query or a hash still opens the issue form; an account or org URL, a `git+https:` URL or a value that isn't a URL shows no issue link instead of a broken one. The head tags and the footer now read the site config and the resolved page directly, like the headers, and `site.logo` takes the same classes as the built-in mark.
