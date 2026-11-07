/**
 * The props reader: props extraction as a Vite plugin hook asks for it. The
 * plugin says "props for this file, in this hook"; the reader owns the rest:
 *
 *  - **Sharing.** One extractor per project root and tsconfig, created on
 *    first use and shared by every reader in the process. SvelteKit builds the
 *    client and the server in one process and both import every props module,
 *    so this means one TypeScript program and one result cache for both.
 *    TypeScript itself loads only when a component with a typed `$props()` is
 *    first extracted, so a site without props imports never pays for it.
 *  - **Watching.** Every file the props were read from is added to the hook's
 *    watch list, so editing a component or a type it imports re-runs the hook.
 *  - **Warning once.** An extraction's warnings go to the hook that receives
 *    it fresh, so each one is reported once per extraction (again after an
 *    edit), not once per build or once per hook that asks.
 */
import { createPropsExtractor, type ExtractResult, type PropsExtractor } from './extract.js';

/** What the reader needs from a plugin hook: Rollup's plugin context has both. */
export interface PropsHook {
	addWatchFile(file: string): void;
	warn(message: string): void;
}

export interface PropsReaderOptions {
	/** tsconfig used to read prop types. Default: the root's `tsconfig.json`. */
	tsconfig?: string;
}

export interface PropsReader {
	/**
	 * Point extraction at the Vite root, where `tsconfig.json` is looked up.
	 * Until called, the root is the working directory.
	 */
	configure(root: string): void;
	/** One component's props, read from inside `hook`. */
	read(file: string, hook: PropsHook): Promise<ExtractResult>;
}

const extractors = new Map<string, PropsExtractor>();

export function createPropsReader(options: PropsReaderOptions = {}): PropsReader {
	let root = process.cwd();
	const extractor = () => {
		const key = `${root}\0${options.tsconfig ?? ''}`;
		let shared = extractors.get(key);
		if (!shared) {
			shared = createPropsExtractor({ root, tsconfig: options.tsconfig });
			extractors.set(key, shared);
		}
		return shared;
	};
	return {
		configure(next) {
			root = next;
		},
		async read(file, hook) {
			const { fresh, ...result } = await extractor().extract(file);
			for (const watched of result.watchFiles) hook.addWatchFile(watched);
			if (fresh) for (const warning of result.warnings) hook.warn(warning);
			return result;
		}
	};
}
