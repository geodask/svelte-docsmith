---
title: Math
description: Inline and display formulas, written as MathML at build time.
section: Components
order: 18
---

Turn math on and write formulas in TeX between dollar signs. They become MathML
when the site builds, so the browser draws them itself: no script, no font
files, and the theme's text colour.

The area of a circle is $A = \pi r^2$, and the roots of $ax^2 + bx + c = 0$ are

$$
x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
$$

## Turn it on

Math is off by default, because a dollar sign usually means money. Turn it on in
the `markdown` options:

```ts title="vite.config.ts"
docsmith({ site, markdown: { math: true } });
```

Formulas are written by [Temml](https://temml.org), an optional peer dependency:

```bash pkg
npm install -D temml
```

## Write formulas

Put an inline formula between single dollar signs, and a display formula
between double dollar signs on lines of their own:

```md
The area of a circle is $A = \pi r^2$, and the roots of $ax^2 + bx + c = 0$ are

$$
x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
$$
```

A display formula wider than the page scrolls on its own. A formula Temml
can't read shows its source as code, and the build warns which page it is on
rather than failing.

## Dollar signs in prose

Once math is on, a single `$` starts a formula only when no space follows it,
and ends one only when no space comes before it and no digit after it. So
`$5 or $10` stays text. A line with more dollars, like `from $5 to $10, or $x$`,
can still read as one long formula, so write `\$` for a dollar sign you mean
literally.

Dollar signs inside code, such as `$HOME`, are never formulas.

## Search and agents

Search leaves formulas out, as it leaves out code. Coding agents read the page
with the TeX as you wrote it.
