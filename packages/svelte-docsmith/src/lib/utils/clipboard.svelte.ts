export function useClipboard(timeout: number = 1500) {
	let text = $state('');
	let copied = $state(false);

	function readText(node: HTMLElement) {
		text = node.innerText.trim();
	}

	/** Copy `value`, or the text read from the node when none is given. */
	async function copy(value?: string) {
		const content = value ?? text;
		if (!content) return;
		// `navigator.clipboard` is undefined in insecure (non-HTTPS) contexts, and
		// writeText can reject when the page lacks clipboard permission. Fail quietly
		// so a copy button never throws an unhandled rejection.
		try {
			await navigator.clipboard.writeText(content);
			copied = true;
			setTimeout(() => {
				copied = false;
			}, timeout);
		} catch (error) {
			console.warn('[svelte-docsmith] copy to clipboard failed', error);
		}
	}

	return {
		readText,
		copy,
		get currentText() {
			return text;
		},
		get copied() {
			return copied;
		}
	};
}
