# Development Guide

## Prerequisites

- Node.js >= 18
- npm >= 9
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey) (for integration testing)

## Quick Start

```bash
# Install dependencies
npm install

# Type-check
npm run lint

# Build
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## Authentication Setup (for manual testing)

The fastest way to authenticate for local development is with an API key:

```bash
# Option A: Environment variable (no setup needed)
GEMINI_API_KEY=your-key-here npm run dev

# Option B: Interactive setup (persists to ~/.nano-banana/)
npm run setup
# Select "(2) API Key" and paste your key
```

To test the OAuth flow locally, you need a Google Cloud project with OAuth credentials configured. Set them via environment variables:

```bash
NANO_BANANA_CLIENT_ID=your-client-id \
NANO_BANANA_CLIENT_SECRET=your-client-secret \
npm run setup
# Select "(1) Google OAuth" and complete the browser flow
```

## Running the MCP Server Locally

### With tsx (no build step)

```bash
# Starts the server on stdio -- useful for piping to MCP clients
npm run dev
```

### With compiled output

```bash
npm run build
node dist/index.js
```

### With MCP Inspector

The [MCP Inspector](https://github.com/modelcontextprotocol/inspector) lets you call tools interactively in a browser UI:

```bash
# Build first
npm run build

# Launch inspector pointing at the compiled server
npx @modelcontextprotocol/inspector node dist/index.js
```

This opens a browser where you can list tools, call them with parameters, and inspect responses.

### With Claude Code

Add to your Claude Code MCP config (`~/.claude.json` or project `.mcp.json`):

```json
{
  "mcpServers": {
    "nano-banana": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/nano-banana-mcp/src/index.ts"],
      "env": {
        "GEMINI_API_KEY": "your-key-here"
      }
    }
  }
}
```

For the compiled version:

```json
{
  "mcpServers": {
    "nano-banana": {
      "command": "node",
      "args": ["/absolute/path/to/nano-banana-mcp/dist/index.js"],
      "env": {
        "GEMINI_API_KEY": "your-key-here"
      }
    }
  }
}
```

### With Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "nano-banana": {
      "command": "node",
      "args": ["/absolute/path/to/nano-banana-mcp/dist/index.js"],
      "env": {
        "GEMINI_API_KEY": "your-key-here"
      }
    }
  }
}
```

## Testing

### Unit Tests

```bash
# Run all tests once
npm test

# Watch mode (re-runs on file changes)
npm run test:watch

# Run a specific test file
npx vitest run tests/models.test.ts

# Run tests matching a pattern
npx vitest run -t "generateImage"
```

### Coverage

```bash
npm run test:coverage
```

Coverage target is 80%+. Current coverage is ~94%. Coverage excludes `src/index.ts`, `src/cli.ts`, and `src/server.ts` (glue code).

### Writing Tests

Tests live in `tests/` mirroring the `src/` structure. Key patterns used:

- **Temp directories** for file I/O tests (cleaned up in `afterEach`)
- **`vi.mock()`** for external dependencies (`@google/genai`, `google-auth-library`)
- **Mock `GenAIAdapter`** for tool tests -- avoids real API calls
- **`vi.fn()` on `globalThis.fetch`** for REST client tests

Example mock adapter:

```typescript
const client: GenAIAdapter = {
  generateContent: async () => ({
    image: {
      data: Buffer.from('test').toString('base64'),
      mimeType: 'image/png',
    },
  }),
}
```

## Project Structure

```
src/
  index.ts              # Entry point (stdio transport + CLI routing)
  server.ts             # MCP server setup, tool registration via registerTool()
  models.ts             # Model definitions (IDs, defaults, lookup)
  config.ts             # Paths, env vars, user config persistence
  cli.ts                # Interactive setup wizard
  auth/
    types.ts            # Zod schemas for credentials, GenAIAdapter interface
    oauth-credentials.ts # Embedded OAuth client ID/secret (placeholders)
    token-store.ts      # Read/write/clear credentials file (0o600 permissions)
    api-key.ts          # API key validation and storage
    oauth.ts            # Full OAuth2 flow (browser, callback server, refresh)
    rest-client.ts      # REST adapter for OAuth mode (direct Gemini API)
    client.ts           # Factory: SDK client (API key) or REST client (OAuth)
    index.ts            # Barrel exports
  tools/
    schemas.ts          # Zod input/output schemas for all tools
    generate.ts         # generate_image implementation
    edit.ts             # edit_image implementation
    continue.ts         # continue_editing implementation
    configure.ts        # configure_auth, get_status, get_last_image, list_models
  images/
    encoding.ts         # Base64/MIME type utilities
    storage.ts          # Image save/read, path validation, image history

tests/                  # Mirrors src/ structure
```

## Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `GEMINI_API_KEY` | Gemini API key (skips stored credentials) | -- |
| `NANO_BANANA_CLIENT_ID` | Override OAuth client ID | embedded placeholder |
| `NANO_BANANA_CLIENT_SECRET` | Override OAuth client secret | embedded placeholder |
| `NANO_BANANA_OUTPUT_DIR` | Image output directory | `~/nano-banana-images/` |
| `NANO_BANANA_CONFIG_DIR` | Config/credentials directory | `~/.nano-banana/` |

## Common Development Tasks

### Adding a new tool

1. Add input/output Zod schemas to `src/tools/schemas.ts`
2. Create the tool implementation in `src/tools/your-tool.ts`
3. Register it in `src/server.ts` using `server.registerTool()` with:
   - `title`, `description`, `inputSchema`, `outputSchema`, `annotations`
   - Return both `content` (text) and `structuredContent` (object)
4. Write tests in `tests/tools/your-tool.test.ts`
5. Run `npm run lint && npm test`

### Adding a new model

Add the model ID to `ModelIdSchema` in `src/models.ts` and add a corresponding entry to the `MODELS` array.

### Debugging auth issues

```bash
# Check what credentials are stored
cat ~/.nano-banana/credentials.json

# Check config
cat ~/.nano-banana/config.json

# Test with a fresh config dir
NANO_BANANA_CONFIG_DIR=/tmp/nb-test npm run setup
```

### Resetting local state

```bash
# Remove stored credentials and config
rm -rf ~/.nano-banana/

# Remove generated images
rm -rf ~/nano-banana-images/
```
