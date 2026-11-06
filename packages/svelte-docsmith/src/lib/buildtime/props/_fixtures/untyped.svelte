<script>
	let { label, count = $bindable(0), 'aria-label': ariaLabel = 'x' } = $props();
</script>

<p aria-label={ariaLabel}>{label} {count}</p>
