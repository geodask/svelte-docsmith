/**
 * The builder page's state: the core's pure functions behind runes, plus the
 * browser edges (the URL, the CLI session, applying a theme to the site).
 */
import { untrack } from 'svelte';
import { themes, defaultThemeSlug } from '#lib/themes-data.ts';
import { themeStore } from '#lib/theme-store.svelte.ts';
import {
	clearToken,
	contrastIssues,
	decodeThemeLink,
	encodePasteCode,
	encodeThemeLink,
	fromTokens,
	resolve,
	setInputs,
	setToken,
	toThemeFile,
	type BuilderState,
	type Inputs,
	type Mode,
	type ThemeTokens
} from './core.ts';

/** A terminal waiting for the theme: `svelte-docsmith theme`'s loopback port and nonce. */
export interface CliSession {
	port: number;
	nonce: string;
}

const CLI_KEY = 'docsmith-builder-cli';

/** Where the current theme started, for the preset row and the notice. */
export type Origin = { kind: 'preset'; slug: string } | { kind: 'paste' } | { kind: 'link' };

function presetState(slug: string): BuilderState {
	const preset =
		themes.find((t) => t.slug === slug) ?? themes.find((t) => t.slug === defaultThemeSlug)!;
	return fromTokens({ light: preset.light, dark: preset.dark });
}

export class Builder {
	state = $state<BuilderState>(presetState(defaultThemeSlug));
	origin = $state<Origin>({ kind: 'preset', slug: defaultThemeSlug });
	tokens = $derived<ThemeTokens>(resolve(this.state));
	file = $derived(toThemeFile(this.tokens));
	issues = $derived(contrastIssues(this.tokens));
	link = $state('');
	pasteCode = $state('');
	cli = $state<CliSession | null>(null);
	/** A one-line message for the panel, such as a theme link that didn't open. */
	notice = $state('');

	/** Call during component init: reads the URL in the browser and keeps the exports current. */
	start() {
		$effect(() => untrack(() => this.readUrl()));
		$effect(() => {
			const snapshot = $state.snapshot(this.state) as BuilderState;
			const file = this.file;
			let stale = false;
			encodeThemeLink(snapshot).then((code) => {
				if (!stale) this.link = `${location.origin}/themes#theme=${code}`;
			});
			encodePasteCode(file).then((code) => {
				if (!stale) this.pasteCode = code;
			});
			return () => (stale = true);
		});
	}

	private readUrl() {
		// Read once on start, never watched: plain URLSearchParams is right here.
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const params = new URLSearchParams(location.search);
		const port = Number(params.get('cli'));
		const nonce = params.get('state');
		try {
			if (port > 1023 && port < 65536 && nonce) {
				this.cli = { port, nonce };
				sessionStorage.setItem(CLI_KEY, JSON.stringify(this.cli));
			} else {
				const saved = sessionStorage.getItem(CLI_KEY);
				if (saved) this.cli = JSON.parse(saved);
			}
		} catch {
			/* sessionStorage unavailable: the session lasts as long as the URL */
		}

		const preset = params.get('preset');
		if (preset && themes.some((t) => t.slug === preset)) this.loadPreset(preset);

		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const payload = new URLSearchParams(location.hash.slice(1)).get('theme');
		if (payload) {
			decodeThemeLink(payload)
				.then((state) => {
					this.state = state;
					this.origin = { kind: 'link' };
					this.notice = 'Opened from a theme link.';
				})
				.catch((error: Error) => {
					this.notice = `${error.message} Starting from Darkmatter instead.`;
				});
		}
	}

	set(patch: Partial<Inputs>) {
		this.state = setInputs(this.state, patch);
	}

	setToken(mode: Mode, key: string, value: string) {
		this.state = value.trim()
			? setToken(this.state, mode, key, value)
			: clearToken(this.state, mode, key);
	}

	clearToken(mode: Mode, key: string) {
		this.state = clearToken(this.state, mode, key);
	}

	loadPreset(slug: string) {
		this.state = presetState(slug);
		this.origin = { kind: 'preset', slug };
		this.notice = '';
	}

	loadTokens(tokens: ThemeTokens) {
		this.state = fromTokens(tokens);
		this.origin = { kind: 'paste' };
		this.notice = '';
	}

	/** Paint this theme across the whole docs site, to browse other pages in it. */
	applyToSite() {
		themeStore.apply($state.snapshot(this.tokens) as ThemeTokens);
	}

	/**
	 * Hand the theme file to the waiting terminal: a top-level form POST to the
	 * command's loopback server, which answers with its own "saved" page. A
	 * navigation rather than a fetch, so no CORS or local-network permission
	 * prompt is involved.
	 */
	sendToCli() {
		if (!this.cli) return;
		const form = document.createElement('form');
		form.method = 'POST';
		form.action = `http://127.0.0.1:${this.cli.port}/theme`;
		for (const [name, value] of [
			['state', this.cli.nonce],
			['file', this.file],
			['back', `${location.origin}/themes`]
		]) {
			const input = document.createElement('input');
			input.type = 'hidden';
			input.name = name;
			input.value = value;
			form.append(input);
		}
		document.body.append(form);
		form.submit();
		form.remove();
		try {
			sessionStorage.removeItem(CLI_KEY);
		} catch {
			/* ignore */
		}
	}
}
