---
'svelte-docsmith': patch
---

Stop the code block clipping Twoslash hover popups. A code block is a scroll container, so an absolutely positioned popup was cut off at its edges: hovering a token on the last line showed a sliver of the type and nothing else. CSS alone can't solve it, because an element that scrolls horizontally must also clip vertically. The popup is now promoted to fixed positioning on hover, so it escapes the block, and it flips above the token when there isn't room below. Popups also shrink to the width of the type rather than always filling the maximum. Without JavaScript the popup still opens on hover exactly as before.

The popup's documentation also reads as documentation now. Sitting inside a `<pre>`, it inherited monospace and whatever token colour the hovered word happened to carry, so the prose looked like more code; it is now sans-serif and muted, with the signature alone staying mono. Each `@param` is its own line with a space after the tag, rather than the whole block running together as `@paramcallbackfn`.

The `@param` tags also took on the colour of whatever word you hovered, because the dark-theme swap repaints every `span` inside a code block with `--shiki-dark`, which those spans inherited from the hovered token. The popup's documentation now defines that variable itself, so tags read as tags and their text as prose.
