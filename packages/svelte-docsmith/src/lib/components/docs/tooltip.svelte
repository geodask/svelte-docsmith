<script lang="ts">
	// A word or phrase in prose with a short note. Built on the popover, not a
	// hover-only tooltip, so a tap opens it on a touch screen too. It opens on
	// hover and on keyboard focus, a click or tap keeps it open, and Escape or
	// a click elsewhere closes it.
	import { Popover } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import PopoverContent from '../shadcn/popover/popover-content.svelte';

	const {
		note,
		children
	}: {
		/** The note shown above the words. */
		note: string | Snippet;
		/** The words in the sentence that carry the note. */
		children: Snippet;
	} = $props();

	let open = $state(false);
	/** Opened by keyboard focus, so leaving the trigger closes it again. */
	let viaFocus = $state(false);
	const id = $props.id();

	function onfocus(e: FocusEvent) {
		// A mouse click focuses the button too; the popover's own click handling
		// covers that, so only keyboard focus opens it here.
		if (open || !(e.currentTarget as HTMLElement).matches(':focus-visible')) return;
		open = true;
		viaFocus = true;
	}

	function onblur() {
		if (viaFocus) open = false;
		viaFocus = false;
	}

	function onkeydown(e: KeyboardEvent) {
		// Enter on a note that focus opened keeps it open, rather than toggling
		// it shut under the reader's eyes.
		if (viaFocus && open && (e.key === 'Enter' || e.key === ' ')) {
			e.preventDefault();
			viaFocus = false;
		}
	}
</script>

<!-- No whitespace between the tags: inside a sentence, it would show as a
     space before the punctuation that follows the words. A hidden copy of
     the note describes the words to a screen reader, open or not, so the
     words say they carry a note; hidden, it's never copied with the text. -->
<Popover.Root bind:open onOpenChange={(value) => value || (viaFocus = false)}
	><Popover.Trigger
		openOnHover
		openDelay={150}
		closeDelay={150}
		class="docsmith-tooltip-trigger"
		aria-describedby="{id}-description"
		{onfocus}
		{onblur}
		{onkeydown}>{@render children()}</Popover.Trigger
	><PopoverContent
		id="{id}-note"
		side="top"
		class="w-auto max-w-xs gap-0 px-3 py-2 text-sm leading-snug"
		trapFocus={false}
		onOpenAutoFocus={(e) => e.preventDefault()}
		onCloseAutoFocus={(e) => e.preventDefault()}>{@render noteText()}</PopoverContent
	></Popover.Root
><span id="{id}-description" hidden>{@render noteText()}</span>

{#snippet noteText()}{#if typeof note === 'string'}{note}{:else}{@render note()}{/if}{/snippet}

<style>
	/* Reads as part of the sentence, with a dotted underline that says there is
	   more to it. */
	:global(.docsmith-tooltip-trigger) {
		display: inline;
		padding: 0;
		border: 0;
		background: none;
		font: inherit;
		color: inherit;
		text-align: inherit;
		text-decoration: underline dotted;
		text-decoration-color: var(--muted-foreground);
		text-underline-offset: 0.2em;
		cursor: help;
		border-radius: 2px;
	}
	:global(.docsmith-tooltip-trigger:hover),
	:global(.docsmith-tooltip-trigger[data-state='open']) {
		text-decoration-color: currentColor;
	}
	:global(.docsmith-tooltip-trigger:focus-visible) {
		outline: 2px solid var(--ring);
		outline-offset: 2px;
	}
</style>
