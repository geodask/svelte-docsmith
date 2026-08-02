<!-- Decorative page background: a faint grid fading out from the top, with two
soft primary/accent glows. Grid lines use --border so they track every theme
preset; render inside a `relative isolate` container. -->
<div
	class="pointer-events-none absolute inset-0 -z-10 h-full w-full overflow-hidden"
	aria-hidden="true"
>
	<div class="pattern-grid fixed inset-0"></div>

	<div
		class="bg-primary/20 pointer-events-none fixed top-0 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full opacity-40 mix-blend-screen blur-[120px] dark:opacity-20 dark:mix-blend-normal"
	></div>
	<div
		class="bg-accent/25 pointer-events-none fixed top-28 left-1/2 h-[400px] w-[600px] -translate-x-1/2 rounded-full opacity-30 mix-blend-screen blur-[100px] dark:opacity-20 dark:mix-blend-normal"
	></div>
</div>

<style>
	.pattern-grid {
		/* 24px cell; line colour follows the theme border token at low opacity. */
		background-image:
			linear-gradient(
				to right,
				color-mix(in oklch, var(--border) 70%, transparent) 1px,
				transparent 1px
			),
			linear-gradient(
				to bottom,
				color-mix(in oklch, var(--border) 70%, transparent) 1px,
				transparent 1px
			);
		background-size: 24px 24px;
		mask-image: radial-gradient(ellipse 80% 80% at 50% 0%, #000 70%, transparent 100%);
	}
</style>
