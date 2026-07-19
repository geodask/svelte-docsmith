---
'svelte-docsmith': patch
---

Stop the code block clipping Twoslash hover popups. A code block is a scroll container, so an absolutely positioned popup was cut off at its edges: hovering a token on the last line showed a sliver of the type and nothing else. CSS alone can't solve it, because an element that scrolls horizontally must also clip vertically. The popup is now promoted to fixed positioning on hover, so it escapes the block, and it flips above the token when there isn't room below. Popups also shrink to the width of the type rather than always filling the maximum. Without JavaScript the popup still opens on hover exactly as before.
