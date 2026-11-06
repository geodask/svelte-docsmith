# The MCP server speaks the protocol itself, without the official SDK

The MCP server only needs the stateless slice of the Model Context Protocol over Streamable HTTP: `initialize`, `ping`, `tools/list` and `tools/call`, answered with plain JSON responses, with no sessions, no server-to-client requests and no SSE streams. We implement that slice ourselves, as a small JSON-RPC layer inside svelte-docsmith, instead of depending on `@modelcontextprotocol/sdk`.

## Considered Options

- **Official SDK as a dependency or optional peer**: the reference implementation, and it would track protocol changes for us. Rejected because version 1.32 pulls in express, hono, cors, jose, ajv and zod for features we never use, which is a heavy tree for a documentation framework whose sites mostly don't need any of it.

## Consequences

- We own protocol conformance. The layer is covered by tests written against the spec and checked against MCP Inspector, and the MCP server stays experimental while the protocol keeps moving.
- If we later need sessions, streaming or server-initiated requests, this decision should be revisited rather than the layer grown into a second SDK.

## Update: 2026-07-28

The layer now also speaks MCP 2026-07-28, alongside the handshake revisions 2025-11-25, 2025-06-18 and 2025-03-26. A request whose `params._meta` names a protocol version is answered by 2026-07-28's rules (`server/discover`, mirrored-header validation, `resultType`, caching hints); any other request goes through `initialize` as before. 2026-07-28 is itself stateless (no handshake, no sessions), so supporting it fits the slice above and the decision stands.
