import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { AppConfig } from './config.js'
import { createGenAIClient } from './auth/client.js'
import type { GenAIAdapter } from './auth/types.js'
import {
  GenerateImageSchema,
  GenerateImageOutputSchema,
  EditImageSchema,
  EditImageOutputSchema,
  ContinueEditingSchema,
  ContinueEditingOutputSchema,
  ConfigureAuthSchema,
  ConfigureAuthOutputSchema,
  StatusOutputSchema,
  ListModelsOutputSchema,
} from './tools/schemas.js'
import { generateImage } from './tools/generate.js'
import { editImage } from './tools/edit.js'
import { continueEditing } from './tools/continue.js'
import {
  configureAuth,
  getStatus,
  getLastImageInfo,
  getAvailableModels,
} from './tools/configure.js'

let cachedClient: GenAIAdapter | null = null

async function getClient(config: AppConfig): Promise<GenAIAdapter> {
  if (!cachedClient) {
    cachedClient = await createGenAIClient(config)
  }
  return cachedClient
}

function resetClient(): void {
  cachedClient = null
}

function formatActionableError(error: unknown, context: string): string {
  const message = error instanceof Error ? error.message : 'Unknown error'

  if (message.includes('No credentials found')) {
    return `Authentication required: ${message}. Run \`npx nano-banana-mcp setup\` to configure authentication, or use the configure_auth tool to set an API key.`
  }
  if (message.includes('Unknown model')) {
    return `Invalid model: ${message}. Use list_models to see available options.`
  }
  if (message.includes('Image file not found')) {
    return `File error: ${message}. Verify the file path exists and is an absolute path. Supported formats: PNG, JPG, JPEG, GIF, WebP, BMP.`
  }
  if (message.includes('No previous image')) {
    return `No image to continue editing. Use generate_image or edit_image first, then call continue_editing to refine the result.`
  }
  if (message.includes('no image') || message.includes('No image')) {
    return `${context} failed: ${message}. Try rephrasing the prompt or using a different model (use list_models to see options).`
  }
  if (message.includes('API error')) {
    return `${message}. Check your authentication with get_status. If using OAuth, tokens may need refreshing -- run \`npx nano-banana-mcp setup\` again.`
  }

  return `${context} failed: ${message}`
}

export function createServer(config: AppConfig): McpServer {
  const server = new McpServer({
    name: 'nano-banana-mcp',
    version: '1.0.0',
  })

  server.registerTool(
    'generate_image',
    {
      title: 'Generate Image',
      description:
        'Create a new image from a text prompt using Google Gemini image models. Returns the file path of the saved image.',
      inputSchema: GenerateImageSchema.shape,
      outputSchema: GenerateImageOutputSchema.shape,
      annotations: {
        title: 'Generate Image',
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const client = await getClient(config)
        const result = await generateImage(params, client, config)
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
          structuredContent: result,
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: formatActionableError(error, 'Image generation'),
            },
          ],
          isError: true,
        }
      }
    }
  )

  server.registerTool(
    'edit_image',
    {
      title: 'Edit Image',
      description:
        'Edit an existing image using a text prompt. Optionally provide reference images for style guidance. Returns the file path of the saved result.',
      inputSchema: EditImageSchema.shape,
      outputSchema: EditImageOutputSchema.shape,
      annotations: {
        title: 'Edit Image',
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const client = await getClient(config)
        const result = await editImage(params, client, config)
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
          structuredContent: result,
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: formatActionableError(error, 'Image editing'),
            },
          ],
          isError: true,
        }
      }
    }
  )

  server.registerTool(
    'continue_editing',
    {
      title: 'Continue Editing',
      description:
        'Refine the last generated or edited image with a new prompt. Must call generate_image or edit_image first. Returns the file path of the saved result.',
      inputSchema: ContinueEditingSchema.shape,
      outputSchema: ContinueEditingOutputSchema.shape,
      annotations: {
        title: 'Continue Editing',
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const client = await getClient(config)
        const result = await continueEditing(params, client, config)
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
          structuredContent: result,
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: formatActionableError(error, 'Continue editing'),
            },
          ],
          isError: true,
        }
      }
    }
  )

  server.registerTool(
    'configure_auth',
    {
      title: 'Configure Authentication',
      description:
        'Set a Gemini API key for authentication. Get your key from Google AI Studio (https://aistudio.google.com/apikey).',
      inputSchema: ConfigureAuthSchema.shape,
      outputSchema: ConfigureAuthOutputSchema.shape,
      annotations: {
        title: 'Configure Authentication',
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params) => {
      try {
        resetClient()
        const result = await configureAuth(params, config)
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
          structuredContent: result,
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: formatActionableError(error, 'Auth configuration'),
            },
          ],
          isError: true,
        }
      }
    }
  )

  server.registerTool(
    'get_status',
    {
      title: 'Get Status',
      description:
        'Check current authentication state, active model, and image output directory. Use this to verify setup before generating images.',
      outputSchema: StatusOutputSchema.shape,
      annotations: {
        title: 'Get Status',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      try {
        const result = await getStatus(config)
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
          structuredContent: result,
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: formatActionableError(error, 'Status check'),
            },
          ],
          isError: true,
        }
      }
    }
  )

  server.registerTool(
    'get_last_image',
    {
      title: 'Get Last Image',
      description:
        'Get metadata about the most recently generated or edited image, including file path, MIME type, timestamp, and size.',
      annotations: {
        title: 'Get Last Image',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      const result = getLastImageInfo()
      if (!result) {
        return {
          content: [
            {
              type: 'text' as const,
              text: 'No images have been generated yet in this session. Use generate_image or edit_image first.',
            },
          ],
        }
      }
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
        structuredContent: result,
      }
    }
  )

  server.registerTool(
    'list_models',
    {
      title: 'List Models',
      description:
        'List all available Gemini image models with their product name, ID, and whether they are the default. Use model IDs when calling generate_image, edit_image, or continue_editing.',
      outputSchema: ListModelsOutputSchema.shape,
      annotations: {
        title: 'List Models',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      const models = getAvailableModels()
      const result = { models }
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
        structuredContent: result,
      }
    }
  )

  return server
}
