<script lang="ts">
	import '../app.css';
	import type { Snippet } from 'svelte';
	import { ModeWatcher } from 'mode-watcher';
	import { Sidebar } from 'svelte-docsmith/internal';
	import { Header } from '$widgets/header';
	import { MenuSidebar } from '$widgets/menu-sidebar';

	const { children }: { children: Snippet } = $props();
</script>

<ModeWatcher />

<Sidebar.Provider>
	<MenuSidebar />
	<Sidebar.Inset>
		<Header />
		<main class="flex-1 px-8 py-6">
			{@render children()}
		</main>
	</Sidebar.Inset>
</Sidebar.Provider>
