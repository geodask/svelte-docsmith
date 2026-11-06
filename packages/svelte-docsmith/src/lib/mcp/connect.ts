/**
 * How a reader connects their editor to the MCP server: its absolute URL and
 * the setup for each editor we document. One place, so the server's own
 * browser note, the copy-page menu and llms.txt all say the same thing.
 *
 * Pure string work, safe to import from components.
 */
import { join } from '#lib/utils/url.js';

/** One editor's setup: where it goes and what to paste. */
export type EditorSetup = {
	/** The editor's name, e.g. `Cursor`. */
	editor: string;
	/** The config file the snippet belongs in; absent for a shell command. */
	file?: string;
	/** What to paste: a shell command or the file's JSON. */
	code: string;
};

/**
 * The server's absolute URL from the configured `mcp` value: an absolute URL
 * is kept as given, a path is joined to the origin. Without an origin the path
 * stays site-relative, as other links do.
 */
export function mcpUrl(mcp: string, origin: string): string {
	return /^https?:\/\//i.test(mcp) ? mcp : join(origin, mcp);
}

/** The name editors list the server under: the site title as a slug. */
function serverName(title: string): string {
	return (
		title
			.toLowerCase()
			.replace(/[^a-z\d]+/g, '-')
			.replace(/^-|-$/g, '') || 'docs'
	);
}

/** Setup for Claude Code, Cursor and VS Code, for a server at `url`. */
export function editorSetups(title: string, url: string): EditorSetup[] {
	const name = serverName(title);
	return [
		{ editor: 'Claude Code', code: `claude mcp add --transport http ${name} ${url}` },
		{
			editor: 'Cursor',
			file: '~/.cursor/mcp.json',
			code: JSON.stringify({ mcpServers: { [name]: { url } } }, null, 2)
		},
		{
			editor: 'VS Code',
			file: '.vscode/mcp.json',
			code: JSON.stringify({ servers: { [name]: { type: 'http', url } } }, null, 2)
		}
	];
}
