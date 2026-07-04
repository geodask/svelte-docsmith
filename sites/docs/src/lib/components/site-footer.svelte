<script lang="ts">
	const currentYear = new Date().getFullYear();
</script>

<footer class="w-full">
	<div
		class="mx-auto flex max-w-7xl flex-col items-center justify-center gap-6 px-4 py-6 md:flex-row md:gap-12"
	>
		<div class="flex flex-col gap-1 text-center md:gap-2 md:text-left">
			<div class="text-muted-foreground flex items-center justify-center gap-2 text-sm">
				<p>&copy; {currentYear} George Daskalakis. All rights reserved.</p>
			</div>

			<div class="text-muted-foreground/80 flex flex-col gap-1 text-xs md:flex-row md:gap-4">
				<p>
					Components based on <a
						href="https://shadcn-svelte.com"
						class="hover:text-foreground underline underline-offset-2 transition-colors"
						target="_blank"
						rel="noopener noreferrer">shadcn-svelte</a
					>. Theme based on
					<a
						href="https://tweakcn.com/"
						class="hover:text-foreground underline underline-offset-2 transition-colors"
						target="_blank"
						rel="noopener noreferrer"
					>
						Tangerine by tweakcn
					</a>.
				</p>
			</div>
		</div>
	</div>
</footer>
