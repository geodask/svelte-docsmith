<script lang="ts">
	// An install block (```sh pkg): one tab per package manager, synced with
	// every other `pkg` tab group on the site, each a regular code block. The
	// markdown pipeline renders the commands at build time (see
	// `buildtime/install-block.ts`) and passes them in already highlighted.
	import Tabs from '../docs/tabs.svelte';
	import TabItem from '../docs/tab-item.svelte';
	import Pre from './pre.svelte';

	const {
		tabs,
		language,
		title,
		lineNumbers = false,
		startLine = 1
	}: {
		/** Each manager's highlighted commands, in tab order. */
		tabs: { manager: string; html: string }[];
		language?: string;
		title?: string;
		lineNumbers?: boolean;
		startLine?: number;
	} = $props();
</script>

<Tabs syncKey="pkg">
	{#each tabs as tab (tab.manager)}
		<TabItem label={tab.manager}>
			<!-- Build-time Shiki output; kept on one line, as whitespace inside <pre> shows. -->
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			<Pre {language} {title} {lineNumbers} {startLine}>{@html tab.html}</Pre>
		</TabItem>
	{/each}
</Tabs>
