---
'svelte-docsmith': minor
---

Normalize the public component API ahead of v1.0 (breaking).

- **`Tabs` no longer takes an `items` array.** Each `TabItem` now declares its own `label`, and `Tabs` builds the trigger row from them, so labels are written once instead of duplicated between `items` and each `TabItem`'s `value`. The first tab is selected by default; pass `value` on `Tabs` to start elsewhere.

  ```svelte
  <!-- before -->
  <Tabs items={['npm', 'pnpm']} value="npm">
    <TabItem value="npm">…</TabItem>
    <TabItem value="pnpm">…</TabItem>
  </Tabs>

  <!-- after -->
  <Tabs>
    <TabItem label="npm">…</TabItem>
    <TabItem label="pnpm">…</TabItem>
  </Tabs>
  ```

- **`Callout`'s `type` prop is renamed to `variant`**, matching `Badge` and the shadcn convention (`<Callout variant="tip">`). The `CalloutType` type is renamed to `CalloutVariant` and is now exported from the package root.

- **`Badge` gains an `external` prop**: a linked badge (`href`) can now open in a new tab with `rel="noopener noreferrer"`, matching `Card` and header/footer links.
