import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/svelte';
import CopyPageMenu from './copy-page-menu.svelte';

const page = { path: '/docs/intro', title: 'My Docs' };

async function openMenu() {
	await fireEvent.click(screen.getByRole('button', { name: 'More page actions' }));
	await screen.findByRole('menuitem', { name: 'Copy page' });
}

async function openConnect() {
	await openMenu();
	await fireEvent.click(screen.getByRole('menuitem', { name: 'Connect to your editor' }));
	return screen.findByRole('dialog', { name: 'Connect to your editor' });
}

describe('CopyPageMenu without an MCP server', () => {
	it('offers no "Connect to your editor" item', async () => {
		render(CopyPageMenu, { props: { ...page, origin: 'https://x.dev' } });
		await openMenu();
		expect(screen.queryByRole('menuitem', { name: /connect/i })).toBeNull();
	});
});

describe('CopyPageMenu with an MCP server', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('shows the absolute server URL and setup for Claude Code, Cursor and VS Code', async () => {
		render(CopyPageMenu, { props: { ...page, origin: 'https://x.dev/', mcp: '/mcp' } });
		const dialog = await openConnect();

		expect(within(dialog).getByText('https://x.dev/mcp')).toBeInTheDocument();
		expect(
			within(dialog).getByText('claude mcp add --transport http my-docs https://x.dev/mcp')
		).toBeInTheDocument();
		const code = [...dialog.querySelectorAll('pre')].map((pre) => pre.textContent);
		expect(code).toContainEqual(
			JSON.stringify({ mcpServers: { 'my-docs': { url: 'https://x.dev/mcp' } } }, null, 2)
		);
		expect(code).toContainEqual(
			JSON.stringify(
				{ servers: { 'my-docs': { type: 'http', url: 'https://x.dev/mcp' } } },
				null,
				2
			)
		);
		for (const editor of ['Claude Code', 'Cursor', 'VS Code']) {
			expect(within(dialog).getByText(editor)).toBeInTheDocument();
		}
	});

	it('falls back to the browser origin when no site url is configured', async () => {
		render(CopyPageMenu, { props: { ...page, mcp: '/mcp' } });
		const dialog = await openConnect();
		expect(within(dialog).getByText(`${location.origin}/mcp`)).toBeInTheDocument();
	});

	it('copies the server URL', async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
		render(CopyPageMenu, { props: { ...page, origin: 'https://x.dev', mcp: '/mcp' } });
		const dialog = await openConnect();

		await fireEvent.click(within(dialog).getByRole('button', { name: 'Copy server URL' }));
		expect(writeText).toHaveBeenCalledWith('https://x.dev/mcp');
	});
});
