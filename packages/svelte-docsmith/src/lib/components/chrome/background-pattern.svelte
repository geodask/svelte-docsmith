<!-- Decorative page background: a faint grid fading out from the top, with two
soft primary/accent glows. Render it inside a `relative isolate` container. -->
<div
	class="pointer-events-none absolute inset-0 -z-10 h-full w-full overflow-hidden"
	aria-hidden="true"
>
	<div
		class="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-size-[24px_24px] mask-[radial-gradient(ellipse_80%_80%_at_50%_0%,#000_70%,transparent_100%)]"
	></div>

	<div
		class="bg-primary/20 pointer-events-none fixed top-0 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full opacity-40 mix-blend-screen blur-[120px] dark:opacity-20 dark:mix-blend-normal"
	></div>
	<div
		class="bg-accent/25 pointer-events-none fixed top-28 left-1/2 h-[400px] w-[600px] -translate-x-1/2 rounded-full opacity-30 mix-blend-screen blur-[100px] dark:opacity-20 dark:mix-blend-normal"
	></div>
</div>
