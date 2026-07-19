/**
 * Twoslash support for code fences that opt in with ```ts twoslash.
 *
 * Twoslash runs the snippet through the TypeScript compiler and annotates it
 * with the real inferred types, which is what makes a hover show `string`
 * rather than a guess. The cost is that it **throws** on anything that does not
 * typecheck: a missing import, a type error, an incomplete fragment.
 *
 * That strictness is the point, but it must not be able to take a whole site
 * down. {@link highlightWithTwoslash} therefore falls back to an ordinary
 * highlight and warns, naming the file, rather than failing the build over one
 * bad snippet.
 *
 * The packages are optional peer dependencies, loaded only when a fence asks
 * for them, so sites that never use Twoslash pay nothing for it.
 */
import type { ShikiTransformer } from 'shiki';

type Loaded = { transformer: ShikiTransformer } | { error: string };

let cached: Promise<Loaded> | undefined;

/**
 * Build the Twoslash transformer once per process. `langs` must include
 * `svelte`, or Svelte fences are silently passed through unannotated: the
 * transformer's default allowlist is TypeScript only.
 */
async function loadTransformer(): Promise<Loaded> {
	try {
		const [{ transformerTwoslash }, { createTwoslasher }] = await Promise.all([
			import('@shikijs/twoslash'),
			import('twoslash-svelte')
		]);
		return {
			transformer: transformerTwoslash({
				// The fence's meta is parsed by docsmith, which decides per block
				// whether to include this transformer at all.
				explicitTrigger: false,
				langs: ['ts', 'tsx', 'js', 'svelte'],
				twoslasher: createTwoslasher()
			}) as ShikiTransformer
		};
	} catch {
		return {
			error:
				"'twoslash' requires its optional peer dependencies. " +
				'Install them with: npm i -D @shikijs/twoslash twoslash-svelte typescript'
		};
	}
}

export function twoslashTransformer(): Promise<Loaded> {
	cached ??= loadTransformer();
	return cached;
}

/** One-line reason a snippet could not be annotated, for the build warning. */
export function twoslashFailure(error: unknown): string {
	const message = error instanceof Error ? error.message : String(error);
	// Twoslash errors are multi-line with a code frame; the first line carries
	// the actual diagnostic.
	return message.split('\n').find((line) => line.trim()) ?? 'unknown error';
}
