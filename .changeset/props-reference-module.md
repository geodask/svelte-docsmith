---
'svelte-docsmith': patch
---

Share the props table rules between the page and agent markdown. One props reference module decides what a generated props table says (the caption, each prop row with its deprecation note and description, the inherited attributes notes and the "No props." case), and `<PropsTable of={…}>` and the agent markdown writer only render it, so the two can no longer drift. The playground's control tooltips take their plain-text description from the same module. No change to what pages, `llms-full.txt`, the `.md` twins or the MCP server serve.
