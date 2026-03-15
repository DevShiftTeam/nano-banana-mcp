# Nano Banana MCP

MCP server for AI image generation and editing using Google Gemini image models.

## Models

| Product | Model ID | Default |
|---------|----------|---------|
| Nano Banana 2 | `gemini-3.1-flash-image-preview` | Yes |
| Nano Banana 2 | `gemini-2.5-flash-image` | No |
| Nano Banana Pro | `gemini-3-pro-image-preview` | No |

## Setup

```bash
npx nano-banana-mcp setup
```

This interactive wizard lets you choose:
1. **Google OAuth** (default) -- opens browser for one-click authorization
2. **API Key** -- paste your key from [Google AI Studio](https://aistudio.google.com/apikey)

## MCP Client Configuration

### Claude Code

```json
{
  "mcpServers": {
    "nano-banana": {
      "command": "npx",
      "args": ["nano-banana-mcp"]
    }
  }
}
```

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "nano-banana": {
      "command": "npx",
      "args": ["nano-banana-mcp"]
    }
  }
}
```

## Tools

### `generate_image`

Create an image from a text prompt.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `prompt` | string | Yes | Text description of the image to generate |
| `model` | string | No | Model ID (defaults to `gemini-3.1-flash-image-preview`) |
| `aspectRatio` | string | No | One of `1:1`, `16:9`, `9:16`, `4:3`, `3:4` (default: `1:1`) |

### `edit_image`

Edit an existing image using a text prompt.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `prompt` | string | Yes | Instructions for how to edit the image |
| `imagePath` | string | Yes | Path to the source image |
| `referenceImages` | string[] | No | Paths to reference images for style/context |
| `model` | string | No | Model ID |

### `continue_editing`

Refine the last generated or edited image.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `prompt` | string | Yes | Refinement instructions |
| `model` | string | No | Model ID |

### `configure_auth`

Set a Gemini API key at runtime.

### `get_status`

Check auth state, current model, and output directory.

### `get_last_image`

Get metadata about the most recently generated/edited image.

### `list_models`

List available models with current default.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NANO_BANANA_CLIENT_ID` | Override embedded OAuth client ID |
| `NANO_BANANA_CLIENT_SECRET` | Override embedded OAuth client secret |
| `GEMINI_API_KEY` | Gemini API key (skips stored credentials) |
| `NANO_BANANA_OUTPUT_DIR` | Custom image output directory |
| `NANO_BANANA_CONFIG_DIR` | Custom config directory |

## Development

```bash
npm install
npm run build
npm test
npm run test:coverage
```

## License

MIT
