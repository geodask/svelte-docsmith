/**
 * PROTOTYPE — throwaway. Reactive wrapper over core.ts shared by the three
 * variants: holds the builder state, paints it on the site, reads a theme
 * link (#theme=…) and the CLI session (?cli=<port>&state=<nonce>).
 */
import { untrack } from 'svelte';
import { themeStore } from '#lib/theme-store.svelte.ts';
import {
	decodeState,
	emptyState,
	encodePasteCode,
	encodeState,
	resolve,
	setInputs,
	setToken,
	toThemeFile,
	type BuilderState,
	type Inputs,
	type ThemeTokens
} from './core.ts';

export interface CliSession {
	port: number;
	nonce: string;
}

const loadedFonts = new Set<string>(['Inter', 'JetBrains Mono', 'Source Serif 4']);
function ensureFont(name: string) {
	if (typeof document === 'undefined' || loadedFonts.has(name) || /^(system|ui)-/.test(name))
		return;
	loadedFonts.add(name);
	const link = document.createElement('link');
	link.rel = 'stylesheet';
	link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name)}:wght@400;500;600;700&display=swap`;
	document.head.append(link);
}

export class Builder {
	state = $state<BuilderState>(emptyState());
	tokens = $derived<ThemeTokens>(resolve(this.state));
	file = $derived(toThemeFile(this.tokens));
	link = $state('');
	pasteCode = $state('');
	cli = $state<CliSession | null>(null);

	/** Call during component init: reads the URL in the browser and paints the site. */
	start() {
		$effect(() => untrack(() => this.readUrl()));
		$effect(() => {
			themeStore.custom = this.tokens;
			ensureFont(this.state.inputs.fontSans);
			ensureFont(this.state.inputs.fontMono);
			return () => (themeStore.custom = null);
		});
		$effect(() => {
			const file = this.file;
			const snapshot = $state.snapshot(this.state) as BuilderState;
			encodeState(snapshot).then((code) => {
				this.link = `${location.origin}/themes${location.search}#theme=${code}`;
			});
			encodePasteCode(file).then((code) => (this.pasteCode = code));
		});
	}

	private readUrl() {
		const params = new URLSearchParams(location.search);
		const port = Number(params.get('cli'));
		const nonce = params.get('state');
		if (port > 1023 && port < 65536 && nonce) {
			this.cli = { port, nonce };
			sessionStorage.setItem('docsmith-builder-cli', JSON.stringify(this.cli));
		} else {
			const saved = sessionStorage.getItem('docsmith-builder-cli');
			if (saved) this.cli = JSON.parse(saved);
		}
		const hash = new URLSearchParams(location.hash.slice(1)).get('theme');
		if (hash)
			decodeState(hash)
				.then((s) => (this.state = s))
				.catch(() => {});
	}

	set(patch: Partial<Inputs>) {
		this.state = setInputs(this.state, patch);
	}

	setToken(which: 'light' | 'dark', key: string, value: string) {
		this.state = setToken(this.state, which, key, value);
	}

	load(state: BuilderState) {
		this.state = state;
	}

	/**
	 * Hand the theme file to the waiting terminal: a top-level form POST to the
	 * CLI's loopback server, which answers with its own "saved" page. A
	 * navigation, not a fetch, so no CORS or local-network prompt is involved.
	 */
	sendToCli() {
		if (!this.cli) return;
		const form = document.createElement('form');
		form.method = 'POST';
		form.action = `http://127.0.0.1:${this.cli.port}/theme`;
		for (const [name, value] of [
			['state', this.cli.nonce],
			['file', this.file],
			['back', location.href]
		]) {
			const input = document.createElement('input');
			input.type = 'hidden';
			input.name = name;
			input.value = value;
			form.append(input);
		}
		document.body.append(form);
		form.submit();
	}
}
