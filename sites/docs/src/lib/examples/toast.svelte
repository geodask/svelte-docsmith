<!--
@component
A short message that slides in and leaves on its own. The example behind the
props table page's since badges and fields.

@since 0.2
-->
<script lang="ts">
	interface ToastPosition {
		/** The edge it slides in from. */
		edge: 'top' | 'bottom';
		/**
		 * Distance from that edge, in pixels.
		 * @default 16
		 */
		offset?: number;
	}

	type ToastAction =
		| { kind: 'link'; label: string; href: string }
		| { kind: 'button'; label: string; onclick: () => void };

	const {
		message,
		duration = 4000,
		position = { edge: 'bottom' },
		action
	}: {
		/** What the toast says. */
		message: string;
		/**
		 * How long it stays, in milliseconds.
		 * @since 0.3
		 */
		duration?: number;
		/** Where it appears. */
		position?: ToastPosition;
		/**
		 * One thing the reader can do from the toast.
		 * @since 0.4
		 */
		action?: ToastAction;
	} = $props();
</script>

<div role="status" data-edge={position.edge} data-duration={duration}>
	{message}
	{#if action?.kind === 'link'}
		<a href={action.href}>{action.label}</a>
	{:else if action}
		<button onclick={action.onclick}>{action.label}</button>
	{/if}
</div>
