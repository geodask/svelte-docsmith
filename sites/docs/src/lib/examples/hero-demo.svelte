<script lang="ts">
	let stars = $state(3);
</script>

<button class="star-button" onclick={() => stars++}>
	<span aria-hidden="true">★</span>
	Star
	<strong>{stars}</strong>
</button>

<style>
	.star-button {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.6rem 1.25rem;
		border-radius: 9999px;
		background: var(--primary);
		color: var(--primary-foreground);
		font-weight: 500;
		transition: transform 0.1s ease-out;
	}
	.star-button:active {
		transform: scale(0.96);
	}
</style>
