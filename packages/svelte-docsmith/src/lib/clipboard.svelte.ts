export function useClipboard(timeout: number = 1500) {
	let text = $state('');
	let copied = $state(false);

	function readText(node: HTMLElement) {
		text = node.innerText.trim();
	}

	function copy() {
		if (text) {
			navigator.clipboard.writeText(text).then(() => {
				copied = true;
				setTimeout(() => {
					copied = false;
				}, timeout);
			});
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
