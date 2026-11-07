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
	/**
	 * The tokens edited by hand since the theme was loaded, each with the
	 * override it replaced (null: none), so an edit can be undone back to the
	 * preset's value rather than to a generated one.
	 */
	edits = $state<Record<Mode, Record<string, string | null>>>({ light: {}, dark: {} });

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
					this.load(state, { kind: 'link' });
					this.notice = 'Opened from a theme link.';
				})
				.catch((error: Error) => {
					this.notice = `${error.message} Starting from Darkmatter instead.`;
				});
		}
	}

	set(patch: Partial<Inputs>) {
		this.state = setInputs(this.state, patch);
		// An edit the control replaced is no longer an edit.
		for (const mode of ['light', 'dark'] as const) {
			for (const key of Object.keys(this.edits[mode])) {
				if (!(key in this.state.overrides[mode])) delete this.edits[mode][key];
			}
		}
	}

	/** Edit one token by hand. An empty value lets the controls drive it again. */
	setToken(mode: Mode, key: string, value: string) {
		const before = this.state.overrides[mode][key] ?? null;
		if (!(key in this.edits[mode])) this.edits[mode][key] = before;
		this.state = value.trim()
			? setToken(this.state, mode, key, value)
			: clearToken(this.state, mode, key);
		const after = this.state.overrides[mode][key] ?? null;
		if (after === this.edits[mode][key]) delete this.edits[mode][key];
	}

	/** Put a hand-edited token back to what it was before the edit. */
	undoToken(mode: Mode, key: string) {
		if (!(key in this.edits[mode])) return;
		const previous = this.edits[mode][key];
		this.state =
			previous === null
				? clearToken(this.state, mode, key)
				: setToken(this.state, mode, key, previous);
		delete this.edits[mode][key];
	}

	/** Start over from new tokens: no edits to undo. */
	private load(state: BuilderState, origin: Origin) {
		this.state = state;
		this.origin = origin;
		this.edits = { light: {}, dark: {} };
		this.notice = '';
	}

	loadPreset(slug: string) {
		this.load(presetState(slug), { kind: 'preset', slug });
	}

	loadTokens(tokens: ThemeTokens) {
		this.load(fromTokens(tokens), { kind: 'paste' });
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
