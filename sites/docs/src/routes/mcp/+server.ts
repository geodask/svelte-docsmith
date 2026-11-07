import { mcpServer } from 'svelte-docsmith/server';

// The MCP server answers each request at runtime, so it can't be prerendered.
export const prerender = false;

// GET answers a browser with a note on adding the server to an editor, and
// OPTIONS the CORS preflight.
export const { GET, POST, OPTIONS } = mcpServer();
