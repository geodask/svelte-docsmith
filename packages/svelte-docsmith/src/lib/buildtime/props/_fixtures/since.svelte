<!--
@component
A label that has been around a while.

@since 0.4
-->
<script lang="ts">
	const {
		label,
		compact = false
	}: {
		/** The text. */
		label: string;
		/**
		 * Tighter padding.
		 * @since 0.6
		 */
		compact?: boolean;
	} = $props();
</script>

<span class:compact>{label}</span>
