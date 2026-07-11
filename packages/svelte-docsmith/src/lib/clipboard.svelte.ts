export function useClipboard(timeout: number = 1500) {
	let text = $state('');
	let copied = $state(false);

	function readText(node: HTMLElement) {
		text = node.innerText.trim();
	}

	async function copy() {
		if (!text) return;
		// `navigator.clipboard` is undefined in insecure (non-HTTPS) contexts, and
		// writeText can reject when the page lacks clipboard permission. Fail quietly
		// so a copy button never throws an unhandled rejection.
		try {
			await navigator.clipboard.writeText(text);
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
